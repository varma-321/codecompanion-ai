import { supabase } from '@/integrations/supabase/client';

export { supabase };

// User types matching Supabase schema
export interface DbUser {
  id: string;
  username: string;
  created_at: string;
}

export interface DbProblem {
  id: string;
  user_id: string;
  title: string;
  code: string;
  created_at: string;
  updated_at: string;
}

export interface DbAnalysis {
  id: string;
  user_id: string;
  problem_id: string;
  algorithm: string | null;
  time_complexity: string | null;
  space_complexity: string | null;
  summary: string | null;
  optimizations: string[] | null;
  created_at: string;
}

export interface DbHint {
  id: string;
  user_id: string;
  problem_id: string;
  hint_level: number;
  hint_text: string;
  created_at: string;
}

export interface DbSolution {
  id: string;
  user_id: string;
  problem_id: string;
  solution_type: string;
  solution_code: string;
  explanation: string | null;
  time_complexity: string | null;
  space_complexity: string | null;
  created_at: string;
}

export interface DbTestCase {
  id: string;
  user_id: string;
  problem_id: string;
  content: string;
  created_at: string;
}

// ── Auth ──────────────────────────────────────────────────

export async function loginOrCreateUser(username: string): Promise<DbUser> {
  // Try to find existing user
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .maybeSingle();

  if (existing) return existing as DbUser;

  // Create new user
  const { data: created, error } = await supabase
    .from('users')
    .insert({ username })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return created as DbUser;
}

// ── Problems ──────────────────────────────────────────────

export async function fetchProblems(userId: string): Promise<DbProblem[]> {
  const { data, error } = await supabase
    .from('problems')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as DbProblem[];
}

export async function createProblem(userId: string, title: string, code: string): Promise<DbProblem> {
  const { data, error } = await supabase
    .from('problems')
    .insert({ user_id: userId, title, code })
    .select()
    .single();

  if (error) throw error;
  return data as DbProblem;
}

export async function updateProblem(id: string, updates: Partial<Pick<DbProblem, 'title' | 'code'>>): Promise<DbProblem | null> {
  const { data, error } = await supabase
    .from('problems')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as DbProblem;
}

export async function deleteProblem(id: string): Promise<void> {
  const { error } = await supabase.from('problems').delete().eq('id', id);
  if (error) throw error;
}

// ── Analyses ──────────────────────────────────────────────

export async function fetchAnalysis(problemId: string): Promise<DbAnalysis | null> {
  const { data } = await supabase
    .from('analyses')
    .select('*')
    .eq('problem_id', problemId)
    .maybeSingle();

  return data as DbAnalysis | null;
}

export async function upsertAnalysis(userId: string, problemId: string, analysis: {
  algorithm?: string; time_complexity?: string; space_complexity?: string; summary?: string; optimizations?: string[];
}): Promise<DbAnalysis> {
  // Check for existing
  const existing = await fetchAnalysis(problemId);
  if (existing) {
    const { data, error } = await supabase
      .from('analyses')
      .update({ ...analysis })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as DbAnalysis;
  }

  const { data, error } = await supabase
    .from('analyses')
    .insert({ user_id: userId, problem_id: problemId, ...analysis })
    .select()
    .single();
  if (error) throw error;
  return data as DbAnalysis;
}

// ── Hints ─────────────────────────────────────────────────

export async function fetchHints(problemId: string): Promise<DbHint[]> {
  const { data } = await supabase
    .from('hints')
    .select('*')
    .eq('problem_id', problemId)
    .order('hint_level', { ascending: true });

  return (data ?? []) as DbHint[];
}

export async function insertHint(userId: string, problemId: string, hintLevel: number, hintText: string): Promise<DbHint> {
  const { data, error } = await supabase
    .from('hints')
    .insert({ user_id: userId, problem_id: problemId, hint_level: hintLevel, hint_text: hintText })
    .select()
    .single();
  if (error) throw error;
  return data as DbHint;
}

// ── Solutions ─────────────────────────────────────────────

export async function fetchSolutions(problemId: string): Promise<DbSolution[]> {
  const { data } = await supabase
    .from('solutions')
    .select('*')
    .eq('problem_id', problemId);

  return (data ?? []) as DbSolution[];
}

export async function upsertSolution(userId: string, problemId: string, sol: {
  solution_type: string; solution_code: string; explanation?: string; time_complexity?: string; space_complexity?: string;
}): Promise<DbSolution> {
  const { data: existing } = await supabase
    .from('solutions')
    .select('*')
    .eq('problem_id', problemId)
    .eq('solution_type', sol.solution_type)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('solutions')
      .update(sol)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as DbSolution;
  }

  const { data, error } = await supabase
    .from('solutions')
    .insert({ user_id: userId, problem_id: problemId, ...sol })
    .select()
    .single();
  if (error) throw error;
  return data as DbSolution;
}

// ── Test Cases ────────────────────────────────────────────

export async function fetchTestCases(problemId: string): Promise<DbTestCase[]> {
  const { data } = await supabase
    .from('test_cases')
    .select('*')
    .eq('problem_id', problemId);

  return (data ?? []) as DbTestCase[];
}

export async function insertTestCase(userId: string, problemId: string, content: string): Promise<DbTestCase> {
  const { data, error } = await supabase
    .from('test_cases')
    .insert({ user_id: userId, problem_id: problemId, content })
    .select()
    .single();
  if (error) throw error;
  return data as DbTestCase;
}

export const DEFAULT_CODE = `import java.util.*;

public class Main {
    public static void main(String[] args) {
        // Write your DSA solution here
        System.out.println("Hello, DSA!");
    }
}
`;
