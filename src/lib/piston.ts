// Piston API for Java code compilation and execution
// Uses the free public Piston API - no API key required

const PISTON_URL = 'https://emkc.org/api/v2/piston/execute';

export interface ExecutionResult {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  status: { id: number; description: string };
  time: string | null;
  memory: number | null;
}

export async function executeJavaCode(code: string, stdin: string = ''): Promise<ExecutionResult> {
  const response = await fetch(PISTON_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: 'java',
      version: '*',
      files: [{ name: 'Main.java', content: code }],
      stdin,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Piston API error: ${response.status} - ${err}`);
  }

  const data = await response.json();

  const compileOutput = data.compile?.stderr || data.compile?.output || null;
  const hasCompileError = data.compile?.code !== 0 && data.compile?.code !== undefined && data.compile?.code !== null;

  return {
    stdout: data.run?.stdout || null,
    stderr: data.run?.stderr || null,
    compile_output: hasCompileError ? compileOutput : null,
    status: {
      id: hasCompileError ? 6 : (data.run?.code === 0 ? 3 : 11),
      description: hasCompileError ? 'Compilation Error' : (data.run?.code === 0 ? 'Accepted' : 'Runtime Error'),
    },
    time: data.run?.time?.toString() || null,
    memory: data.run?.memory || null,
  };
}
