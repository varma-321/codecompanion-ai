// Piston API for Java code compilation and execution

const PISTON_URL = 'https://emkc.org/api/v2/piston/execute';
const PISTON_RUNTIMES_URL = 'https://emkc.org/api/v2/piston/runtimes';

export type ExecutionStatus =
  | 'ready'
  | 'checking'
  | 'sending'
  | 'running'
  | 'complete'
  | 'compile_error'
  | 'failed';

export interface ExecutionResult {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  status: { id: number; description: string };
  time: string | null;
  memory: number | null;
}

const EXTERNAL_LIB_PATTERN = /import\s+(?!java\.|javax\.)\w+/;

export async function checkPistonAvailability(): Promise<boolean> {
  try {
    const response = await fetch(PISTON_RUNTIMES_URL, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function executeJavaCode(
  code: string,
  stdin: string = '',
  onStatus?: (status: ExecutionStatus) => void
): Promise<ExecutionResult> {
  // Check for external libraries
  if (EXTERNAL_LIB_PATTERN.test(code)) {
    return {
      stdout: null,
      stderr: 'External libraries are not supported in the current execution environment.\nOnly standard Java libraries (java.util.*, java.io.*, java.math.*, java.time.*, etc.) are supported.',
      compile_output: null,
      status: { id: 11, description: 'Runtime Error' },
      time: null,
      memory: null,
    };
  }

  onStatus?.('checking');

  const available = await checkPistonAvailability();
  if (!available) {
    onStatus?.('failed');
    return {
      stdout: null,
      stderr: 'Piston API is currently unavailable or restricted.',
      compile_output: null,
      status: { id: 11, description: 'API Unavailable' },
      time: null,
      memory: null,
    };
  }

  onStatus?.('sending');

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
    let message = `Piston API error: ${response.status}`;

    try {
      const parsed = JSON.parse(err);
      if (parsed.message) message = parsed.message;
    } catch {
      if (err) message = err;
    }

    const isRestricted = response.status === 401 || /whitelist only|unavailable|restricted/i.test(message);

    if (isRestricted) {
      onStatus?.('failed');
      return {
        stdout: null,
        stderr: 'Piston API is currently unavailable or restricted.',
        compile_output: null,
        status: { id: 11, description: 'API Unavailable' },
        time: null,
        memory: null,
      };
    }

    onStatus?.('failed');
    throw new Error(message);
  }

  onStatus?.('running');

  const data = await response.json();

  const compileOutput = data.compile?.stderr || data.compile?.output || null;
  const hasCompileError = data.compile?.code !== 0 && data.compile?.code !== undefined && data.compile?.code !== null;

  if (hasCompileError) {
    onStatus?.('compile_error');
  } else if (data.run?.code === 0) {
    onStatus?.('complete');
  } else {
    onStatus?.('failed');
  }

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
