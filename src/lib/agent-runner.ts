// Browser-side autonomous agent orchestrator.
// Per question: ensure test cases (cache or generate) -> generate Java code -> run via test-runner ->
// on failure: classify error -> if SYSTEM error trigger patch-proposal flow, else fix code with AI -> retry up to MAX_RETRIES.
// Concurrency-controlled across many questions. Persists every run + per-key Groq stats.

import { supabase } from '@/integrations/supabase/client';
import { runAllTests, type TestCaseInput } from './test-runner';
import type { TestResult } from '@/components/TestCasePanel';

export const MAX_RETRIES = 5;
export const MAX_SYSTEM_PATCH_ATTEMPTS = 2;

export interface AgentQuestion {
  problem_key: string;
  title: string;
  difficulty?: string;
  topic?: string;
  starterCode?: string;
}

export type AgentPhase =
  | 'queued'
  | 'fetching-tests'
  | 'generating-code'
  | 'running'
  | 'fixing'
  | 'system-patching'
  | 'passed'
  | 'failed';

export type ErrorType =
  | 'CODE_COMPILE'
  | 'RUNTIME'
  | 'LOGIC'
  | 'TIMEOUT'
  | 'SYSTEM'
  | 'NONE';

export interface AgentLogEntry {
  ts: number;
  level: 'info' | 'warn' | 'error' | 'success' | 'system';
  message: string;
}

export interface AgentResult {
  problem_key: string;
  title: string;
  phase: AgentPhase;
  attempt: number;
  maxRetries: number;
  passedCount: number;
  totalCount: number;
  finalCode: string;
  logs: AgentLogEntry[];
  errorType?: ErrorType;
  error?: string;
  startedAt?: number;
  finishedAt?: number;
  keyUsage: Record<string, number>; // groq key index -> calls
  systemPatchProposalIds: string[];
}

type Updater = (state: AgentResult) => void;

function newLog(level: AgentLogEntry['level'], message: string): AgentLogEntry {
  return { ts: Date.now(), level, message };
}

// ── Error classification ─────────────────────────────────────────────────────

const SYSTEM_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /Failed to fetch|NetworkError|ECONNREFUSED|ENOTFOUND/i, reason: 'Network failure to compiler/API' },
  { re: /HTTP 5\d\d/i, reason: 'Compiler API 5xx response' },
  { re: /Invalid response format|Unexpected token|JSON\.parse|is not valid JSON/i, reason: 'Invalid response format from compiler/API' },
  { re: /test runner crashed|Cannot read propert|undefined is not|TypeError:/i, reason: 'Test runner crash' },
  { re: /Edge Function returned a non-2xx|FunctionsHttpError|FunctionsRelayError/i, reason: 'Edge function failure' },
];

const COMPILE_PATTERNS = [
  /error:\s*';' expected/i,
  /error:\s*cannot find symbol/i,
  /error:\s*class .* is public/i,
  /error:\s*reached end of file/i,
  /error:\s*incompatible types/i,
  /\.java:\d+: error:/i,
  /compilation failed/i,
  /error:/i,
  /Syntax error/i,
];

const RUNTIME_PATTERNS = [
  /Exception in thread/i,
  /java\.lang\.\w+Exception/i,
  /java\.lang\.\w+Error/i,
  /NullPointerException/i,
  /ArrayIndexOutOfBoundsException/i,
  /StackOverflowError/i,
  /OutOfMemoryError/i,
];

const TIMEOUT_PATTERNS = [
  /timed? ?out/i,
  /TIME_LIMIT/i,
  /execution exceeded/i,
  /killed.*signal/i,
];

