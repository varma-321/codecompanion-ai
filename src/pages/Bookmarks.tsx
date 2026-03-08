import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, Star, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';
import { STRIVER_ROADMAP, getDifficultyBg } from '@/lib/striver-roadmap-data';
import { NEETCODE_ROADMAP } from '@/lib/neetcode-roadmap-data';
import { LEETCODE_TOP150_ROADMAP } from '@/lib/leetcode-top150-data';

const ALL_PROBLEMS = [...STRIVER_ROADMAP, ...NEETCODE_ROADMAP, ...LEETCODE_TOP150_ROADMAP].flatMap(t =>
  t.problems.map(p => ({ ...p, topic: t.name }))
);
const PROBLEM_MAP = new Map(ALL_PROBLEMS.map(p => [p.key, p]));

const Bookmarks = () => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!authUser) return;
    supabase.from('user_problem_progress').select('*').eq('user_id', authUser.id).eq('marked_for_revision', true)
      .then(({ data }) => { setBookmarks(data || []); setLoading(false); });
  }, [authUser]);

  const filtered = bookmarks.filter(b => {
    if (filter === 'all') return true;
    if (filter === 'solved') return b.solved;
    if (filter === 'unsolved') return !b.solved;
    return true;
  });

  const handleRemoveBookmark = async (problemKey: string) => {
    await supabase.from('user_problem_progress').update({ marked_for_revision: false }).eq('user_id', authUser!.id).eq('problem_key', problemKey);
    setBookmarks(prev => prev.filter(b => b.problem_key !== problemKey));
  };

  if (!authUser) return <div className="flex h-screen items-center justify-center bg-background"><p className="text-foreground">Please log in</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-panel-border bg-ide-toolbar px-4 py-2 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-7 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back
        </Button>
        <Bookmark className="h-4 w-4 text-primary" />
        <span className="font-bold text-foreground">Bookmarked Problems</span>
        <Badge variant="outline" className="text-[10px]">{bookmarks.length}</Badge>
      </div>

      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="solved">Solved</SelectItem>
              <SelectItem value="unsolved">Unsolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-center py-10">Loading bookmarks...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <Star className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No bookmarked problems</p>
            <p className="text-xs text-muted-foreground">Mark problems for revision from roadmap pages</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(b => {
              const prob = PROBLEM_MAP.get(b.problem_key);
              if (!prob) return null;
              return (
                <Card key={b.id} className="cursor-pointer hover:border-primary/30 transition-colors">
                  <CardContent className="py-3 flex items-center justify-between">
                    <div className="flex-1" onClick={() => navigate(`/problem/${b.problem_key}`)}>
                      <p className="text-sm font-medium text-foreground">{prob.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-[10px] ${getDifficultyBg(prob.difficulty)}`}>{prob.difficulty}</Badge>
                        <span className="text-[10px] text-muted-foreground">{prob.topic}</span>
                        {b.solved && <Badge variant="outline" className="text-[9px] text-primary border-primary">✓ Solved</Badge>}
                        <span className="text-[10px] text-muted-foreground">{b.attempts} attempts</span>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleRemoveBookmark(b.problem_key)} className="text-xs text-destructive">
                      Remove
                    </Button>
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

export default Bookmarks;
