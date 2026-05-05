import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

function getKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const k = Deno.env.get(`GROQ_API_KEY_${i}`);
    if (k) keys.push(k);
  }
  return keys;
}

let rotationCursor = 0;

async function callGroq(messages: any[], temperature = 0.2): Promise<{ content: string; keyIndex: number }> {
  const keys = getKeys();
  if (keys.length === 0) throw new Error('No GROQ_API_KEY_* secrets configured in Supabase');

  let lastErr = '';
  const startOffset = rotationCursor++ % keys.length;
  for (let attempt = 0; attempt < keys.length; attempt++) {
    const idx = (startOffset + attempt) % keys.length;
    const key = keys[idx];
    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          temperature,
          max_tokens: 4096,
        }),
      });
      if (res.status === 429 || res.status === 401 || res.status === 403) {
        lastErr = `Key #${idx + 1} -> HTTP ${res.status}`;
        continue;
      }
      if (!res.ok) {
        const text = await res.text();
        lastErr = `HTTP ${res.status}: ${text.slice(0, 200)}`;
        continue;
      }
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content ?? '';
      return { content, keyIndex: idx + 1 };
    } catch (e) {
      lastErr = (e as Error).message;
    }
  }
  throw new Error(`All Groq keys failed: ${lastErr}`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  
  try {
    const { message, history, systemPrompt, code, problemId } = await req.json();
    
    const messages = [];
    
    // 1. System Prompt
    messages.push({
      role: 'system',
      content: systemPrompt || "You are an elite Java DSA Architect and Mentor. Provide clean, professional, and efficient Java-centric solutions. Always prioritize modern Java (JDK 17+) idioms."
    });
    
    // 2. Code Context (if provided)
    if (code) {
      messages.push({
        role: 'system',
        content: `CURRENT USER CODE:\n\`\`\`java\n${code}\n\`\`\`\nProblem ID: ${problemId || 'unknown'}`
      });
    }
    
    // 3. History (if provided)
    if (history && Array.isArray(history)) {
      messages.push(...history.slice(-10)); // Last 10 messages for context
    }
    
    // 4. Current User Message
    messages.push({
      role: 'user',
      content: message
    });

    const { content, keyIndex } = await callGroq(messages);
    
    return new Response(JSON.stringify({ response: content, keyUsed: keyIndex }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