export function classifyError(results: TestResult[], runnerError?: string): { type: ErrorType; summary: string } {
  if (runnerError) {
    for (const { re, reason } of SYSTEM_PATTERNS) {
      if (re.test(runnerError)) return { type: 'SYSTEM', summary: `${reason}: ${runnerError.slice(0, 200)}` };
    }
    return { type: 'SYSTEM', summary: `Runner error: ${runnerError.slice(0, 200)}` };
  }
  const failed = results.find((r) => r.status === 'FAILED');
  if (!failed) return { type: 'NONE', summary: 'No error' };
  const blob = failed.actual || '';

  for (const { re, reason } of SYSTEM_PATTERNS) {
    if (re.test(blob)) return { type: 'SYSTEM', summary: `${reason}: ${blob.slice(0, 200)}` };
  }
  if (COMPILE_PATTERNS.some((re) => re.test(blob))) {
    return { type: 'CODE_COMPILE', summary: `Compile error: ${blob.slice(0, 200)}` };
  }
  if (RUNTIME_PATTERNS.some((re) => re.test(blob))) {
    return { type: 'RUNTIME', summary: `Runtime error: ${blob.slice(0, 200)}` };
  }
  if (TIMEOUT_PATTERNS.some((re) => re.test(blob))) {
    return { type: 'TIMEOUT', summary: `Timeout: ${blob.slice(0, 200)}` };
  }
  return { type: 'LOGIC', summary: `Wrong answer. Expected ${failed.expected ?? '?'}, got ${failed.actual ?? '?'}` };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchOrGenerateTests(q: AgentQuestion, log: (e: AgentLogEntry) => void): Promise<{
  testCases: TestCaseInput[];
  starterCode: string;
} | null> {
  const { data: cached } = await supabase
    .from('problem_test_cases')
    .select('*')
    .eq('problem_key', q.problem_key)
    .maybeSingle();

  if (cached && Array.isArray(cached.test_cases) && cached.test_cases.length > 0) {
    log(newLog('info', `Loaded ${cached.test_cases.length} cached test cases.`));
    return {
      testCases: cached.test_cases as unknown as TestCaseInput[],
      starterCode: cached.starter_code || q.starterCode || '',
    };
  }

  log(newLog('info', 'No cached tests. Asking AI to generate test cases…'));
  const { data, error } = await supabase.functions.invoke('agent-generate-tests', {
    body: { problem_key: q.problem_key, title: q.title, difficulty: q.difficulty, topic: q.topic },
  });
  if (error) { log(newLog('error', `Test-case generation failed: ${error.message}`)); return null; }
  const payload = (data as any)?.data;
  if (!payload || !Array.isArray(payload.test_cases) || payload.test_cases.length === 0) {
    log(newLog('error', 'AI returned no usable test cases.'));
    return null;
  }
  log(newLog('success', `AI generated ${payload.test_cases.length} test cases.`));
  return { testCases: payload.test_cases as TestCaseInput[], starterCode: payload.starter_code || q.starterCode || '' };
}

async function generateCode(q: AgentQuestion, starterCode: string, state: AgentResult): Promise<string> {
  const { data, error } = await supabase.functions.invoke('agent-groq', {
    body: { mode: 'generate', title: q.title, difficulty: q.difficulty, starterCode, description: '' },
  });
  if (error) throw new Error(error.message);
  const code = (data as any)?.code;
  const keyUsed = (data as any)?.keyUsed;
  if (keyUsed) state.keyUsage[`key_${keyUsed}`] = (state.keyUsage[`key_${keyUsed}`] || 0) + 1;
  if (!code) throw new Error('Empty code from AI');
  return code;
}

async function fixCode(
  q: AgentQuestion, starterCode: string, currentCode: string,
  errorOutput: string, errorType: ErrorType,
  failingTest: { input: string; expected: string; actual: string } | undefined,
  state: AgentResult,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('agent-groq', {
    body: { mode: 'fix', title: q.title, starterCode, currentCode, errorOutput, errorType, failingTest },
  });
  if (error) throw new Error(error.message);
  const code = (data as any)?.code;
  const keyUsed = (data as any)?.keyUsed;
  if (keyUsed) state.keyUsage[`key_${keyUsed}`] = (state.keyUsage[`key_${keyUsed}`] || 0) + 1;
  if (!code) throw new Error('Empty fix from AI');
  return code;
}

async function proposeSystemPatch(
  q: AgentQuestion, errorSummary: string, state: AgentResult,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('agent-system-patch', {
      body: {
        problem_key: q.problem_key,
        error_type: 'SYSTEM',
        error_summary: errorSummary,
        recent_logs: state.logs.slice(-12),
      },
    });
    if (error) throw new Error(error.message);
    const id = (data as any)?.proposalId as string | undefined;
    return id ?? null;
  } catch (e) {
    return null;
  }
}

