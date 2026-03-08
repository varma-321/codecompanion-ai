// Backend for Java code execution
import { API_BASE_URL } from './api';

const BACKEND_URL = `${API_BASE_URL}/api/run-java`;

export type ExecutionStatus =
  | 'ready'
  | 'sending'
  | 'compiling'
  | 'running'
  | 'complete'
  | 'compile_error'
  | 'failed';

export interface ExecutionResult {
  stdout: string | null;
  stderr: string | null;
  status: { id: number; description: string };
}

export async function executeJavaCode(
  code: string,
  onStatus?: (status: ExecutionStatus) => void
): Promise<ExecutionResult> {
  onStatus?.('sending');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    onStatus?.('compiling');

    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      onStatus?.('failed');
      const errorText = await response.text();
      return {
        stdout: null,
        stderr: `Backend error: ${response.status} - ${errorText || 'Unknown error'}`,
        status: { id: 11, description: 'Backend Error' },
      };
    }

    onStatus?.('running');

    const data = await response.json();

    // Determine status based on response
    const hasError = data.stderr && data.stderr.trim().length > 0;
    const isCompileError = hasError && /error:|cannot find symbol|class .* is public/i.test(data.stderr);

    if (isCompileError) {
      onStatus?.('compile_error');
      return {
        stdout: data.stdout || null,
        stderr: data.stderr || null,
        status: { id: 6, description: 'Compilation Error' },
      };
    }

    if (hasError && !data.stdout) {
      onStatus?.('failed');
      return {
        stdout: data.stdout || null,
        stderr: data.stderr || null,
        status: { id: 11, description: 'Runtime Error' },
      };
    }

    onStatus?.('complete');
    return {
      stdout: data.stdout || null,
      stderr: data.stderr || null,
      status: { id: 3, description: 'Accepted' },
    };
  } catch (error: any) {
    onStatus?.('failed');

    if (error.name === 'AbortError') {
      return {
        stdout: null,
        stderr: 'Execution stopped: program exceeded time limit or encountered an error.',
        status: { id: 11, description: 'Timeout' },
      };
    }

    // Connection refused or network error
    const isConnectionError = error.message?.includes('Failed to fetch') || 
                              error.message?.includes('NetworkError') ||
                              error.message?.includes('ECONNREFUSED');

    if (isConnectionError) {
      return {
        stdout: null,
        stderr: 'Cannot connect to local backend. Make sure the FastAPI server is running at http://127.0.0.1:8000',
        status: { id: 11, description: 'Connection Error' },
      };
    }

    return {
      stdout: null,
      stderr: error.message || 'Execution failed',
      status: { id: 11, description: 'Error' },
    };
  }
}
