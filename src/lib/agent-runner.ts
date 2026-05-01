// Browser-side autonomous agent orchestrator.
// Per question: ensure test cases (cache or generate) -> generate Java code -> run via test-runner ->
// on failure: fix code with AI -> retry up to MAX_RETRIES.
// Concurrency-controlled across many questions.

import { supabase } from '@/integrations/supabase/client';
import { runAllTests, type TestCaseInput } from './test-runner';
import type { TestResult } from '@/components/TestCasePanel';

export const MAX_RETRIES = 5;

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
  | 'passed'
  | 'failed';

export interface AgentLogEntry {
  ts: number;
  level: 'info' | 'warn' | 'error' | 'success';
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
  error?: string;
  startedAt?: number;
  finishedAt?: number;
}

type Updater = (state: AgentResult) => void;

function newLog(level: AgentLogEntry['level'], message: string): AgentLogEntry {
  return { ts: Date.now(), level, message };
}

async function fetchOrGenerateTests(q: AgentQuestion, log: (e: AgentLogEntry) => void): Promise<{
  testCases: TestCaseInput[];
  starterCode: string;
} | null> {
  // 1. Try cache
  const { data: cached } = await supabase
    .from('problem_test_cases')
    .select('*')
    .eq('problem_key', q.problem_key)
    .maybeSingle();

  if (cached && Array.isArray(cached.test_cases) && cached.test_cases.length > 0) {
    log(newLog('info', `Loaded ${cached.test_cases.length} cached test cases.`));
    return {
      testCases: cached.test_cases as TestCaseInput[],
      starterCode: cached.starter_code || q.starterCode || '',
    };
  }

  // 2. Generate via edge function
  log(newLog('info', 'No cached tests. Asking AI to generate test cases…'));
  const { data, error } = await supabase.functions.invoke('agent-generate-tests', {
    body: {
      problem_key: q.problem_key,
      title: q.title,
      difficulty: q.difficulty,
      topic: q.topic,
    },
  });
  if (error) {
    log(newLog('error', `Test-case generation failed: ${error.message}`));
    return null;
  }
  const payload = (data as any)?.data;
  if (!payload || !Array.isArray(payload.test_cases) || payload.test_cases.length === 0) {
    log(newLog('error', 'AI returned no usable test cases.'));
    return null;
  }
  log(newLog('success', `AI generated ${payload.test_cases.length} test cases.`));
  return {
    testCases: payload.test_cases as TestCaseInput[],
    starterCode: payload.starter_code || q.starterCode || '',
  };
}

async function generateCode(q: AgentQuestion, starterCode: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('agent-groq', {
    body: {
      mode: 'generate',
      title: q.title,
      difficulty: q.difficulty,
      starterCode,
      description: '',
    },
  });
  if (error) throw new Error(error.message);
  const code = (data as any)?.code;
  if (!code) throw new Error('Empty code from AI');
  return code;
}

async function fixCode(
  q: AgentQuestion,
  starterCode: string,
  currentCode: string,
  errorOutput: string,
  failingTest?: { input: string; expected: string; actual: string },
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('agent-groq', {
    body: { mode: 'fix', title: q.title, starterCode, currentCode, errorOutput, failingTest },
  });
  if (error) throw new Error(error.message);
  const code = (data as any)?.code;
  if (!code) throw new Error('Empty fix from AI');
  return code;
}

function summarizeFailure(results: TestResult[]): { errorOutput: string; failing?: { input: string; expected: string; actual: string } } {
  const failed = results.find((r) => r.status === 'FAILED');
  if (!failed) return { errorOutput: 'Unknown failure' };
  return {
    errorOutput: failed.actual || 'Wrong answer',
    failing: {
      input: '(see test case)',
      expected: failed.expected || '',
      actual: failed.actual || '',
    },
  };
}

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
    startedAt: Date.now(),
  };
  const log = (e: AgentLogEntry) => { state.logs.push(e); update({ ...state }); };

  try {
    update({ ...state });
    const testInfo = await fetchOrGenerateTests(q, log);
    if (!testInfo) {
      state.phase = 'failed';
      state.error = 'Could not obtain test cases';
      state.finishedAt = Date.now();
      update({ ...state });
      return state;
    }
    state.totalCount = testInfo.testCases.length;
    const starter = testInfo.starterCode;

    state.phase = 'generating-code';
    log(newLog('info', 'Asking AI to write Java solution…'));
    update({ ...state });
    let code = await generateCode(q, starter);
    log(newLog('success', `AI produced ${code.length} chars of code.`));

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      state.attempt = attempt;
      state.phase = 'running';
      log(newLog('info', `Attempt ${attempt}/${MAX_RETRIES}: running ${testInfo.testCases.length} tests…`));
      update({ ...state });

      let results: TestResult[] = [];
      try {
        results = await runAllTests(code, testInfo.testCases);
      } catch (e) {
        log(newLog('error', `Runner crashed: ${(e as Error).message}`));
        results = testInfo.testCases.map((tc, i) => ({
          test: i + 1, status: 'FAILED' as const, expected: tc.expected, actual: (e as Error).message,
        }));
      }

      const passed = results.filter((r) => r.status === 'PASSED').length;
      state.passedCount = passed;
      state.finalCode = code;

      if (passed === results.length && results.length > 0) {
        state.phase = 'passed';
        state.finishedAt = Date.now();
        log(newLog('success', `All ${results.length} tests passed on attempt ${attempt}.`));
        update({ ...state });
        return state;
      }

      log(newLog('warn', `${passed}/${results.length} passed.`));
      if (attempt === MAX_RETRIES) break;

      // Ask AI to fix
      state.phase = 'fixing';
      const { errorOutput, failing } = summarizeFailure(results);
      log(newLog('info', `Sending error back to AI for fix… (${errorOutput.slice(0, 80)}${errorOutput.length > 80 ? '…' : ''})`));
      update({ ...state });
      try {
        code = await fixCode(q, starter, code, errorOutput, failing);
        log(newLog('success', 'AI returned a fix; retrying.'));
      } catch (e) {
        log(newLog('error', `Fix call failed: ${(e as Error).message}`));
        break;
      }
    }

    state.phase = 'failed';
    state.error = `Did not pass after ${MAX_RETRIES} attempts`;
    state.finishedAt = Date.now();
    update({ ...state });
    return state;
  } catch (e) {
    state.phase = 'failed';
    state.error = (e as Error).message;
    state.finishedAt = Date.now();
    log(newLog('error', state.error));
    update({ ...state });
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
