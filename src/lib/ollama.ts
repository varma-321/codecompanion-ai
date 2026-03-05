// Ollama API client - connects to local Ollama instance

const OLLAMA_URL = 'http://127.0.0.1:11434';

let selectedModel = localStorage.getItem('ollama_selected_model') || 'llama3.2';

export function getSelectedModel(): string {
  return selectedModel;
}

export function setSelectedModel(model: string) {
  selectedModel = model;
  localStorage.setItem('ollama_selected_model', model);
}

export async function checkOllamaStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getOllamaModels(): Promise<string[]> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`);
    const data = await res.json();
    return data.models?.map((m: any) => m.name) || [];
  } catch {
    return [];
  }
}

async function generate(prompt: string): Promise<string> {
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: selectedModel, prompt, stream: false }),
  });
  if (!res.ok) throw new Error('Ollama request failed');
  const data = await res.json();
  return data.response;
}

export async function analyzeCode(code: string): Promise<{
  problemName: string;
  algorithmUsed: string;
  timeComplexity: string;
  spaceComplexity: string;
  summary: string;
  optimizations: string[];
}> {
  const prompt = `Analyze this Java DSA code. Return ONLY a JSON object with these fields:
- problemName: the DSA problem being solved
- algorithmUsed: the algorithm/approach used (e.g. Binary Search, Two Pointers, DFS, Dynamic Programming, Sliding Window, Greedy, BFS)
- timeComplexity: Big-O time complexity
- spaceComplexity: Big-O space complexity
- summary: brief explanation of what the code does
- optimizations: array of optimization suggestions

Code:
\`\`\`java
${code}
\`\`\`

Return ONLY valid JSON, no markdown.`;

  const response = await generate(prompt);
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return JSON.parse(response);
  } catch {
    return {
      problemName: 'Unknown',
      algorithmUsed: 'Unknown',
      timeComplexity: 'Unknown',
      spaceComplexity: 'Unknown',
      summary: response,
      optimizations: [],
    };
  }
}

export async function getHints(code: string, hintLevel: number): Promise<string> {
  const levels: Record<number, string> = {
    1: 'Give a conceptual direction hint. Do NOT reveal the algorithm or solution.',
    2: 'Suggest what type of algorithm or data structure might help. Do NOT give code.',
    3: 'Give a partial approach with pseudocode-level guidance. Do NOT give full code.',
    4: 'Give detailed step-by-step guidance including edge cases. Still avoid full code.',
  };

  const prompt = `You are a DSA tutor. The student has this Java code:
\`\`\`java
${code}
\`\`\`

${levels[hintLevel] || levels[1]}

Be concise and helpful. Format with markdown.`;

  return generate(prompt);
}

export async function getSolution(code: string, type: 'brute' | 'better' | 'optimal'): Promise<{
  code: string;
  timeComplexity: string;
  spaceComplexity: string;
  explanation: string;
}> {
  const typeDesc: Record<string, string> = {
    brute: 'brute force (simplest, possibly inefficient)',
    better: 'better/improved (good balance of readability and efficiency)',
    optimal: 'optimal (best possible time/space complexity)',
  };

  const prompt = `Given this Java DSA code, provide the ${typeDesc[type]} solution.

\`\`\`java
${code}
\`\`\`

Return ONLY a JSON object with:
- code: complete Java solution code
- timeComplexity: Big-O time
- spaceComplexity: Big-O space
- explanation: brief explanation

Return ONLY valid JSON, no markdown wrapping.`;

  const response = await generate(prompt);
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return JSON.parse(response);
  } catch {
    return {
      code: '',
      timeComplexity: 'Unknown',
      spaceComplexity: 'Unknown',
      explanation: response,
    };
  }
}

export async function detectProblemTitle(code: string): Promise<string> {
  const prompt = `What DSA problem does this Java code solve? Reply with ONLY the problem name (e.g. "Two Sum", "Binary Search", "Merge Sort"). If you can't determine it, reply "Unknown Problem".

\`\`\`java
${code}
\`\`\``;

  const response = await generate(prompt);
  return response.trim().replace(/['"]/g, '');
}

export async function getExtraInsights(code: string, type: 'algorithm' | 'edgecases' | 'testcases' | 'examples' | 'explain' | 'learning'): Promise<string> {
  const prompts: Record<string, string> = {
    algorithm: `Explain the algorithm used in this Java code in detail with visual examples:\n\`\`\`java\n${code}\n\`\`\``,
    edgecases: `List all important edge cases for this Java DSA code. Include: empty input, large input, duplicate elements, boundary values, negative numbers, single element. Format as a numbered list:\n\`\`\`java\n${code}\n\`\`\``,
    testcases: `Generate test cases for this Java DSA code with specific inputs and expected outputs. Format as a table or numbered list:\n\`\`\`java\n${code}\n\`\`\``,
    examples: `Generate sample inputs and expected outputs for this Java code:\n\`\`\`java\n${code}\n\`\`\``,
    explain: `Explain this Java code step-by-step. Break down each line and explain what it does, why it's there, and how data flows through the algorithm:\n\`\`\`java\n${code}\n\`\`\``,
    learning: `As a DSA tutor, explain:\n1. Why this algorithm works for this problem\n2. How it can be optimized further\n3. Common mistakes students make with this approach\n4. Related problems that use similar techniques\n\nCode:\n\`\`\`java\n${code}\n\`\`\``,
  };

  return generate(prompts[type]);
}
