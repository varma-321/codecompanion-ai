import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileSpreadsheet, Calendar, TrendingUp, BarChart3, PieChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';
import { STRIVER_ROADMAP, getDifficultyBg } from '@/lib/striver-roadmap-data';
import { NEETCODE_ROADMAP } from '@/lib/neetcode-roadmap-data';
import { LEETCODE_TOP150_ROADMAP } from '@/lib/leetcode-top150-data';

const ALL_PROBLEMS = [...STRIVER_ROADMAP, ...NEETCODE_ROADMAP, ...LEETCODE_TOP150_ROADMAP].flatMap(t => t.problems.map(p => ({ ...p, topic: t.name })));
const PROBLEM_MAP = new Map(ALL_PROBLEMS.map(p => [p.key, p]));

const ProgressExport = () => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUser) return;
    supabase.from('user_problem_progress').select('*').eq('user_id', authUser.id)
      .then(({ data }) => { setProgress(data || []); setLoading(false); });
  }, [authUser]);

  const solved = progress.filter(p => p.solved);
  const attempted = progress.filter(p => p.attempts > 0);
  const totalAttempts = progress.reduce((s, p) => s + (p.attempts || 0), 0);

  const byDifficulty = { Easy: 0, Medium: 0, Hard: 0 };
  const byTopic: Record<string, number> = {};
  solved.forEach(p => {
    const prob = PROBLEM_MAP.get(p.problem_key);
    if (prob) {
      byDifficulty[prob.difficulty as keyof typeof byDifficulty]++;
      byTopic[prob.topic || 'Other'] = (byTopic[prob.topic || 'Other'] || 0) + 1;
    }
  });

  // Activity heatmap - last 30 days
  const activityMap: Record<string, number> = {};
  progress.forEach(p => {
    if (p.last_attempted) {
      const date = new Date(p.last_attempted).toISOString().split('T')[0];
      activityMap[date] = (activityMap[date] || 0) + 1;
    }
  });

  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().split('T')[0];
    return { date: key, label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), count: activityMap[key] || 0 };
  });
  const maxActivity = Math.max(...last30Days.map(d => d.count), 1);

  const handleExportCSV = () => {
    const headers = ['Problem', 'Difficulty', 'Topic', 'Status', 'Attempts', 'Last Attempted', 'Solved At'];
    const rows = progress.map(p => {
      const prob = PROBLEM_MAP.get(p.problem_key);
      return [prob?.title || p.problem_key, prob?.difficulty || '', prob?.topic || '', p.solved ? 'Solved' : p.attempts > 0 ? 'Attempted' : 'Not Started', p.attempts, p.last_attempted || '', p.solved_at || ''].join(',');
    });
    download([headers.join(','), ...rows].join('\n'), 'text/csv', 'csv');
  };

  const handleExportJSON = () => {
    const data = progress.map(p => {
      const prob = PROBLEM_MAP.get(p.problem_key);
      return { problem: prob?.title || p.problem_key, difficulty: prob?.difficulty, topic: prob?.topic, status: p.status, attempts: p.attempts, solved: p.solved, solvedAt: p.solved_at, lastAttempted: p.last_attempted };
    });
    download(JSON.stringify(data, null, 2), 'application/json', 'json');
  };

  const download = (content: string, type: string, ext: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `dsa-progress-${new Date().toISOString().split('T')[0]}.${ext}`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!authUser) return <div className="flex h-screen items-center justify-center bg-background"><p className="text-foreground">Please log in</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-panel-border bg-ide-toolbar px-4 py-2 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-7 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back
        </Button>
        <FileSpreadsheet className="h-4 w-4 text-primary" />
        <span className="font-bold text-foreground">Progress & Export</span>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {loading ? (
          <p className="text-muted-foreground text-center py-10">Loading progress...</p>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Solved', value: solved.length, accent: 'text-primary' },
                { label: 'Attempted', value: attempted.length, accent: 'text-foreground' },
                { label: 'Total Runs', value: totalAttempts, accent: 'text-foreground' },
                { label: 'Easy', value: byDifficulty.Easy, accent: 'text-emerald-500' },
                { label: 'Hard', value: byDifficulty.Hard, accent: 'text-red-500' },
              ].map(s => (
                <Card key={s.label}><CardContent className="pt-3 pb-3 text-center">
                  <p className={`text-xl font-bold ${s.accent}`}>{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </CardContent></Card>
              ))}
            </div>

            {/* Progress bar */}
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Overall Completion</span>
                  <span className="font-medium text-foreground">{solved.length}/{ALL_PROBLEMS.length} ({Math.round((solved.length / ALL_PROBLEMS.length) * 100)}%)</span>
                </div>
                <Progress value={(solved.length / ALL_PROBLEMS.length) * 100} className="h-2.5" />
              </CardContent>
            </Card>

            <Tabs defaultValue="activity">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="activity" className="text-xs gap-1"><BarChart3 className="h-3 w-3" /> Activity</TabsTrigger>
                <TabsTrigger value="topics" className="text-xs gap-1"><PieChart className="h-3 w-3" /> By Topic</TabsTrigger>
                <TabsTrigger value="recent" className="text-xs gap-1"><Calendar className="h-3 w-3" /> Recent</TabsTrigger>
              </TabsList>

              <TabsContent value="activity" className="mt-3">
                <Card>
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> 30-Day Activity</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-[3px] h-24">
                      {last30Days.map((day, i) => (
                        <div key={i} className="flex flex-1 flex-col items-center gap-0.5 group relative">
                          <div
                            className="w-full rounded-t bg-primary/70 transition-all hover:bg-primary min-h-[2px]"
                            style={{ height: `${Math.max(2, (day.count / maxActivity) * 100)}%` }}
                          />
                          <div className="hidden group-hover:block absolute -top-8 bg-popover border border-border rounded px-1.5 py-0.5 text-[9px] whitespace-nowrap z-10">
                            {day.label}: {day.count}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                      <span>{last30Days[0].label}</span>
                      <span>{last30Days[29].label}</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="topics" className="mt-3">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Solved by Topic</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(byTopic).sort((a, b) => b[1] - a[1]).map(([topic, count]) => (
                      <div key={topic} className="flex items-center gap-2">
                        <span className="w-32 text-xs text-muted-foreground truncate">{topic}</span>
                        <div className="flex-1 rounded-full bg-secondary h-2">
                          <div className="h-2 rounded-full bg-primary/70 transition-all" style={{ width: `${(count / solved.length) * 100}%` }} />
                        </div>
                        <span className="text-xs font-bold w-6 text-right">{count}</span>
                      </div>
                    ))}
                    {Object.keys(byTopic).length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No data yet</p>}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="recent" className="mt-3">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Recently Solved</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-1 max-h-[350px] overflow-y-auto">
                      {solved.sort((a, b) => new Date(b.solved_at || b.last_attempted).getTime() - new Date(a.solved_at || a.last_attempted).getTime()).slice(0, 30).map(p => {
                        const prob = PROBLEM_MAP.get(p.problem_key);
                        return (
                          <div key={p.id} className="flex items-center justify-between text-xs py-1.5 border-b border-panel-border last:border-0">
                            <span className="text-foreground truncate flex-1">{prob?.title || p.problem_key}</span>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              {prob && <Badge className={`text-[9px] ${getDifficultyBg(prob.difficulty)}`}>{prob.difficulty}</Badge>}
                              <span className="text-muted-foreground text-[10px]">{new Date(p.solved_at || p.last_attempted).toLocaleDateString()}</span>
                            </div>
                          </div>
                        );
                      })}
                      {solved.length === 0 && <p className="text-muted-foreground text-center py-4 text-xs">No solved problems yet</p>}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Export */}
            <div className="flex gap-3">
              <Button onClick={handleExportCSV} className="gap-2 flex-1"><Download className="h-4 w-4" /> Export CSV</Button>
              <Button onClick={handleExportJSON} variant="outline" className="gap-2 flex-1"><Download className="h-4 w-4" /> Export JSON</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProgressExport;
