// Judge0 API for Java code compilation and execution
// Using free public Judge0 CE instance

const JUDGE0_URL = 'https://judge0-ce.p.rapidapi.com';

// For the free tier, you can use the public API
// Users should set their own RapidAPI key for production use
let apiKey = '';

export function setJudge0ApiKey(key: string) {
  apiKey = key;
  localStorage.setItem('judge0_api_key', key);
}

export function getJudge0ApiKey(): string {
  if (!apiKey) {
    apiKey = localStorage.getItem('judge0_api_key') || '';
  }
  return apiKey;
}

export interface ExecutionResult {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  status: { id: number; description: string };
  time: string | null;
  memory: number | null;
}

export async function executeJavaCode(code: string, stdin: string = ''): Promise<ExecutionResult> {
  const key = getJudge0ApiKey();
  if (!key) {
    throw new Error('Judge0 API key not set. Go to Settings to configure it.');
  }

  // Java language id = 62
  const submission = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=true&wait=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-RapidAPI-Key': key,
      'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
    },
    body: JSON.stringify({
      language_id: 62,
      source_code: btoa(code),
      stdin: btoa(stdin),
    }),
  });

  if (!submission.ok) {
    const err = await submission.text();
    throw new Error(`Judge0 error: ${submission.status} - ${err}`);
  }

  const result = await submission.json();
  return {
    stdout: result.stdout ? atob(result.stdout) : null,
    stderr: result.stderr ? atob(result.stderr) : null,
    compile_output: result.compile_output ? atob(result.compile_output) : null,
    status: result.status,
    time: result.time,
    memory: result.memory,
  };
}
