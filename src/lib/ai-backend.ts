import { API_BASE_URL } from './api';

async function postAPI(endpoint: string, body: Record<string, any>): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    return await res.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      throw new Error('Server is waking up or temporarily unavailable. Please try again.');
    }
    throw error;
  }
}

export async function checkBackendStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/explain-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: '' }),
      signal: AbortSignal.timeout(5000),
    });
    return true;
  } catch {
    return false;
  }
}

export async function analyzeCode(code: string): Promise<{
  problemName: string;
  algorithmUsed: string;
  timeComplexity: string;
  spaceComplexity: string;
  summary: string;
  optimizations: string[];
}> {
  const data = await postAPI('/api/analyze', { code });
  return {
    problemName: data.problemName || 'Unknown',
    algorithmUsed: data.algorithmUsed || 'Unknown',
    timeComplexity: data.timeComplexity || 'Unknown',
    spaceComplexity: data.spaceComplexity || 'Unknown',
    summary: data.summary || data.explanation || JSON.stringify(data),
    optimizations: data.optimizations || [],
  };
}

export async function getHints(code: string, hintLevel: number): Promise<string> {
  const data = await postAPI('/api/hints', { code, hintLevel });
  return data.hint || data.response || JSON.stringify(data);
}

export async function getSolution(code: string, type: 'brute' | 'better' | 'optimal'): Promise<{
  code: string;
  timeComplexity: string;
  spaceComplexity: string;
  explanation: string;
}> {
  const data = await postAPI('/api/solution', { code, type });
  return {
    code: data.code || '',
    timeComplexity: data.timeComplexity || 'Unknown',
    spaceComplexity: data.spaceComplexity || 'Unknown',
    explanation: data.explanation || '',
  };
}

export async function detectPatterns(code: string): Promise<string> {
  const data = await postAPI('/api/patterns', { code });
  return data.patterns || data.response || JSON.stringify(data);
}

export async function detectMistakes(code: string): Promise<string> {
  const data = await postAPI('/api/mistakes', { code });
  return data.mistakes || data.response || JSON.stringify(data);
}

export async function chat(code: string, userMessage: string): Promise<string> {
  const data = await postAPI('/api/chat', { code, message: userMessage });
  return data.response || data.reply || JSON.stringify(data);
}

export async function explainCode(code: string): Promise<string> {
  const data = await postAPI('/api/explain-code', { code });
  return data.explanation || data.response || JSON.stringify(data);
}

export async function detectProblemTitle(code: string): Promise<string> {
  try {
    const result = await analyzeCode(code);
    return result.problemName || 'Unknown Problem';
  } catch {
    return 'Unknown Problem';
  }
}

export async function getExtraInsights(code: string, type: string): Promise<string> {
  if (type === 'edgecases') {
    return detectPatterns(code);
  }
  if (type === 'testcases') {
    const data = await postAPI('/api/solution', { code, type: 'optimal' });
    return data.explanation || JSON.stringify(data);
  }
  // For algorithm, explain, learning, examples — use explain endpoint
  return explainCode(code);
}
