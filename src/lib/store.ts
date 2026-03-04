// Local storage based store for problems and user data

export interface Problem {
  id: string;
  title: string;
  code: string;
  createdAt: string;
  updatedAt: string;
}

export interface Analysis {
  id: string;
  problemId: string;
  timeComplexity: string;
  spaceComplexity: string;
  algorithmUsed: string;
  summary: string;
  optimizations: string[];
  createdAt: string;
}

const PROBLEMS_KEY = 'dsa_lab_problems';
const USER_KEY = 'dsa_lab_user';
const ANALYSIS_KEY = 'dsa_lab_analysis';

export function getUser(): string | null {
  return localStorage.getItem(USER_KEY);
}

export function setUser(username: string) {
  localStorage.setItem(USER_KEY, username);
}

export function getProblems(): Problem[] {
  const data = localStorage.getItem(PROBLEMS_KEY);
  return data ? JSON.parse(data) : [];
}

function saveProblems(problems: Problem[]) {
  localStorage.setItem(PROBLEMS_KEY, JSON.stringify(problems));
}

export function createProblem(title: string, code: string = DEFAULT_CODE): Problem {
  const problems = getProblems();
  const problem: Problem = {
    id: crypto.randomUUID(),
    title,
    code,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  problems.push(problem);
  saveProblems(problems);
  return problem;
}

export function updateProblem(id: string, updates: Partial<Pick<Problem, 'title' | 'code'>>) {
  const problems = getProblems();
  const idx = problems.findIndex(p => p.id === id);
  if (idx !== -1) {
    problems[idx] = { ...problems[idx], ...updates, updatedAt: new Date().toISOString() };
    saveProblems(problems);
    return problems[idx];
  }
  return null;
}

export function deleteProblem(id: string) {
  const problems = getProblems().filter(p => p.id !== id);
  saveProblems(problems);
  // Also delete analysis
  const analyses = getAnalyses().filter(a => a.problemId !== id);
  localStorage.setItem(ANALYSIS_KEY, JSON.stringify(analyses));
}

export function getAnalyses(): Analysis[] {
  const data = localStorage.getItem(ANALYSIS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveAnalysis(analysis: Omit<Analysis, 'id' | 'createdAt'>): Analysis {
  const analyses = getAnalyses();
  const existing = analyses.findIndex(a => a.problemId === analysis.problemId);
  const newAnalysis: Analysis = {
    ...analysis,
    id: existing >= 0 ? analyses[existing].id : crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  if (existing >= 0) {
    analyses[existing] = newAnalysis;
  } else {
    analyses.push(newAnalysis);
  }
  localStorage.setItem(ANALYSIS_KEY, JSON.stringify(analyses));
  return newAnalysis;
}

export function getAnalysisForProblem(problemId: string): Analysis | null {
  return getAnalyses().find(a => a.problemId === problemId) || null;
}

export const DEFAULT_CODE = `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        // Write your DSA solution here
        System.out.println("Hello, DSA!");
    }
}
`;
