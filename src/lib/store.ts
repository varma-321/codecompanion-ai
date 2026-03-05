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

export interface Hint {
  id: string;
  problemId: string;
  hintStep: number;
  hintText: string;
}

export interface Solution {
  id: string;
  problemId: string;
  solutionType: 'brute' | 'better' | 'optimal';
  solutionCode: string;
  explanation: string;
  timeComplexity: string;
  spaceComplexity: string;
}

export interface TestCase {
  id: string;
  problemId: string;
  inputData: string;
  expectedOutput: string;
}

const PROBLEMS_KEY = 'dsa_lab_problems';
const USER_KEY = 'dsa_lab_user';
const ANALYSIS_KEY = 'dsa_lab_analysis';
const HINTS_KEY = 'dsa_lab_hints';
const SOLUTIONS_KEY = 'dsa_lab_solutions';
const TEST_CASES_KEY = 'dsa_lab_test_cases';

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
  // Also delete related data
  const analyses = getAnalyses().filter(a => a.problemId !== id);
  localStorage.setItem(ANALYSIS_KEY, JSON.stringify(analyses));
  const hints = getHints(id); // clear hints
  const allHints = getAllHints().filter(h => h.problemId !== id);
  localStorage.setItem(HINTS_KEY, JSON.stringify(allHints));
  const allSolutions = getAllSolutions().filter(s => s.problemId !== id);
  localStorage.setItem(SOLUTIONS_KEY, JSON.stringify(allSolutions));
  const allTestCases = getAllTestCases().filter(t => t.problemId !== id);
  localStorage.setItem(TEST_CASES_KEY, JSON.stringify(allTestCases));
}

// Analysis
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

// Hints
function getAllHints(): Hint[] {
  const data = localStorage.getItem(HINTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function getHints(problemId: string): Hint[] {
  return getAllHints().filter(h => h.problemId === problemId).sort((a, b) => a.hintStep - b.hintStep);
}

export function saveHint(problemId: string, hintStep: number, hintText: string): Hint {
  const allHints = getAllHints();
  const hint: Hint = { id: crypto.randomUUID(), problemId, hintStep, hintText };
  allHints.push(hint);
  localStorage.setItem(HINTS_KEY, JSON.stringify(allHints));
  return hint;
}

// Solutions
function getAllSolutions(): Solution[] {
  const data = localStorage.getItem(SOLUTIONS_KEY);
  return data ? JSON.parse(data) : [];
}

export function getSolutions(problemId: string): Solution[] {
  return getAllSolutions().filter(s => s.problemId === problemId);
}

export function saveSolution(sol: Omit<Solution, 'id'>): Solution {
  const allSolutions = getAllSolutions();
  const existing = allSolutions.findIndex(s => s.problemId === sol.problemId && s.solutionType === sol.solutionType);
  const newSol: Solution = { ...sol, id: existing >= 0 ? allSolutions[existing].id : crypto.randomUUID() };
  if (existing >= 0) {
    allSolutions[existing] = newSol;
  } else {
    allSolutions.push(newSol);
  }
  localStorage.setItem(SOLUTIONS_KEY, JSON.stringify(allSolutions));
  return newSol;
}

// Test Cases
function getAllTestCases(): TestCase[] {
  const data = localStorage.getItem(TEST_CASES_KEY);
  return data ? JSON.parse(data) : [];
}

export function getTestCases(problemId: string): TestCase[] {
  return getAllTestCases().filter(t => t.problemId === problemId);
}

export function saveTestCases(problemId: string, cases: { inputData: string; expectedOutput: string }[]) {
  const allTestCases = getAllTestCases().filter(t => t.problemId !== problemId);
  const newCases = cases.map(c => ({
    id: crypto.randomUUID(),
    problemId,
    inputData: c.inputData,
    expectedOutput: c.expectedOutput,
  }));
  localStorage.setItem(TEST_CASES_KEY, JSON.stringify([...allTestCases, ...newCases]));
  return newCases;
}

export const DEFAULT_CODE = `import java.util.*;

public class Main {
    public static void main(String[] args) {
        // Write your DSA solution here
        System.out.println("Hello, DSA!");
    }
}
`;
