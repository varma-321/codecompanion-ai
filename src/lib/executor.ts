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
  | 'failed'
  | 'stopped';

export interface ExecutionResult {
  success: boolean;
  output: string | null;
  error: string | null;
  status: { id: number; description: string };
}

// Global abort controller for stopping execution
let currentAbortController: AbortController | null = null;

export function stopExecution() {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
}

export function isExecuting(): boolean {
  return currentAbortController !== null;
}

export async function executeJavaCode(
  code: string,
  onStatus?: (status: ExecutionStatus) => void,
  stdin?: string
): Promise<ExecutionResult> {
  // Abort any previous execution
  stopExecution();
  
  const controller = new AbortController();
  currentAbortController = controller;
  
  onStatus?.('sending');

  try {
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    onStatus?.('compiling');

    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, ...(stdin ? { stdin } : {}) }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      onStatus?.('failed');
      currentAbortController = null;
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
    currentAbortController = null;

    if (data.success) {
      onStatus?.('complete');
      return {
        success: true,
        output: data.output || '',
        error: null,
        status: { id: 3, description: 'Accepted' },
      };
    } else {
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
    currentAbortController = null;

    if (error.name === 'AbortError') {
      onStatus?.('stopped');
      return {
        success: false,
        output: null,
        error: 'Execution stopped by user.',
        status: { id: 11, description: 'Stopped' },
      };
    }

    onStatus?.('failed');

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