function summarizeFailure(results: TestResult[], errorType: ErrorType): { errorOutput: string; failing?: { input: string; expected: string; actual: string } } {
  const failed = results.find((r) => r.status === 'FAILED');
  if (!failed) return { errorOutput: 'Unknown failure' };
  
  // For compile/runtime errors, the full error text is in `actual` — preserve it completely
  const isCodeError = errorType === 'CODE_COMPILE' || errorType === 'RUNTIME';
  const errorOutput = isCodeError
    ? `[${errorType}] ${failed.actual || ''}`
    : `Expected: ${failed.expected || ''}, Got: ${failed.actual || '(no output)'}`;
  
  return {
    errorOutput,
    failing: { input: '(see test case)', expected: failed.expected || '', actual: failed.actual || '' },
  };
}

async function persistRun(state: AgentResult) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('agent_runs').insert({
      user_id: user.id,
      problem_key: state.problem_key,
      title: state.title,
      phase: state.phase,
      attempts: state.attempt,
      passed_count: state.passedCount,
      total_count: state.totalCount,
      error_type: state.errorType ?? null,
      final_code: state.finalCode,
      logs: state.logs as any,
      key_usage: state.keyUsage as any,
      started_at: state.startedAt ? new Date(state.startedAt).toISOString() : new Date().toISOString(),
      finished_at: state.finishedAt ? new Date(state.finishedAt).toISOString() : null,
    });
  } catch {
    // best-effort
  }
}

// ── Main per-question loop ───────────────────────────────────────────────────

