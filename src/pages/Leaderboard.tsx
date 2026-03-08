import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Medal, Users, Crown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  solved_count: number;
  contest_score: number;
  contest_count: number;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [progressBoard, setProgressBoard] = useState<LeaderboardEntry[]>([]);
  const [contestBoard, setContestBoard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [myStats, setMyStats] = useState<{ solved: number; contests: number; score: number }>({ solved: 0, contests: 0, score: 0 });

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // Get all profiles
      const { data: profiles } = await supabase.from('profiles').select('id, username');
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.username]));

      // Get solved counts per user
      const { data: progressData } = await supabase
        .from('user_problem_progress')
        .select('user_id, solved')
        .eq('solved', true);

      const solvedByUser = new Map<string, number>();
      (progressData || []).forEach((p: any) => {
        solvedByUser.set(p.user_id, (solvedByUser.get(p.user_id) || 0) + 1);
      });

      // Get contest results
      const { data: contestData } = await supabase
        .from('contest_results')
        .select('user_id, score, problems_solved');

      const contestByUser = new Map<string, { score: number; count: number }>();
      (contestData || []).forEach((c: any) => {
        const existing = contestByUser.get(c.user_id) || { score: 0, count: 0 };
        contestByUser.set(c.user_id, {
          score: existing.score + (c.score || 0),
          count: existing.count + 1,
        });
      });

      // Build leaderboard
      const allUsers = new Set([...solvedByUser.keys(), ...contestByUser.keys()]);
      const entries: LeaderboardEntry[] = [];
      allUsers.forEach(uid => {
        entries.push({
          user_id: uid,
          username: profileMap.get(uid) || 'Unknown',
          solved_count: solvedByUser.get(uid) || 0,
          contest_score: contestByUser.get(uid)?.score || 0,
          contest_count: contestByUser.get(uid)?.count || 0,
        });
      });

      setProgressBoard([...entries].sort((a, b) => b.solved_count - a.solved_count));
      setContestBoard([...entries].sort((a, b) => b.contest_score - a.contest_score));

      if (authUser) {
        const me = entries.find(e => e.user_id === authUser.id);
        if (me) setMyStats({ solved: me.solved_count, contests: me.contest_count, score: me.contest_score });
      }

      setLoading(false);
    };
    load();
  }, [authUser]);

  const getRankIcon = (idx: number) => {
    if (idx === 0) return <Crown className="h-4 w-4 text-warning" />;
    if (idx === 1) return <Medal className="h-4 w-4 text-muted-foreground" />;
    if (idx === 2) return <Medal className="h-4 w-4 text-warning/60" />;
    return <span className="text-[10px] font-mono text-muted-foreground w-4 text-center">{idx + 1}</span>;
  };

  const maxSolved = progressBoard[0]?.solved_count || 1;
  const maxScore = contestBoard[0]?.contest_score || 1;

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-panel-border bg-ide-toolbar px-4 py-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="h-7 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-warning" />
          <span className="text-sm font-bold">Leaderboard</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          {/* My Stats */}
          {authUser && (
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-primary">{myStats.solved}</div>
                  <div className="text-[10px] text-muted-foreground">Problems Solved</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-warning">{myStats.score}</div>
                  <div className="text-[10px] text-muted-foreground">Contest Score</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-foreground">{myStats.contests}</div>
                  <div className="text-[10px] text-muted-foreground">Contests</div>
                </CardContent>
              </Card>
            </div>
          )}

          <Tabs defaultValue="progress">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="progress" className="gap-1 text-xs">
                <TrendingUp className="h-3 w-3" /> Problems Solved
              </TabsTrigger>
              <TabsTrigger value="contest" className="gap-1 text-xs">
                <Trophy className="h-3 w-3" /> Contest Score
              </TabsTrigger>
            </TabsList>

            <TabsContent value="progress" className="space-y-1 mt-3">
              {progressBoard.map((entry, idx) => (
                <Card key={entry.user_id} className={entry.user_id === authUser?.id ? 'border-primary/30 bg-primary/5' : ''}>
                  <CardContent className="p-3 flex items-center gap-3">
                    {getRankIcon(idx)}
                    <span className="text-xs font-medium flex-1">{entry.username}</span>
                    <Progress value={(entry.solved_count / maxSolved) * 100} className="w-24 h-1.5" />
                    <Badge variant="secondary" className="font-mono text-[10px]">{entry.solved_count} solved</Badge>
                  </CardContent>
                </Card>
              ))}
              {progressBoard.length === 0 && !loading && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  No data yet. Start solving problems!
                </div>
              )}
            </TabsContent>

            <TabsContent value="contest" className="space-y-1 mt-3">
              {contestBoard.filter(e => e.contest_count > 0).map((entry, idx) => (
                <Card key={entry.user_id} className={entry.user_id === authUser?.id ? 'border-primary/30 bg-primary/5' : ''}>
                  <CardContent className="p-3 flex items-center gap-3">
                    {getRankIcon(idx)}
                    <span className="text-xs font-medium flex-1">{entry.username}</span>
                    <span className="text-[10px] text-muted-foreground">{entry.contest_count} contests</span>
                    <Badge variant="secondary" className="font-mono text-[10px]">{entry.contest_score} pts</Badge>
                  </CardContent>
                </Card>
              ))}
              {contestBoard.filter(e => e.contest_count > 0).length === 0 && !loading && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Trophy className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  No contests completed yet. Try Contest Mode!
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
