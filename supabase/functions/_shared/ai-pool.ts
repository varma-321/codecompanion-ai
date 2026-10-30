// Shared AI key pool for all edge functions.
//
// Architecture: PRIMARY KEY ONLY — no env-var fallbacks.
// The admin marks one key as primary in the Admin Dashboard (stored in
// public.ai_feature_config with feature_key = 'primary', key_ids[0]).
// Every AI call uses that key. If the primary key is rate-limited or invalid,
// the request fails with a clear error message until the admin switches the primary.
// If no primary is configured yet, the first enabled key is used so features keep working.
//
// Keys are service_role-only (RLS enabled, no public policies).
// The raw api_key is never returned to the client — only masked strings.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

export interface PoolKey {
  id: string;
  label: string;
  provider: string;
  base_url: string;
  api_key: string;
  model: string;
}

export interface AIResult {
  content: string;
  provider: string;
  keyId: string;
  keyLabel: string;
  model: string;
}

export interface ChatOptions {
  messages: any[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
  responseFormat?: 'json' | 'text';
  stream?: boolean;
  tools?: any[];
  toolChoice?: any;
}

export interface StreamResult {
  body: ReadableStream<Uint8Array>;
  provider: string;
  keyId: string;
  keyLabel: string;
  model: string;
}

// ── Cache (30 s per isolate) ──────────────────────────────────────────────────
let primaryCache: { key: PoolKey | null; at: number } | null = null;
const CACHE_MS = 30_000;

function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
}

async function loadPrimary(force = false): Promise<PoolKey | null> {
  if (!force && primaryCache && Date.now() - primaryCache.at < CACHE_MS) {
    return primaryCache.key;
  }
  const supabase = adminClient();

  // The admin marks one key as primary via ai_feature_config (feature_key = 'primary').
  const { data: cfg } = await supabase
    .from('ai_feature_config')
    .select('key_ids')
    .eq('feature_key', 'primary')
    .maybeSingle();

  const primaryKeyId =
    Array.isArray(cfg?.key_ids) && cfg.key_ids.length > 0 ? String(cfg.key_ids[0]) : null;

  // Load the configured primary; if it's missing or disabled, fall back to the first enabled key.
  let data: any = null;
  if (primaryKeyId) {
    const res = await supabase.from('ai_api_keys').select('*').eq('id', primaryKeyId).maybeSingle();
    if (res.data?.enabled) data = res.data;
  }
  if (!data) {
    const res = await supabase
      .from('ai_api_keys')
      .select('*')
      .eq('enabled', true)
      .order('created_at', { ascending: true })
      .limit(1);
    data = res.data?.[0] ?? null;
  }

  const key: PoolKey | null = data
    ? {
        id: data.id,
        label: data.label,
        provider: data.provider,
        base_url: data.base_url,
        api_key: data.api_key,
        model: data.model ?? '',
      }
    : null;

  primaryCache = { key, at: Date.now() };
  return key;
}

export function invalidatePoolCache() {
  primaryCache = null;
}

async function track(keyId: string, patch: Record<string, unknown>) {
  try {
    const supabase = adminClient();
    await supabase.rpc('ai_pool_track_key_usage', { p_key_id: keyId, p_patch: patch });
  } catch {
    // usage tracking must never break a request
  }
}

function resolveModel(key: PoolKey, override?: string): string {
  if (override) return override;
  if (key.model) return key.model;
  throw new Error(
    `No model configured for primary key "${key.label}". Set a default model in the Admin Dashboard → AI API Keys.`,
  );
}

async function callKey(key: PoolKey, model: string, opts: ChatOptions): Promise<Response> {
  const baseUrl = key.base_url.replace(/\/$/, '');
  return await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key.api_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 4096,
      ...(opts.stream ? { stream: true } : {}),
      ...(opts.responseFormat === 'json' ? { response_format: { type: 'json_object' } } : {}),
      ...(opts.tools ? { tools: opts.tools, tool_choice: opts.toolChoice ?? 'auto' } : {}),
    }),
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Make a non-streaming AI chat call using the admin-configured primary key.
 * Throws a descriptive error if no primary is set or the key fails.
 */
