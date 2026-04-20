/**
 * Unified problem progress hook.
 * Single source of truth for solved/attempted/revision state across
 * Striver, NeetCode, LeetCode 150, Custom, and Contest modules.
 *
 * Backed by TanStack Query so any module that updates progress
 * automatically refreshes every other module reading the same key.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/lib/user-context';

export interface ProblemProgress {
  problem_key: string;
  status: string;
  solved: boolean;
  marked_for_revision: boolean;
  attempts: number;
  last_attempted: string | null;
  solved_at: string | null;
}

const QUERY_KEY = ['problem-progress'] as const;

export function useProblemProgress() {
  const { authUser } = useUser();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: [...QUERY_KEY, authUser?.id],
    queryFn: async (): Promise<Record<string, ProblemProgress>> => {
      if (!authUser?.id) return {};
      const { data, error } = await supabase
        .from('user_problem_progress')
        .select('problem_key, status, solved, marked_for_revision, attempts, last_attempted, solved_at')
        .eq('user_id', authUser.id);
      if (error) throw error;
      const map: Record<string, ProblemProgress> = {};
      for (const row of data || []) {
        map[row.problem_key] = row as ProblemProgress;
      }
      return map;
    },
    enabled: !!authUser?.id,
    staleTime: 30_000,
  });

  const upsert = useMutation({
    mutationFn: async (payload: {
      problem_key: string;
      solved?: boolean;
      marked_for_revision?: boolean;
      attempts?: number;
    }) => {
      if (!authUser?.id) throw new Error('Not authenticated');
      const { error } = await supabase.from('user_problem_progress').upsert(
        {
          user_id: authUser.id,
          problem_key: payload.problem_key,
          status: payload.solved ? 'solved' : 'attempted',
          solved: payload.solved ?? false,
          marked_for_revision: payload.marked_for_revision ?? false,
          attempts: payload.attempts ?? 1,
          last_attempted: new Date().toISOString(),
          solved_at: payload.solved ? new Date().toISOString() : null,
        },
        { onConflict: 'user_id,problem_key' }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return {
    progress: query.data ?? {},
    isLoading: query.isLoading,
    refetch: query.refetch,
    upsert: upsert.mutateAsync,
    isSolved: (key: string) => !!query.data?.[key]?.solved,
    isMarkedForRevision: (key: string) => !!query.data?.[key]?.marked_for_revision,
  };
}
