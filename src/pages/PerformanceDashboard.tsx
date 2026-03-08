import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Flame, Target, Trophy, Brain, TrendingUp, Clock, Activity, Zap, BarChart3, BookOpen, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';
import { STRIVER_ROADMAP, getTotalProblems } from '@/lib/striver-roadmap-data';
import { NEETCODE_ROADMAP, getNeetcodeTotalProblems } from '@/lib/neetcode-roadmap-data';
import { LEETCODE_TOP150_ROADMAP, getLeetcodeTop150TotalProblems } from '@/lib/leetcode-top150-data';

const ALL_ROADMAPS = [...STRIVER_ROADMAP, ...NEETCODE_ROADMAP, ...LEETCODE_TOP150_ROADMAP];

const PerformanceDashboard = () => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState<any[]>([]);
  const [execHistory, setExecHistory] = useState<any[]>([]);
  const [contestResults, setContestResults] = useState<any[]>([]);
  const [learningHistory, setLearningHistory] = useState<any[]>([]);

  const totalProblems = getTotalProblems() + getNeetcodeTotalProblems() + getLeetcodeTop150TotalProblems();

  useEffect(() => {
    if (!authUser) { setLoading(false); return; }
    Promise.all([
      supabase.from('user_problem_progress').select('*').eq('user_id', authUser.id),
      supabase.from('execution_history').select('*').eq('user_id', authUser.id),
      supabase.from('contest_results').select('*').eq('user_id', authUser.id),
      supabase.from('learning_history').select('*').eq('user_id', authUser.id),
    ]).then(([prog, exec, contest, learn]) => {
      setProgressData(prog.data || []);
      setExecHistory(exec.data || []);
      setContestResults(contest.data || []);
      setLearningHistory(learn.data || []);
      setLoading(false);
    });
  }, [authUser]);

  const stats = useMemo(() => {
    const solved = progressData.filter(p => p.solved);
    const attempted = progressData.filter(p => p.attempts > 0);
    const revision = progressData.filter(p => p.marked_for_revision);

    // Streak
    const dates = solved.filter(p => p.last_attempted).map(p => new Date(p.last_attempted).toDateString());
    const unique = [...new Set(dates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < unique.length; i++) {
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      if (unique[i] === expected.toDateString()) streak++; else break;
    }

    // Weekly activity
    const weekActivity: { day: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toDateString();
      const count = solved.filter(p => p.last_attempted && new Date(p.last_attempted).toDateString() === ds).length;
      weekActivity.push({ day: d.toLocaleDateString('en', { weekday: 'short' }), count });
    }

    // Topic breakdown
    const topicMap = new Map<string, { total: number; solved: number }>();
    ALL_ROADMAPS.forEach(topic => {
      topic.problems.forEach(p => {
        const existing = topicMap.get(topic.topic) || { total: 0, solved: 0 };
        existing.total++;
        if (progressData.find(pr => pr.problem_key === p.key && pr.solved)) existing.solved++;
        topicMap.set(topic.topic, existing);
      });
    });
    const weakTopics = [...topicMap.entries()]
      .filter(([, v]) => v.total >= 3 && v.solved / v.total < 0.3)
      .sort((a, b) => a[1].solved / a[1].total - b[1].solved / b[1].total)
      .slice(0, 5);

    // Difficulty breakdown
    const diffMap: Record<string, { total: number; solved: number }> = { Easy: { total: 0, solved: 0 }, Medium: { total: 0, solved: 0 }, Hard: { total: 0, solved: 0 } };
    ALL_ROADMAPS.forEach(t => t.problems.forEach(p => {
      if (diffMap[p.difficulty]) {
        diffMap[p.difficulty].total++;
        if (progressData.find(pr => pr.problem_key === p.key && pr.solved)) diffMap[p.difficulty].solved++;
      }
    }));

    // Avg pass rate
    const passRate = execHistory.length > 0 ? Math.round(execHistory.filter(e => e.passed).length / execHistory.length * 100) : 0;

    // Today solved
    const todayStr = new Date().toDateString();
    const todaySolved = solved.filter(p => p.last_attempted && new Date(p.last_attempted).toDateString() === todayStr).length;

    return {
      totalSolved: solved.length, totalAttempted: attempted.length, streak, revision: revision.length,
      weekActivity, weakTopics, diffMap, passRate, todaySolved,
      contestsPlayed: contestResults.length, algorithmsLearned: learningHistory.filter(l => l.completed).length,
      avgAttempts: attempted.length > 0 ? (attempted.reduce((a, p) => a + p.attempts, 0) / attempted.length).toFixed(1) : '0',
    };
  }, [progressData, execHistory, contestResults, learningHistory]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-background"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border bg-card px-5 py-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-8 gap-1.5 text-xs font-medium rounded-lg">
          <ArrowLeft className="h-3.5 w-3.5" /> Modules
        </Button>
        <div className="h-4 w-px bg-border" />
        <BarChart3 className="h-4 w-4 text-foreground" />
        <span className="text-sm font-semibold tracking-tight">Performance Dashboard</span>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
          {/* Hero Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { label: 'Solved', value: stats.totalSolved, icon: <Trophy className="h-4 w-4" />, color: 'text-primary' },
              { label: 'Today', value: stats.todaySolved, icon: <Zap className="h-4 w-4" />, color: 'text-warning' },
              { label: 'Streak', value: `${stats.streak}d`, icon: <Flame className="h-4 w-4" />, color: 'text-destructive' },
              { label: 'Pass Rate', value: `${stats.passRate}%`, icon: <Target className="h-4 w-4" />, color: 'text-success' },
              { label: 'Contests', value: stats.contestsPlayed, icon: <Activity className="h-4 w-4" />, color: 'text-primary' },
              { label: 'Avg Tries', value: stats.avgAttempts, icon: <TrendingUp className="h-4 w-4" />, color: 'text-muted-foreground' },
            ].map(s => (
              <Card key={s.label} className="border-border">
                <CardContent className="p-4 text-center">
                  <div className={`${s.color} mx-auto mb-1`}>{s.icon}</div>
                  <p className="text-2xl font-bold tabular-nums text-foreground">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Overall Progress</span>
              <span>{stats.totalSolved} / {totalProblems} ({Math.round(stats.totalSolved / totalProblems * 100)}%)</span>
            </div>
            <Progress value={stats.totalSolved / totalProblems * 100} className="h-2" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Activity */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2"><Activity className="h-4 w-4" /> This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 h-24">
                  {stats.weekActivity.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-primary/20 rounded-t" style={{ height: `${Math.max(d.count * 20, 4)}px` }}>
                        <div className="w-full h-full bg-primary rounded-t" />
                      </div>
                      <span className="text-[9px] text-muted-foreground">{d.day}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Difficulty Breakdown */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2"><Target className="h-4 w-4" /> By Difficulty</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(stats.diffMap).map(([diff, v]) => (
                  <div key={diff}>
                    <div className="flex justify-between text-xs mb-1">
                      <Badge variant="outline" className={`text-[10px] ${diff === 'Easy' ? 'text-green-500' : diff === 'Medium' ? 'text-yellow-500' : 'text-red-500'}`}>{diff}</Badge>
                      <span className="text-muted-foreground">{v.solved}/{v.total}</span>
                    </div>
                    <Progress value={v.total > 0 ? v.solved / v.total * 100 : 0} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Weak Topics */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Weak Topics</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.weakTopics.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No weak topics detected — keep going!</p>
                ) : (
                  <div className="space-y-2">
                    {stats.weakTopics.map(([topic, v]) => (
                      <div key={topic} className="flex items-center justify-between">
                        <span className="text-xs text-foreground truncate">{topic}</span>
                        <Badge variant="destructive" className="text-[10px]">{Math.round(v.solved / v.total * 100)}%</Badge>
                      </div>
                    ))}
                  </div>
                )}
                <Button variant="outline" size="sm" className="mt-3 w-full text-xs" onClick={() => navigate('/weak-topics')}>
                  View Full Analysis →
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2"><Zap className="h-4 w-4" /> Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Study Planner', icon: <Clock className="h-3.5 w-3.5" />, route: '/study-planner' },
                  { label: 'Weak Topics', icon: <AlertTriangle className="h-3.5 w-3.5" />, route: '/weak-topics' },
                  { label: 'Complexity', icon: <Activity className="h-3.5 w-3.5" />, route: '/complexity' },
                  { label: 'Contest', icon: <Trophy className="h-3.5 w-3.5" />, route: '/contest' },
                  { label: 'Learning Path', icon: <Brain className="h-3.5 w-3.5" />, route: '/learning-path' },
                  { label: 'Spaced Review', icon: <BookOpen className="h-3.5 w-3.5" />, route: '/spaced-repetition' },
                ].map(a => (
                  <Button key={a.label} variant="outline" size="sm" className="h-9 text-xs gap-1.5 justify-start" onClick={() => navigate(a.route)}>
                    {a.icon} {a.label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;
