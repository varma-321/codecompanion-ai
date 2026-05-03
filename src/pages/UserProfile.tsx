import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { Trophy, Flame, Target, Calendar, Code2, TrendingUp, Award, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';
import { STRIVER_ROADMAP } from '@/lib/striver-roadmap-data';
import { NEETCODE_ROADMAP } from '@/lib/neetcode-roadmap-data';
import { LEETCODE_TOP150_ROADMAP } from '@/lib/leetcode-top150-data';
import AppShell from '@/components/AppShell';

const ALL_ROADMAPS = [...STRIVER_ROADMAP, ...NEETCODE_ROADMAP, ...LEETCODE_TOP150_ROADMAP];
const ALL_PROBLEMS = ALL_ROADMAPS.flatMap(t => t.problems.map(p => ({ ...p, topic: t.name })));

const UserProfile = () => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ username: string; created_at: string; display_id?: number } | null>(null);
  const [progress, setProgress] = useState<any[]>([]);
  const [execHistory, setExecHistory] = useState<any[]>([]);
  const [contestResults, setContestResults] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);

  useEffect(() => {
    if (!authUser) return;
    (async () => {
      const [profileRes, progressRes, execRes, contestRes, achieveRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle(),
        supabase.from('user_problem_progress').select('*').eq('user_id', authUser.id),
        supabase.from('execution_history').select('*').eq('user_id', authUser.id),
        supabase.from('contest_results').select('*').eq('user_id', authUser.id),
        supabase.from('user_achievements').select('*').eq('user_id', authUser.id),
      ]);
      setProfile(profileRes.data as any);
      setProgress(progressRes.data || []);
      setExecHistory(execRes.data || []);
      setContestResults(contestRes.data || []);
      setAchievements(achieveRes.data || []);
      setLoading(false);
    })();
  }, [authUser]);

  const stats = useMemo(() => {
    const solved = progress.filter(p => p.solved).length;
    const attempted = progress.filter(p => p.attempts > 0).length;
    const totalSubmissions = execHistory.length;
    const acceptedSubmissions = execHistory.filter(e => e.passed).length;
    const acceptanceRate = totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : 0;

    const solvedKeys = new Set(progress.filter(p => p.solved).map(p => p.problem_key));
    const difficultyMap: Record<string, number> = { Easy: 0, Medium: 0, Hard: 0 };
    ALL_PROBLEMS.forEach(p => { if (solvedKeys.has(p.key)) { const d = p.difficulty || 'Medium'; difficultyMap[d] = (difficultyMap[d] || 0) + 1; } });

    const topicMap: Record<string, number> = {};
    ALL_PROBLEMS.forEach(p => { if (solvedKeys.has(p.key)) topicMap[p.topic] = (topicMap[p.topic] || 0) + 1; });
    const topTopics = Object.entries(topicMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

    const solvedDates = progress.filter(p => p.solved && p.solved_at).map(p => new Date(p.solved_at).toDateString());
    const uniqueDates = [...new Set(solvedDates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < uniqueDates.length; i++) {
      const d = new Date(uniqueDates[i]);
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      if (d.toDateString() === expected.toDateString()) streak++; else break;
    }

    const totalContests = contestResults.length;
    const memberSince = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';
    return { solved, attempted, totalSubmissions, acceptanceRate, difficultyMap, topTopics, streak, totalContests, memberSince };
  }, [progress, execHistory, contestResults, profile]);

  if (!authUser) {
    return (
      <AppShell title="Profile">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="surface p-8 text-center max-w-sm">
            <p className="text-sm text-muted-foreground">Please sign in to view your profile.</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell title="Profile">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <div className="surface h-32 animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map(i => <div key={i} className="surface h-24 animate-pulse" />)}
          </div>
        </div>
      </AppShell>
    );
  }

  const username = profile?.username || authUser.email?.split('@')[0] || 'You';
  const initials = username.slice(0, 2).toUpperCase();

  return (
    <AppShell title="Profile" subtitle={`Member since ${stats.memberSince}`}>
      <div className="max-w-5xl mx-auto p-6 space-y-8 animate-in-up">
        {/* Hero card */}
        <section className="surface-elevated p-8 rounded-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="h-20 w-20 rounded-2xl bg-foreground text-background flex items-center justify-center text-2xl font-semibold shrink-0 shadow-md">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">{username}</h1>
                <Badge variant="outline" className="text-[10px] font-mono border-primary/20 text-primary">
                  ID: {profile?.display_id || '...'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{authUser.email}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="secondary" className="text-[11px] gap-1 font-normal"><Flame className="h-3 w-3" />{stats.streak} day streak</Badge>
                <Badge variant="secondary" className="text-[11px] gap-1 font-normal"><Award className="h-3 w-3" />{achievements.length} badges</Badge>
                <Badge variant="secondary" className="text-[11px] gap-1 font-normal"><Trophy className="h-3 w-3" />{stats.totalContests} contests</Badge>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-stagger">
          {[
            { label: 'Solved', value: stats.solved, icon: Target },
            { label: 'Submissions', value: stats.totalSubmissions, icon: Code2 },
            { label: 'Acceptance', value: `${stats.acceptanceRate}%`, icon: TrendingUp },
            { label: 'Contests', value: stats.totalContests, icon: Trophy },
          ].map(s => (
            <div key={s.label} className="surface p-5 rounded-xl">
              <s.icon className="h-4 w-4 text-muted-foreground mb-3" />
              <div className="text-2xl font-semibold tabular-nums tracking-tight">{s.value}</div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider mt-1 font-medium">{s.label}</div>
            </div>
          ))}
        </section>

        {/* Difficulty */}
        <section className="surface p-6 rounded-xl">
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-5">Solved by difficulty</h2>
          <div className="space-y-4">
            {(['Easy', 'Medium', 'Hard'] as const).map(d => {
              const count = stats.difficultyMap[d] || 0;
              const total = ALL_PROBLEMS.filter(p => p.difficulty === d).length || 1;
              const pct = (count / total) * 100;
              return (
                <div key={d} className="space-y-2">
                  <div className="flex justify-between items-baseline text-[13px]">
                    <span className="font-medium">{d}</span>
                    <span className="text-muted-foreground tabular-nums">{count} <span className="text-muted-foreground/60">/ {total}</span></span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-foreground rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Top topics */}
        <section className="surface p-6 rounded-xl">
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-4">Top topics</h2>
          {stats.topTopics.length === 0 ? (
            <p className="text-sm text-muted-foreground">Solve problems to discover your strengths.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {stats.topTopics.map(([topic, count]) => (
                <Badge key={topic} variant="outline" className="text-[12px] font-normal py-1 px-2.5">
                  {topic} <span className="ml-1.5 text-muted-foreground tabular-nums">{count}</span>
                </Badge>
              ))}
            </div>
          )}
        </section>

        {/* Quick links */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-stagger">
          {[
            { label: 'Submission History', route: '/submissions', icon: Code2 },
            { label: 'Achievements', route: '/achievements', icon: Award },
            { label: 'Activity Calendar', route: '/streak-calendar', icon: Calendar },
          ].map(l => (
            <button
              key={l.label}
              onClick={() => navigate(l.route)}
              className="card-interactive group rounded-xl border border-border bg-card p-4 flex items-center gap-3 text-left"
            >
              <l.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-[13px] font-medium flex-1">{l.label}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground -translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </button>
          ))}
        </section>
      </div>
    </AppShell>
  );
};

export default UserProfile;
