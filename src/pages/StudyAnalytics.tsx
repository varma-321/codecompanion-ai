import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, BookOpen, Clock, Target, Trophy, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';

interface Stats {
  totalProblems: number;
  solvedProblems: number;
  totalTimeMinutes: number;
  topicCounts: Record<string, number>;
  difficultyCounts: Record<string, number>;
  algorithmsLearned: number;
  recentActivity: { date: string; count: number }[];
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
      try {
        const [problemsRes, learningRes] = await Promise.all([
          supabase.from('problems').select('*').eq('user_id', authUser.id),
          supabase.from('learning_history').select('*').eq('user_id', authUser.id),
        ]);

        const problems = (problemsRes.data || []) as any[];
        const learning = (learningRes.data || []) as any[];

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

        // Recent 7 days activity
        const recentActivity: { date: string; count: number }[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const count = problems.filter(p => p.created_at?.startsWith(dateStr)).length +
                        learning.filter(l => l.created_at?.startsWith(dateStr)).length;
          recentActivity.push({ date: d.toLocaleDateString('en-US', { weekday: 'short' }), count });
        }

        setStats({
          totalProblems: problems.length,
          solvedProblems: solved,
          totalTimeMinutes: Math.round(totalTime / 60),
          topicCounts,
          difficultyCounts,
          algorithmsLearned: learning.filter(l => l.completed).length,
          recentActivity,
        });
      } catch {}
      setLoading(false);
    };

    load();
  }, [authUser]);

  const maxActivity = Math.max(...(stats?.recentActivity.map(a => a.count) || [1]), 1);

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-panel-border bg-ide-toolbar px-4 py-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="h-7 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back to IDE
        </Button>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold">Study Analytics</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">Loading analytics...</div>
          ) : stats ? (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Total Problems</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent><div className="text-2xl font-bold">{stats.totalProblems}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Solved</CardTitle>
                    <Trophy className="h-4 w-4 text-success" />
                  </CardHeader>
                  <CardContent><div className="text-2xl font-bold text-success">{stats.solvedProblems}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Time Spent</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent><div className="text-2xl font-bold">{stats.totalTimeMinutes}m</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Algorithms Learned</CardTitle>
                    <BookOpen className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent><div className="text-2xl font-bold text-primary">{stats.algorithmsLearned}</div></CardContent>
                </Card>
              </div>

              {/* Activity chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm"><TrendingUp className="h-4 w-4" /> 7-Day Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-3 h-32">
                    {stats.recentActivity.map((day, i) => (
                      <div key={i} className="flex flex-1 flex-col items-center gap-1">
                        <div className="w-full rounded-t bg-primary/80 transition-all" style={{ height: `${Math.max(4, (day.count / maxActivity) * 100)}%` }} />
                        <span className="text-[10px] text-muted-foreground">{day.date}</span>
                        <span className="text-[10px] font-bold">{day.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Topics */}
                <Card>
                  <CardHeader><CardTitle className="text-sm">Problems by Topic</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(stats.topicCounts).length === 0 ? (
                        <p className="text-xs text-muted-foreground">No data yet</p>
                      ) : (
                        Object.entries(stats.topicCounts).map(([topic, count]) => (
                          <div key={topic} className="flex items-center gap-2">
                            <span className="w-24 text-xs capitalize text-muted-foreground">{topic}</span>
                            <div className="flex-1 rounded-full bg-secondary h-2">
                              <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${(count / stats.totalProblems) * 100}%` }} />
                            </div>
                            <span className="text-xs font-bold w-6 text-right">{count}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Difficulty */}
                <Card>
                  <CardHeader><CardTitle className="text-sm">By Difficulty</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {['easy', 'medium', 'hard'].map(diff => {
                        const count = stats.difficultyCounts[diff] || 0;
                        const color = diff === 'easy' ? 'bg-success' : diff === 'medium' ? 'bg-warning' : 'bg-destructive';
                        return (
                          <div key={diff} className="flex items-center gap-2">
                            <span className="w-16 text-xs capitalize text-muted-foreground">{diff}</span>
                            <div className="flex-1 rounded-full bg-secondary h-2">
                              <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${stats.totalProblems ? (count / stats.totalProblems) * 100 : 0}%` }} />
                            </div>
                            <span className="text-xs font-bold w-6 text-right">{count}</span>
                          </div>
                        );
                      })}
                    </div>
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