export async function chatWithPrimaryAI(opts: ChatOptions): Promise<AIResult> {
  const key = await loadPrimary();
  if (!key) {
    throw new Error(
      'No AI key configured. An admin must add an API key in the Admin Dashboard → AI API Keys.',
    );
  }

  const model = resolveModel(key, opts.model);

  let res: Response;
  try {
    res = await callKey(key, model, opts);
  } catch (e: any) {
    track(key.id, { p_ok: false, p_error: String(e?.message ?? e) });
    throw new Error(`AI request failed: ${String(e?.message ?? e)}`);
  }

  if (res.status === 429) {
    const text = await res.text().catch(() => '');
    track(key.id, { p_ok: false, p_status: 'rate_limited', p_error: `Rate limited: ${text.slice(0, 200)}` });
    throw new Error(
      `The primary AI key "${key.label}" has hit its rate limit. An admin must set a different key as primary.`,
    );
  }
  if (res.status === 401 || res.status === 403) {
    const text = await res.text().catch(() => '');
    track(key.id, { p_ok: false, p_status: 'invalid', p_error: `Auth failed: ${text.slice(0, 200)}` });
    throw new Error(
      `The primary AI key "${key.label}" is invalid or expired. An admin must update or replace it.`,
    );
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    track(key.id, { p_ok: false, p_error: `HTTP ${res.status}: ${text.slice(0, 200)}` });
    throw new Error(`AI request failed (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? '';
  if (!content) {
    track(key.id, { p_ok: false, p_error: 'Empty response from provider' });
    throw new Error('AI returned an empty response. Please try again.');
  }

  track(key.id, { p_ok: true });
  return { content, provider: key.provider, keyId: key.id, keyLabel: key.label, model };
}

/**
 * Streaming variant — returns the raw SSE ReadableStream from the primary key.
 * Throws the same descriptive errors as chatWithPrimaryAI.
 */
export async function streamWithPrimaryAI(opts: ChatOptions): Promise<StreamResult> {
  const key = await loadPrimary();
  if (!key) {
    throw new Error(
      'No AI key configured. An admin must add an API key in the Admin Dashboard → AI API Keys.',
    );
  }

  const model = resolveModel(key, opts.model);

  let res: Response;
  try {
    res = await callKey(key, model, { ...opts, stream: true });
  } catch (e: any) {
    track(key.id, { p_ok: false, p_error: String(e?.message ?? e) });
    throw new Error(`AI stream request failed: ${String(e?.message ?? e)}`);
  }

  if (res.status === 429) {
    const text = await res.text().catch(() => '');
    track(key.id, { p_ok: false, p_status: 'rate_limited', p_error: `Rate limited: ${text.slice(0, 200)}` });
    throw new Error(
      `The primary AI key "${key.label}" has hit its rate limit. An admin must set a different key as primary.`,
    );
  }
  if (res.status === 401 || res.status === 403) {
    const text = await res.text().catch(() => '');
    track(key.id, { p_ok: false, p_status: 'invalid', p_error: `Auth failed: ${text.slice(0, 200)}` });
    throw new Error(
      `The primary AI key "${key.label}" is invalid or expired. An admin must update or replace it.`,
    );
  }
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    track(key.id, { p_ok: false, p_error: `HTTP ${res.status}: ${text.slice(0, 200)}` });
    throw new Error(`AI stream failed (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }

  track(key.id, { p_ok: true });
  return { body: res.body, provider: key.provider, keyId: key.id, keyLabel: key.label, model };
}

/**
 * Legacy compatibility shim — wraps chatWithPrimaryAI with the old featureKey signature.
 * All existing edge functions that call chatWithFeatureAI() continue to work unchanged.
 * The featureKey argument is ignored since we now use a single primary key for all features.
 */
export async function chatWithFeatureAI(_featureKey: string, opts: ChatOptions): Promise<AIResult> {
  return chatWithPrimaryAI(opts);
}

/**
 * Legacy compatibility shim — wraps streamWithPrimaryAI with the old featureKey signature.
 */
export async function streamWithFeatureAI(_featureKey: string, opts: ChatOptions): Promise<StreamResult> {
  return streamWithPrimaryAI(opts);
}

// List models a provider exposes (used by the admin dashboard).
export async function listProviderModels(baseUrl: string, apiKey: string): Promise<string[]> {
  const url = `${baseUrl.replace(/\/$/, '')}/models`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!res.ok) throw new Error(`Models request failed: HTTP ${res.status}`);
  const data = await res.json();
  const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  return list
    .map((m: any) => m?.id)
    .filter((id: unknown): id is string => typeof id === 'string')
    .sort();
}