export async function runAgentForQuestion(q: AgentQuestion, update: Updater): Promise<AgentResult> {
  const state: AgentResult = {
    problem_key: q.problem_key,
    title: q.title,
    phase: 'fetching-tests',
    attempt: 0,
    maxRetries: MAX_RETRIES,
    passedCount: 0,
    totalCount: 0,
    finalCode: '',
    logs: [],
    keyUsage: {},
    systemPatchProposalIds: [],
    startedAt: Date.now(),
  };
  const log = (e: AgentLogEntry) => { state.logs.push(e); update({ ...state }); };

  let systemPatchAttempts = 0;

  try {
    update({ ...state });
    const testInfo = await fetchOrGenerateTests(q, log);
    if (!testInfo) {
      state.phase = 'failed';
      state.errorType = 'SYSTEM';
      state.error = 'Could not obtain test cases';
      state.finishedAt = Date.now();
      update({ ...state });
      await persistRun(state);
      return state;
    }
    state.totalCount = testInfo.testCases.length;
    const starter = testInfo.starterCode;

    state.phase = 'generating-code';
    log(newLog('info', 'Asking AI to write Java solution…'));
    update({ ...state });
    let code: string;
    try {
      code = await generateCode(q, starter, state);
    } catch (e) {
      state.phase = 'failed';
      state.errorType = 'SYSTEM';
      state.error = `Code generation failed: ${(e as Error).message}`;
      log(newLog('system', state.error));
      state.finishedAt = Date.now();
      update({ ...state });
      await persistRun(state);
      return state;
    }
    log(newLog('success', `AI produced ${code.length} chars of code.`));

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      state.attempt = attempt;
      state.phase = 'running';
      log(newLog('info', `Attempt ${attempt}/${MAX_RETRIES}: running ${testInfo.testCases.length} tests…`));
      update({ ...state });

      let results: TestResult[] = [];
      let runnerError: string | undefined;
      try {
        results = await runAllTests(code, testInfo.testCases);
      } catch (e) {
        runnerError = (e as Error).message;
        log(newLog('error', `Runner crashed: ${runnerError}`));
        results = testInfo.testCases.map((tc, i) => ({
          test: i + 1, status: 'FAILED' as const, expected: tc.expected, actual: runnerError!,
        }));
      }

      const passed = results.filter((r) => r.status === 'PASSED').length;
      state.passedCount = passed;
      state.finalCode = code;

      if (passed === results.length && results.length > 0) {
        state.phase = 'passed';
        state.errorType = 'NONE';
        state.finishedAt = Date.now();
        log(newLog('success', `All ${results.length} tests passed on attempt ${attempt}.`));
        update({ ...state });
        await persistRun(state);
        return state;
      }

      const { type, summary } = classifyError(results, runnerError);
      state.errorType = type;

      // Log clearly what kind of error was detected
      if (type === 'CODE_COMPILE') {
        const firstFailed = results.find(r => r.status === 'FAILED');
        log(newLog('error', `⚠️ COMPILE ERROR detected: ${(firstFailed?.actual || '').slice(0, 200)}`));
      } else if (type === 'RUNTIME') {
        const firstFailed = results.find(r => r.status === 'FAILED');
        log(newLog('error', `⚠️ RUNTIME ERROR detected: ${(firstFailed?.actual || '').slice(0, 200)}`));
      } else {
        log(newLog('warn', `${passed}/${results.length} passed · error type: ${type}`));
      }

      // SYSTEM error → propose patch (max 2 per run), then continue retry loop
      if (type === 'SYSTEM' && systemPatchAttempts < MAX_SYSTEM_PATCH_ATTEMPTS) {
        systemPatchAttempts += 1;
        state.phase = 'system-patching';
        log(newLog('system', `SYSTEM error detected (#${systemPatchAttempts}). Asking AI to draft a system patch proposal for admin review…`));
        update({ ...state });
        const proposalId = await proposeSystemPatch(q, summary, state);
        if (proposalId) {
          state.systemPatchProposalIds.push(proposalId);
          log(newLog('system', `Patch proposal queued (id: ${proposalId.slice(0, 8)}…). It will NOT auto-apply — review in the Patch Proposals tab.`));
        } else {
          log(newLog('error', 'Could not create system patch proposal.'));
        }
      }

      if (attempt === MAX_RETRIES) break;

      // Ask AI to fix code — pass full error context including type
      state.phase = 'fixing';
      const { errorOutput, failing } = summarizeFailure(results, type);
      log(newLog('info', `[${type}] Sending error to AI for fix… ${errorOutput.slice(0, 120)}${errorOutput.length > 120 ? '…' : ''}`));
      update({ ...state });
      try {
        code = await fixCode(q, starter, code, errorOutput, type, failing, state);
        log(newLog('success', `AI produced a ${type === 'CODE_COMPILE' ? 'compile' : type === 'RUNTIME' ? 'runtime' : 'logic'} fix; retrying…`));
      } catch (e) {
        log(newLog('error', `Fix call failed: ${(e as Error).message}`));
        break;
      }
    }

    state.phase = 'failed';
    if (!state.errorType || state.errorType === 'NONE') state.errorType = 'LOGIC';
    state.error = `Did not pass after ${MAX_RETRIES} attempts`;
    state.finishedAt = Date.now();
    update({ ...state });
    await persistRun(state);
    return state;
  } catch (e) {
    state.phase = 'failed';
    state.errorType = 'SYSTEM';
    state.error = (e as Error).message;
    state.finishedAt = Date.now();
    log(newLog('error', state.error));
    update({ ...state });
    await persistRun(state);
    return state;
  }
}

// Concurrency pool — process all questions with a bounded number running in parallel.
export async function runAgentBatch(
  questions: AgentQuestion[],
  concurrency: number,
  update: Updater,
  shouldStop: () => boolean,
): Promise<void> {
  let nextIdx = 0;
  const workers = Array.from({ length: Math.min(concurrency, questions.length) }, async () => {
    while (true) {
      if (shouldStop()) return;
      const i = nextIdx++;
      if (i >= questions.length) return;
      await runAgentForQuestion(questions[i], update);
    }
  });
  await Promise.all(workers);
}
