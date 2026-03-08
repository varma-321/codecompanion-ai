import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, User, Trophy, Flame, Target, Calendar, Code2, TrendingUp, Star, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';
import { STRIVER_ROADMAP } from '@/lib/striver-roadmap-data';
import { NEETCODE_ROADMAP } from '@/lib/neetcode-roadmap-data';
import { LEETCODE_TOP150_ROADMAP } from '@/lib/leetcode-top150-data';

const ALL_ROADMAPS = [...STRIVER_ROADMAP, ...NEETCODE_ROADMAP, ...LEETCODE_TOP150_ROADMAP];
const ALL_PROBLEMS = ALL_ROADMAPS.flatMap(t => t.problems.map(p => ({ ...p, topic: t.name })));

const UserProfile = () => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ username: string; created_at: string } | null>(null);
  const [progress, setProgress] = useState<any[]>([]);
  const [execHistory, setExecHistory] = useState<any[]>([]);
  const [contestResults, setContestResults] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);

  useEffect(() => {
    if (!authUser) return;
    const load = async () => {
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
    };
    load();
  }, [authUser]);

  const stats = useMemo(() => {
    const solved = progress.filter(p => p.solved).length;
    const attempted = progress.filter(p => p.attempts > 0).length;
    const totalSubmissions = execHistory.length;
    const acceptedSubmissions = execHistory.filter(e => e.passed).length;
    const acceptanceRate = totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : 0;

    // Difficulty breakdown
    const solvedKeys = new Set(progress.filter(p => p.solved).map(p => p.problem_key));
    const difficultyMap: Record<string, number> = { Easy: 0, Medium: 0, Hard: 0 };
    ALL_PROBLEMS.forEach(p => {
      if (solvedKeys.has(p.key)) {
        const d = p.difficulty || 'Medium';
        difficultyMap[d] = (difficultyMap[d] || 0) + 1;
      }
    });

    // Topic breakdown (top 8)
    const topicMap: Record<string, number> = {};
    ALL_PROBLEMS.forEach(p => {
      if (solvedKeys.has(p.key)) {
        topicMap[p.topic] = (topicMap[p.topic] || 0) + 1;
      }
    });
    const topTopics = Object.entries(topicMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

    // Streak
    const solvedDates = progress
      .filter(p => p.solved && p.solved_at)
      .map(p => new Date(p.solved_at).toDateString());
    const uniqueDates = [...new Set(solvedDates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < uniqueDates.length; i++) {
      const d = new Date(uniqueDates[i]);
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      if (d.toDateString() === expected.toDateString()) streak++;
      else break;
    }

    // Contest stats
    const totalContests = contestResults.length;
    const bestScore = contestResults.reduce((max, c) => Math.max(max, c.score || 0), 0);

    // Member since
    const memberSince = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';

    return { solved, attempted, totalSubmissions, acceptanceRate, difficultyMap, topTopics, streak, totalContests, bestScore, memberSince };
  }, [progress, execHistory, contestResults, profile]);

  if (!authUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="p-8"><p className="text-muted-foreground">Please log in to view your profile.</p></Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/modules')}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
        </div>

        {/* Profile Card */}
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground">{profile?.username || 'User'}</h2>
                <p className="text-sm text-muted-foreground">Member since {stats.memberSince}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-xs gap-1"><Flame className="h-3 w-3" />{stats.streak} day streak</Badge>
                  <Badge variant="outline" className="text-xs gap-1"><Award className="h-3 w-3" />{achievements.length} badges</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Problems Solved', value: stats.solved, icon: <Target className="h-4 w-4 text-primary" /> },
            { label: 'Submissions', value: stats.totalSubmissions, icon: <Code2 className="h-4 w-4 text-emerald-500" /> },
            { label: 'Acceptance Rate', value: `${stats.acceptanceRate}%`, icon: <TrendingUp className="h-4 w-4 text-amber-500" /> },
            { label: 'Contests Played', value: stats.totalContests, icon: <Trophy className="h-4 w-4 text-violet-500" /> },
          ].map(s => (
            <Card key={s.label} className="border-border">
              <CardContent className="p-4 text-center">
                <div className="flex justify-center mb-1">{s.icon}</div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Difficulty Breakdown */}
        <Card className="border-border">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Solved by Difficulty</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {['Easy', 'Medium', 'Hard'].map(d => {
              const count = stats.difficultyMap[d] || 0;
              const total = ALL_PROBLEMS.filter(p => p.difficulty === d).length || 1;
              const color = d === 'Easy' ? 'bg-emerald-500' : d === 'Medium' ? 'bg-amber-500' : 'bg-destructive';
              return (
                <div key={d} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground font-medium">{d}</span>
                    <span className="text-muted-foreground">{count} / {total}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${(count / total) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Top Topics */}
        <Card className="border-border">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Top Topics</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.topTopics.map(([topic, count]) => (
                <Badge key={topic} variant="secondary" className="text-xs gap-1">
                  <Star className="h-3 w-3" />{topic}: {count}
                </Badge>
              ))}
              {stats.topTopics.length === 0 && <p className="text-xs text-muted-foreground">Solve problems to see your top topics</p>}
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Submissions', route: '/submissions', icon: <Code2 className="h-4 w-4" /> },
            { label: 'Achievements', route: '/achievements', icon: <Award className="h-4 w-4" /> },
            { label: 'Activity Calendar', route: '/streak-calendar', icon: <Calendar className="h-4 w-4" /> },
          ].map(l => (
            <Button key={l.label} variant="outline" className="h-auto py-3 gap-2" onClick={() => navigate(l.route)}>
              {l.icon}{l.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
