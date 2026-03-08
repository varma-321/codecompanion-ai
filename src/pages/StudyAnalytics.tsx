import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, BookOpen, Clock, Target, Trophy, TrendingUp, Flame, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';
import { STRIVER_ROADMAP } from '@/lib/striver-roadmap-data';
import { NEETCODE_ROADMAP } from '@/lib/neetcode-roadmap-data';
import { LEETCODE_TOP150_ROADMAP } from '@/lib/leetcode-top150-data';

interface Stats {
  totalProblems: number;
  solvedProblems: number;
  totalTimeMinutes: number;
  topicCounts: Record<string, number>;
  difficultyCounts: Record<string, number>;
  algorithmsLearned: number;
  recentActivity: { date: string; count: number }[];
  streak: number;
  contestsPlayed: number;
  avgAttemptsPerProblem: number;
}

const StudyAnalytics = () => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUser) return;
    const load = async () => {
      setLoading(true);
      const [problemsRes, learningRes, progressRes, contestRes] = await Promise.all([
        supabase.from('problems').select('*').eq('user_id', authUser.id),
        supabase.from('learning_history').select('*').eq('user_id', authUser.id),
        supabase.from('user_problem_progress').select('*').eq('user_id', authUser.id),
        supabase.from('contest_results').select('*').eq('user_id', authUser.id),
      ]);

      const problems = (problemsRes.data || []) as any[];
      const learning = (learningRes.data || []) as any[];
      const progressData = (progressRes.data || []) as any[];
      const contests = (contestRes.data || []) as any[];

      const topicCounts: Record<string, number> = {};
      const difficultyCounts: Record<string, number> = {};
      let totalTime = 0;
      let solved = 0;

      problems.forEach(p => {
        topicCounts[p.topic || 'general'] = (topicCounts[p.topic || 'general'] || 0) + 1;
        difficultyCounts[p.difficulty || 'medium'] = (difficultyCounts[p.difficulty || 'medium'] || 0) + 1;
        totalTime += p.time_spent_seconds || 0;
        if (p.solved) solved++;
      });

      // Streak from progress data
      const dates = progressData.filter((p: any) => p.last_attempted)
        .map((p: any) => new Date(p.last_attempted).toDateString());
      const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < uniqueDates.length; i++) {
        const expected = new Date(today); expected.setDate(expected.getDate() - i);
        if (uniqueDates[i] === expected.toDateString()) streak++; else break;
      }

      const totalAttempts = progressData.reduce((s: number, p: any) => s + (p.attempts || 0), 0);
      const solvedFromProgress = progressData.filter((p: any) => p.solved).length;

      const recentActivity: { date: string; count: number }[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const count = progressData.filter((p: any) => p.last_attempted?.startsWith(dateStr)).length;
        recentActivity.push({ date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), count });
      }

      setStats({
        totalProblems: problems.length,
        solvedProblems: Math.max(solved, solvedFromProgress),
        totalTimeMinutes: Math.round(totalTime / 60),
        topicCounts,
        difficultyCounts,
        algorithmsLearned: learning.filter(l => l.completed).length,
        recentActivity,
        streak,
        contestsPlayed: contests.length,
        avgAttemptsPerProblem: solvedFromProgress > 0 ? Math.round(totalAttempts / solvedFromProgress * 10) / 10 : 0,
      });
      setLoading(false);
    };
    load();
  }, [authUser]);

  const maxActivity = Math.max(...(stats?.recentActivity.map(a => a.count) || [1]), 1);

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-panel-border bg-ide-toolbar px-4 py-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-7 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back
        </Button>
        <BarChart3 className="h-4 w-4 text-primary" />
        <span className="text-sm font-bold">Study Analytics</span>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">Loading analytics...</div>
          ) : stats ? (
            <>
              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                {[
                  { label: 'Problems', value: stats.totalProblems, icon: <Target className="h-4 w-4 text-muted-foreground" /> },
                  { label: 'Solved', value: stats.solvedProblems, icon: <Trophy className="h-4 w-4 text-emerald-500" /> },
                  { label: 'Time Spent', value: `${stats.totalTimeMinutes}m`, icon: <Clock className="h-4 w-4 text-muted-foreground" /> },
                  { label: 'Streak', value: `${stats.streak}d`, icon: <Flame className="h-4 w-4 text-orange-500" /> },
                  { label: 'Contests', value: stats.contestsPlayed, icon: <Trophy className="h-4 w-4 text-amber-500" /> },
                ].map(s => (
                  <Card key={s.label}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-center justify-between mb-1">{s.icon}</div>
                      <div className="text-2xl font-bold text-foreground">{s.value}</div>
                      <div className="text-[10px] text-muted-foreground">{s.label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Activity chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm"><TrendingUp className="h-4 w-4" /> 14-Day Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2 h-28">
                    {stats.recentActivity.map((day, i) => (
                      <div key={i} className="flex flex-1 flex-col items-center gap-1 group relative">
                        <div className="w-full rounded-t bg-primary/70 hover:bg-primary transition-all min-h-[2px]" style={{ height: `${Math.max(2, (day.count / maxActivity) * 100)}%` }} />
                        <span className="text-[8px] text-muted-foreground">{day.date.split(',')[0]}</span>
                        <div className="hidden group-hover:block absolute -top-6 bg-popover border border-border rounded px-1.5 py-0.5 text-[9px] z-10">{day.count}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="text-sm">By Topic</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(stats.topicCounts).length === 0 ? (
                      <p className="text-xs text-muted-foreground">No data yet</p>
                    ) : Object.entries(stats.topicCounts).sort((a, b) => b[1] - a[1]).map(([topic, count]) => (
                      <div key={topic} className="flex items-center gap-2">
                        <span className="w-24 text-xs capitalize text-muted-foreground truncate">{topic}</span>
                        <div className="flex-1 rounded-full bg-secondary h-2">
                          <div className="h-2 rounded-full bg-primary/70 transition-all" style={{ width: `${(count / stats.totalProblems) * 100}%` }} />
                        </div>
                        <span className="text-xs font-bold w-6 text-right">{count}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-sm">By Difficulty</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { name: 'easy', color: 'bg-emerald-500' },
                      { name: 'medium', color: 'bg-amber-500' },
                      { name: 'hard', color: 'bg-red-500' },
                    ].map(({ name, color }) => {
                      const count = stats.difficultyCounts[name] || 0;
                      return (
                        <div key={name} className="flex items-center gap-2">
                          <span className="w-16 text-xs capitalize text-muted-foreground">{name}</span>
                          <div className="flex-1 rounded-full bg-secondary h-2">
                            <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${stats.totalProblems ? (count / stats.totalProblems) * 100 : 0}%` }} />
                          </div>
                          <span className="text-xs font-bold w-6 text-right">{count}</span>
                        </div>
                      );
                    })}
                    {stats.avgAttemptsPerProblem > 0 && (
                      <div className="pt-2 border-t border-panel-border">
                        <p className="text-xs text-muted-foreground">Avg attempts per solved problem: <span className="font-bold text-foreground">{stats.avgAttemptsPerProblem}</span></p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-muted-foreground">No data available</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudyAnalytics;
