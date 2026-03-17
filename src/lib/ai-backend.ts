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

export async function analyzeCode(code: string, problemId?: string | null): Promise<{
  problemName: string;
  algorithmUsed: string;
  timeComplexity: string;
  spaceComplexity: string;
  summary: string;
  optimizations: string[];
}> {
  const data = await postAPI('/api/analyze', { code, problemId });
  // Handle the new markdown analysis string if needed, or parse the expected JSON
  if (typeof data.analysis === 'string') {
    return {
      problemName: problemId || 'Analysis',
      algorithmUsed: 'Java Logic',
      timeComplexity: 'View Summary',
      spaceComplexity: 'View Summary',
      summary: data.analysis,
      optimizations: [],
    };
  }
  return {
    problemName: data.problemName || 'Unknown',
    algorithmUsed: data.algorithmUsed || 'Unknown',
    timeComplexity: data.timeComplexity || 'Unknown',
    spaceComplexity: data.spaceComplexity || 'Unknown',
    summary: data.summary || data.explanation || JSON.stringify(data),
    optimizations: data.optimizations || [],
  };
}

export async function getHints(code: string, hintLevel: number, problemId?: string | null): Promise<string> {
  const data = await postAPI('/api/hints', { code, hintLevel, problemId });
  return data.hint || data.response || JSON.stringify(data);
}

export async function getSolution(code: string, type: 'brute' | 'better' | 'optimal', problemId?: string | null): Promise<{
  code: string;
  timeComplexity: string;
  spaceComplexity: string;
  explanation: string;
}> {
  const data = await postAPI('/api/solution', { code, type, problemId });
  if (data.solution) {
    return {
      code: data.solution.match(/```java\n([\s\S]*?)```/)?.[1] || data.solution,
      timeComplexity: 'Analyzed',
      spaceComplexity: 'Analyzed',
      explanation: data.solution,
    };
  }
  return {
    code: data.code || '',
    timeComplexity: data.timeComplexity || 'Unknown',
    spaceComplexity: data.spaceComplexity || 'Unknown',
    explanation: data.explanation || '',
  };
}

export async function dryRun(code: string, inputs: string, problemId?: string | null): Promise<string> {
  const data = await postAPI('/api/dry-run', { code, inputs, problemId });
  return data.trace || JSON.stringify(data);
}

export async function analyzeComplexityAdvanced(code: string, problemId?: string | null): Promise<string> {
  const data = await postAPI('/api/analyze-advanced', { code, problemId });
  return data.radar || JSON.stringify(data);
}

export async function chat(code: string, userMessage: string, problemId?: string | null): Promise<string> {
  const data = await postAPI('/api/chat', { code, message: userMessage, problemId });
  return data.response || data.reply || JSON.stringify(data);
}

export async function generateTestCases(code: string, problemId?: string | null): Promise<any[]> {
  const data = await postAPI('/api/generate-test-cases', { code, problemId });
  return data.testCases || [];
}

export async function detectPatterns(code: string, problemId?: string | null): Promise<string> {
  const data = await postAPI('/api/patterns', { code, problemId });
  return data.patterns || data.response || JSON.stringify(data);
}

export async function detectMistakes(code: string, problemId?: string | null): Promise<string> {
  const data = await postAPI('/api/mistakes', { code, problemId });
  return data.mistakes || data.response || JSON.stringify(data);
}

export async function getTimeComplexity(code: string, problemId?: string | null): Promise<string> {
  const data = await postAPI('/api/time-complexity', { code, problemId });
  return data.result || JSON.stringify(data);
}

export async function getSpaceComplexity(code: string, problemId?: string | null): Promise<string> {
  const data = await postAPI('/api/space-complexity', { code, problemId });
  return data.result || JSON.stringify(data);
}

export async function getJavaInterviewQuestions(code: string, problemId?: string | null): Promise<string> {
  const data = await postAPI('/api/java-interview', { code, problemId });
  return data.questions || JSON.stringify(data);
}

export async function getApproach(code: string, problemId?: string | null): Promise<string> {
  const data = await postAPI('/api/approach', { code, problemId });
  return data.approach || JSON.stringify(data);
}

export async function refactorCode(code: string, problemId?: string | null): Promise<string> {
  const data = await postAPI('/api/refactor', { code, problemId });
  return data.refactored || JSON.stringify(data);
}

export async function getVibeCheck(code: string, problemId?: string | null): Promise<any> {
    return postAPI('/api/vibe-check', { code, problemId });
}

export async function getPerformanceAudit(code: string, problemId?: string | null): Promise<string> {
    const data = await postAPI('/api/performance-audit', { code, problemId });
    return data.audit || JSON.stringify(data);
}

export async function getVisualization(code: string, problemId?: string | null): Promise<string> {
    const data = await postAPI('/api/visualize', { code, problemId });
    return data.mermaid || JSON.stringify(data);
}

export async function detectProblemTitle(code: string): Promise<string> {
  try {
    const result = await analyzeCode(code);
    return result.problemName || 'Unknown Problem';
  } catch {
    return 'Unknown Problem';
  }
}

export async function explainCode(code: string, problemId?: string | null): Promise<string> {
  const data = await postAPI('/api/explain-code', { code, problemId });
  return data.explanation || data.analysis || JSON.stringify(data);
}

export async function getExtraInsights(code: string, type: string, problemId?: string | null): Promise<string> {
  if (type === 'dry-run') return dryRun(code, 'Standard Example Inputs', problemId);
  if (type === 'complexity-radar') return analyzeComplexityAdvanced(code, problemId);
  if (type === 'time-complexity') return getTimeComplexity(code, problemId);
  if (type === 'space-complexity') return getSpaceComplexity(code, problemId);
  if (type === 'interview') return getJavaInterviewQuestions(code, problemId);
  if (type === 'approach') return getApproach(code, problemId);
  if (type === 'refactor') return refactorCode(code, problemId);
  if (type === 'edgecases') return detectPatterns(code, problemId);
  if (type === 'vibe-check') {
    const data = await getVibeCheck(code, problemId);
    return `### AI Code Aura: ${data.profile}\n\n**Aura Score:** ${data.summary}\n\n| Readability | Performance | Scalability | Java Idioms |\n| :--- | :--- | :--- | :--- |\n| ${data.scores.readability}% | ${data.scores.performance}% | ${data.scores.scalability}% | ${data.scores.javaIdioms}% |`;
  }
  if (type === 'performance-audit') return getPerformanceAudit(code, problemId);
  if (type === 'visualize') {
    const mermaid = await getVisualization(code, problemId);
    return `### Logic Visualization\n\n\`\`\`mermaid\n${mermaid}\n\`\`\``;
  }
  if (type === 'testcases') {
    const tests = await generateTestCases(code, problemId);
    return `### Generated Test Cases\n\n${tests.map((t, i) => `**Case ${i+1} (${t.category})**\n- Inputs: \`${JSON.stringify(t.inputs)}\`\n- Expected: \`${t.expectedOutput}\``).join('\n\n')}`;
  }
  return explainCode(code, problemId);
}

