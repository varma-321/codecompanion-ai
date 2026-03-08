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
  success: boolean;
  output: string | null;
  error: string | null;
  status: { id: number; description: string };
}

export async function executeJavaCode(
  code: string,
  onStatus?: (status: ExecutionStatus) => void
): Promise<ExecutionResult> {
  onStatus?.('sending');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

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
        success: false,
        output: null,
        error: `Backend error: ${response.status} - ${errorText || 'Unknown error'}`,
        status: { id: 11, description: 'Backend Error' },
      };
    }

    onStatus?.('running');

    const data = await response.json();

    // Handle the backend response format: { success, output } or { success, error }
    if (data.success) {
      onStatus?.('complete');
      return {
        success: true,
        output: data.output || '',
        error: null,
        status: { id: 3, description: 'Accepted' },
      };
    } else {
      // Check if it's a compilation error
      const errorMsg = data.error || 'Unknown error';
      const isCompileError = /error:|cannot find symbol|class .* is public|expected|illegal/i.test(errorMsg);
      
      if (isCompileError) {
        onStatus?.('compile_error');
        return {
          success: false,
          output: null,
          error: errorMsg,
          status: { id: 6, description: 'Compilation Error' },
        };
      }

      onStatus?.('failed');
      return {
        success: false,
        output: null,
        error: errorMsg,
        status: { id: 11, description: 'Runtime Error' },
      };
    }
  } catch (error: any) {
    onStatus?.('failed');

    if (error.name === 'AbortError') {
      return {
        success: false,
        output: null,
        error: 'Execution timed out. Program exceeded time limit or encountered an error.',
        status: { id: 11, description: 'Timeout' },
      };
    }

    // Connection refused or network error
    const isConnectionError = error.message?.includes('Failed to fetch') || 
                              error.message?.includes('NetworkError') ||
                              error.message?.includes('ECONNREFUSED');

    if (isConnectionError) {
      return {
        success: false,
        output: null,
        error: 'Server is waking up. Please wait a moment and try again.',
        status: { id: 11, description: 'Connection Error' },
      };
    }

    return {
      success: false,
      output: null,
      error: error.message || 'Execution failed',
      status: { id: 11, description: 'Error' },
    };
  }
}
