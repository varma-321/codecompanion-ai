import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Star, Flame, Target, Zap, Award, Crown, Shield, Gem, Medal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';

interface Achievement {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  condition: (stats: UserStats) => boolean;
  category: 'solving' | 'streak' | 'mastery' | 'special';
}

interface UserStats {
  totalSolved: number;
  totalAttempts: number;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
  contestsPlayed: number;
  topicsCount: number;
  currentStreak: number;
}

const ACHIEVEMENTS: Achievement[] = [
  { key: 'first_solve', title: 'First Blood', description: 'Solve your first problem', icon: <Star className="h-5 w-5" />, condition: s => s.totalSolved >= 1, category: 'solving' },
  { key: 'solve_10', title: 'Getting Warmed Up', description: 'Solve 10 problems', icon: <Flame className="h-5 w-5" />, condition: s => s.totalSolved >= 10, category: 'solving' },
  { key: 'solve_25', title: 'Problem Crusher', description: 'Solve 25 problems', icon: <Target className="h-5 w-5" />, condition: s => s.totalSolved >= 25, category: 'solving' },
  { key: 'solve_50', title: 'Half Century', description: 'Solve 50 problems', icon: <Zap className="h-5 w-5" />, condition: s => s.totalSolved >= 50, category: 'solving' },
  { key: 'solve_100', title: 'Centurion', description: 'Solve 100 problems', icon: <Crown className="h-5 w-5" />, condition: s => s.totalSolved >= 100, category: 'solving' },
  { key: 'easy_10', title: 'Easy Peasy', description: 'Solve 10 easy problems', icon: <Shield className="h-5 w-5" />, condition: s => s.easyCount >= 10, category: 'mastery' },
  { key: 'medium_10', title: 'Medium Rare', description: 'Solve 10 medium problems', icon: <Gem className="h-5 w-5" />, condition: s => s.mediumCount >= 10, category: 'mastery' },
  { key: 'hard_5', title: 'Hardcoded', description: 'Solve 5 hard problems', icon: <Award className="h-5 w-5" />, condition: s => s.hardCount >= 5, category: 'mastery' },
  { key: 'contest_1', title: 'Competitor', description: 'Complete your first contest', icon: <Trophy className="h-5 w-5" />, condition: s => s.contestsPlayed >= 1, category: 'special' },
  { key: 'contest_5', title: 'Arena Veteran', description: 'Complete 5 contests', icon: <Medal className="h-5 w-5" />, condition: s => s.contestsPlayed >= 5, category: 'special' },
  { key: 'streak_3', title: 'On a Roll', description: '3-day practice streak', icon: <Flame className="h-5 w-5" />, condition: s => s.currentStreak >= 3, category: 'streak' },
  { key: 'streak_7', title: 'Week Warrior', description: '7-day practice streak', icon: <Flame className="h-5 w-5" />, condition: s => s.currentStreak >= 7, category: 'streak' },
];

const categoryColors: Record<string, string> = {
  solving: 'bg-primary/10 text-primary border-primary/20',
  streak: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  mastery: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  special: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

const Achievements = () => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [unlockedKeys, setUnlockedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUser) return;
    const load = async () => {
      const [progressRes, contestRes, achieveRes] = await Promise.all([
        supabase.from('user_problem_progress').select('*').eq('user_id', authUser.id),
        supabase.from('contest_results').select('*').eq('user_id', authUser.id),
        supabase.from('user_achievements').select('achievement_key').eq('user_id', authUser.id),
      ]);

      const progress = progressRes.data || [];
      const contests = contestRes.data || [];
      const solved = progress.filter((p: any) => p.solved);

      // Calculate streak from last_attempted dates
      const dates = progress
        .filter((p: any) => p.last_attempted)
        .map((p: any) => new Date(p.last_attempted).toDateString());
      const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < uniqueDates.length; i++) {
        const expected = new Date(today);
        expected.setDate(expected.getDate() - i);
        if (uniqueDates[i] === expected.toDateString()) streak++;
        else break;
      }

      const userStats: UserStats = {
        totalSolved: solved.length,
        totalAttempts: progress.reduce((s: number, p: any) => s + (p.attempts || 0), 0),
        easyCount: 0, mediumCount: 0, hardCount: 0,
        contestsPlayed: contests.length,
        topicsCount: 0,
        currentStreak: streak,
      };

      setStats(userStats);
      setUnlockedKeys(new Set((achieveRes.data || []).map((a: any) => a.achievement_key)));

      // Check and unlock new achievements
      for (const ach of ACHIEVEMENTS) {
        if (ach.condition(userStats) && !(achieveRes.data || []).find((a: any) => a.achievement_key === ach.key)) {
          await supabase.from('user_achievements').insert({ user_id: authUser.id, achievement_key: ach.key } as any);
          setUnlockedKeys(prev => new Set([...prev, ach.key]));
        }
      }
      setLoading(false);
    };
    load();
  }, [authUser]);

  const xp = useMemo(() => {
    if (!stats) return 0;
    return stats.totalSolved * 10 + stats.contestsPlayed * 25 + unlockedKeys.size * 50;
  }, [stats, unlockedKeys]);

  const level = Math.floor(xp / 100) + 1;
  const xpInLevel = xp % 100;

  if (!authUser) return <div className="flex h-screen items-center justify-center bg-background"><p className="text-foreground">Please log in</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-panel-border bg-ide-toolbar px-4 py-2 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-7 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back
        </Button>
        <Trophy className="h-4 w-4 text-primary" />
        <span className="font-bold text-foreground">Achievements & Badges</span>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* XP & Level */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-2xl font-bold text-foreground">Level {level}</p>
                <p className="text-sm text-muted-foreground">{xp} XP total • {unlockedKeys.size}/{ACHIEVEMENTS.length} badges</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Streak: {stats?.currentStreak || 0} days 🔥</p>
                <p className="text-sm text-muted-foreground">{stats?.totalSolved || 0} problems solved</p>
              </div>
            </div>
            <Progress value={xpInLevel} className="h-3" />
            <p className="text-xs text-muted-foreground mt-1">{xpInLevel}/100 XP to Level {level + 1}</p>
          </CardContent>
        </Card>

        {/* Badges grid */}
        {loading ? (
          <p className="text-muted-foreground text-center py-10">Loading achievements...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ACHIEVEMENTS.map(ach => {
              const unlocked = unlockedKeys.has(ach.key);
              return (
                <Card key={ach.key} className={`transition-all ${unlocked ? 'border-primary/30 shadow-md' : 'opacity-50'}`}>
                  <CardContent className="pt-5 flex items-start gap-3">
                    <div className={`p-2.5 rounded-lg border ${categoryColors[ach.category]}`}>
                      {ach.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-foreground">{ach.title}</p>
                        {unlocked && <Badge variant="outline" className="text-[9px] border-primary text-primary">✓</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{ach.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Achievements;
