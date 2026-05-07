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
              <Card className="border-border bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <div className="p-1 rounded-md bg-primary/10">
                        <TrendingUp className="h-4 w-4 text-primary" />
                      </div>
                      Activity (Last 14 Days)
                    </CardTitle>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <span className="text-[10px] text-muted-foreground font-bold uppercase">Solves</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-1.5 sm:gap-3 h-32 pt-6 px-1">
                    {stats.recentActivity.map((day, i) => {
                      const barHeight = Math.max(4, (day.count / maxActivity) * 100);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full">
                          <div className="relative w-full flex-1 flex flex-col justify-end">
                            {/* Tooltip */}
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-20">
                              <div className="bg-primary text-primary-foreground text-[10px] font-black px-2 py-1 rounded-lg shadow-xl whitespace-nowrap">
                                {day.count} Solves
                              </div>
                              <div className="w-1.5 h-1.5 bg-primary rotate-45 mx-auto -mt-1" />
                            </div>
                            
                            {/* Bar */}
                            <div 
                              className="w-full rounded-t-lg bg-gradient-to-t from-primary/40 to-primary hover:from-primary/60 hover:to-primary hover:shadow-[0_0_15px_rgba(var(--primary),0.4)] transition-all duration-300 relative group-hover:scale-x-105 origin-bottom"
                              style={{ 
                                height: `${barHeight}%`,
                                transitionDelay: `${i * 30}ms`
                              }}
                            >
                              {day.count > 0 && (
                                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/40" />
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-center">
                            <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter">
                              {day.date.split(',')[0]}
                            </span>
                            <span className="text-[7px] text-muted-foreground/30 font-medium">
                              {day.date.split(' ')[2]}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="text-sm">By Topic</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(stats.topicCounts).length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">No problem data yet</p>
                    ) : Object.entries(stats.topicCounts).sort((a, b) => b[1] - a[1]).map(([topic, count]) => (
                      <div key={topic} className="flex items-center gap-3 group">
                        <span className="w-24 text-[11px] font-bold capitalize text-muted-foreground truncate group-hover:text-primary transition-colors">{topic}</span>
                        <div className="flex-1 rounded-full bg-secondary/30 h-2.5 overflow-hidden border border-white/5">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-500" 
                            style={{ width: `${stats.totalProblems ? (count / stats.totalProblems) * 100 : 0}%` }} 
                          />
                        </div>
                        <span className="text-[11px] font-black w-8 text-right text-foreground">{count}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-sm">By Difficulty</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { name: 'easy', color: 'bg-emerald-500', from: 'from-emerald-500/60', to: 'to-emerald-500' },
                      { name: 'medium', color: 'bg-amber-500', from: 'from-amber-500/60', to: 'to-amber-500' },
                      { name: 'hard', color: 'bg-red-500', from: 'from-red-500/60', to: 'to-red-500' },
                    ].map(({ name, color, from, to }) => {
                      const count = stats.difficultyCounts[name] || 0;
                      return (
                        <div key={name} className="flex items-center gap-3 group">
                          <span className="w-16 text-[11px] font-bold capitalize text-muted-foreground group-hover:text-foreground transition-colors">{name}</span>
                          <div className="flex-1 rounded-full bg-secondary/30 h-2.5 overflow-hidden border border-white/5">
                            <div 
                              className={`h-full rounded-full bg-gradient-to-r ${from} ${to} transition-all duration-500 shadow-[0_0_8px_rgba(0,0,0,0.2)]`} 
                              style={{ width: `${stats.totalProblems ? (count / stats.totalProblems) * 100 : 0}%` }} 
                            />
                          </div>
                          <span className="text-[11px] font-black w-8 text-right text-foreground">{count}</span>
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
