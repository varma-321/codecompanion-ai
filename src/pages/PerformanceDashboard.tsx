import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Target, Trophy, Brain, TrendingUp, Clock, Activity, Zap, BookOpen, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';
import { STRIVER_ROADMAP, getTotalProblems } from '@/lib/striver-roadmap-data';
import { NEETCODE_ROADMAP, getNeetcodeTotalProblems } from '@/lib/neetcode-roadmap-data';
import { LEETCODE_TOP150_ROADMAP, getLeetcodeTop150TotalProblems } from '@/lib/leetcode-top150-data';
import AppShell from '@/components/AppShell';

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
        const existing = topicMap.get(topic.name) || { total: 0, solved: 0 };
        existing.total++;
        if (progressData.find(pr => pr.problem_key === p.key && pr.solved)) existing.solved++;
        topicMap.set(topic.name, existing);
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

  if (loading) {
    return (
      <AppShell title="Performance">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="surface h-24 animate-pulse" />)}
          </div>
        </div>
      </AppShell>
    );
  }

  const overallPct = totalProblems > 0 ? (stats.totalSolved / totalProblems) * 100 : 0;

  const heroCards = [
    { label: 'Solved', value: stats.totalSolved, icon: Trophy },
    { label: 'Today', value: stats.todaySolved, icon: Zap },
    { label: 'Streak', value: `${stats.streak}d`, icon: Flame },
    { label: 'Pass rate', value: `${stats.passRate}%`, icon: Target },
    { label: 'Contests', value: stats.contestsPlayed, icon: Activity },
    { label: 'Avg tries', value: stats.avgAttempts, icon: TrendingUp },
  ];

  return (
    <AppShell title="Performance" subtitle="A calm overview of your practice">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10 animate-in-up">
        {/* Hero stats */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 animate-stagger">
          {heroCards.map(s => (
            <div key={s.label} className="surface p-4 rounded-xl">
              <s.icon className="h-4 w-4 text-muted-foreground mb-3" />
              <div className="text-2xl font-semibold tabular-nums tracking-tight">{s.value}</div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider mt-1 font-medium">{s.label}</div>
            </div>
          ))}
        </section>

        {/* Overall progress */}
        <section className="surface-elevated p-6 rounded-2xl">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <div className="text-xs uppercase tracking-[0.08em] text-muted-foreground font-semibold">Overall progress</div>
              <div className="text-3xl font-semibold tabular-nums tracking-tight mt-1">{stats.totalSolved}<span className="text-muted-foreground text-lg font-normal"> / {totalProblems}</span></div>
            </div>
            <div className="text-2xl font-semibold tabular-nums tracking-tight text-muted-foreground">{Math.round(overallPct)}%</div>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-foreground rounded-full transition-all duration-700" style={{ width: `${overallPct}%` }} />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Weekly */}
          <section className="surface p-6 rounded-xl">
            <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-5 flex items-center gap-2"><Activity className="h-3.5 w-3.5" /> This week</h3>
            <div className="flex items-end gap-2 h-28">
              {stats.weekActivity.map((d, i) => {
                const max = Math.max(...stats.weekActivity.map(x => x.count), 1);
                const h = (d.count / max) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full flex items-end h-full">
                      <div className="w-full bg-foreground rounded-md transition-all duration-500" style={{ height: `${Math.max(h, 4)}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{d.day}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Difficulty */}
          <section className="surface p-6 rounded-xl">
            <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-5 flex items-center gap-2"><Target className="h-3.5 w-3.5" /> By difficulty</h3>
            <div className="space-y-4">
              {Object.entries(stats.diffMap).map(([diff, v]) => {
                const pct = v.total > 0 ? (v.solved / v.total) * 100 : 0;
                return (
                  <div key={diff} className="space-y-2">
                    <div className="flex justify-between items-baseline text-[13px]">
                      <span className="font-medium">{diff}</span>
                      <span className="text-muted-foreground tabular-nums">{v.solved} <span className="text-muted-foreground/60">/ {v.total}</span></span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-foreground rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Weak topics */}
          <section className="surface p-6 rounded-xl">
            <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-4 flex items-center gap-2"><AlertTriangle className="h-3.5 w-3.5" /> Weak topics</h3>
            {stats.weakTopics.length === 0 ? (
              <p className="text-sm text-muted-foreground">No weak topics — keep going.</p>
            ) : (
              <div className="space-y-2.5">
                {stats.weakTopics.map(([topic, v]) => (
                  <div key={topic} className="flex items-center justify-between gap-3">
                    <span className="text-[13px] truncate">{topic}</span>
                    <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">{Math.round(v.solved / v.total * 100)}%</span>
                  </div>
                ))}
              </div>
            )}
            <Button variant="ghost" size="sm" className="mt-4 w-full text-[12px] h-8 justify-between" onClick={() => navigate('/weak-topics')}>
              View full analysis <ArrowRight className="h-3 w-3" />
            </Button>
          </section>

          {/* Quick actions */}
          <section className="surface p-6 rounded-xl">
            <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-4 flex items-center gap-2"><Zap className="h-3.5 w-3.5" /> Quick actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Study Planner', icon: Clock, route: '/study-planner' },
                { label: 'Weak Topics', icon: AlertTriangle, route: '/weak-topics' },
                { label: 'Complexity', icon: Activity, route: '/complexity' },
                { label: 'Contest', icon: Trophy, route: '/contest' },
                { label: 'Learning Path', icon: Brain, route: '/learning-path' },
                { label: 'Spaced Review', icon: BookOpen, route: '/spaced-repetition' },
              ].map(a => (
                <button
                  key={a.label}
                  onClick={() => navigate(a.route)}
                  className="card-interactive group flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-left text-[12px] font-medium"
                >
                  <a.icon className="h-3.5 w-3.5 text-muted-foreground" /> {a.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
};

export default PerformanceDashboard;
