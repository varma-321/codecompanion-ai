import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Medal, Users, Crown, TrendingUp, Flame } from 'lucide-react';
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
  streak: number;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [myStats, setMyStats] = useState<{ solved: number; contests: number; score: number; rank: number }>({ solved: 0, contests: 0, score: 0, rank: 0 });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: profiles } = await supabase.from('profiles').select('id, username');
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.username]));

      const { data: progressData } = await supabase.from('user_problem_progress').select('user_id, solved').eq('solved', true);
      const solvedByUser = new Map<string, number>();
      (progressData || []).forEach((p: any) => {
        solvedByUser.set(p.user_id, (solvedByUser.get(p.user_id) || 0) + 1);
      });

      const { data: contestData } = await supabase.from('contest_results').select('user_id, score, problems_solved');
      const contestByUser = new Map<string, { score: number; count: number }>();
      (contestData || []).forEach((c: any) => {
        const existing = contestByUser.get(c.user_id) || { score: 0, count: 0 };
        contestByUser.set(c.user_id, { score: existing.score + (c.score || 0), count: existing.count + 1 });
      });

      const allUsers = new Set([...solvedByUser.keys(), ...contestByUser.keys()]);
      const list: LeaderboardEntry[] = [];
      allUsers.forEach(uid => {
        list.push({
          user_id: uid,
          username: profileMap.get(uid) || 'Unknown',
          solved_count: solvedByUser.get(uid) || 0,
          contest_score: contestByUser.get(uid)?.score || 0,
          contest_count: contestByUser.get(uid)?.count || 0,
          streak: 0,
        });
      });

      list.sort((a, b) => b.solved_count - a.solved_count);
      setEntries(list);

      if (authUser) {
        const myRank = list.findIndex(e => e.user_id === authUser.id) + 1;
        const me = list.find(e => e.user_id === authUser.id);
        if (me) setMyStats({ solved: me.solved_count, contests: me.contest_count, score: me.contest_score, rank: myRank });
      }
      setLoading(false);
    };
    load();
  }, [authUser]);

  const getRankBadge = (idx: number) => {
    if (idx === 0) return <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center"><Crown className="h-3.5 w-3.5 text-yellow-500" /></div>;
    if (idx === 1) return <div className="w-6 h-6 rounded-full bg-gray-400/20 flex items-center justify-center"><Medal className="h-3.5 w-3.5 text-gray-400" /></div>;
    if (idx === 2) return <div className="w-6 h-6 rounded-full bg-amber-600/20 flex items-center justify-center"><Medal className="h-3.5 w-3.5 text-amber-600" /></div>;
    return <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-mono text-muted-foreground">{idx + 1}</div>;
  };

  const maxSolved = entries[0]?.solved_count || 1;

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-panel-border bg-ide-toolbar px-4 py-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-7 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back
        </Button>
        <Trophy className="h-4 w-4 text-yellow-500" />
        <span className="text-sm font-bold">Leaderboard</span>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          {/* My Stats */}
          {authUser && myStats.rank > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">#{myStats.rank}</p>
                    <p className="text-[10px] text-muted-foreground">Your Rank</p>
                  </div>
                  <div className="h-10 w-px bg-border" />
                  <div className="grid grid-cols-3 gap-6 flex-1">
                    <div className="text-center">
                      <p className="text-lg font-bold text-foreground">{myStats.solved}</p>
                      <p className="text-[10px] text-muted-foreground">Solved</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-foreground">{myStats.score}</p>
                      <p className="text-[10px] text-muted-foreground">Contest Score</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-foreground">{myStats.contests}</p>
                      <p className="text-[10px] text-muted-foreground">Contests</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="progress">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="progress" className="gap-1 text-xs"><TrendingUp className="h-3 w-3" /> Problems Solved</TabsTrigger>
              <TabsTrigger value="contest" className="gap-1 text-xs"><Trophy className="h-3 w-3" /> Contest Score</TabsTrigger>
            </TabsList>

            <TabsContent value="progress" className="space-y-1.5 mt-3">
              {loading ? (
                <p className="text-center py-8 text-sm text-muted-foreground">Loading...</p>
              ) : entries.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No data yet. Start solving problems!</p>
                </div>
              ) : entries.map((entry, idx) => (
                <Card key={entry.user_id} className={`transition-colors ${entry.user_id === authUser?.id ? 'border-primary/30 bg-primary/5' : ''}`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    {getRankBadge(idx)}
                    <span className="text-xs font-medium flex-1 truncate">{entry.username}</span>
                    <Progress value={(entry.solved_count / maxSolved) * 100} className="w-20 h-1.5" />
                    <Badge variant="secondary" className="font-mono text-[10px] shrink-0">{entry.solved_count} solved</Badge>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="contest" className="space-y-1.5 mt-3">
              {entries.filter(e => e.contest_count > 0).length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Trophy className="h-10 w-10 mx-auto text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No contests completed yet.</p>
                </div>
              ) : entries.filter(e => e.contest_count > 0).sort((a, b) => b.contest_score - a.contest_score).map((entry, idx) => (
                <Card key={entry.user_id} className={entry.user_id === authUser?.id ? 'border-primary/30 bg-primary/5' : ''}>
                  <CardContent className="p-3 flex items-center gap-3">
                    {getRankBadge(idx)}
                    <span className="text-xs font-medium flex-1 truncate">{entry.username}</span>
                    <span className="text-[10px] text-muted-foreground">{entry.contest_count} contests</span>
                    <Badge variant="secondary" className="font-mono text-[10px]">{entry.contest_score} pts</Badge>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
