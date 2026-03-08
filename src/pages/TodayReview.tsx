import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle2, AlertCircle, Play, RotateCcw, Flame } from 'lucide-react';
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

const TodayReview = () => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState<any[]>([]);
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authUser) { setLoading(false); return; }
    supabase.from('user_problem_progress').select('*').eq('user_id', authUser.id)
      .then(({ data }) => {
        setProgressData(data || []);
        setLoading(false);
      });
  }, [authUser]);

  const reviewItems = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();

    return progressData
      .filter(p => {
        if (!p.solved) return false;
        // Due for review: next_review_at is today or past, OR marked_for_revision
        if (p.marked_for_revision) return true;
        if (p.next_review_at && new Date(p.next_review_at) <= now) return true;
        // If no next_review_at but solved > 3 days ago
        if (!p.next_review_at && p.solved_at) {
          const diff = (now.getTime() - new Date(p.solved_at).getTime()) / (1000 * 60 * 60 * 24);
          return diff >= 3;
        }
        return false;
      })
      .map(p => {
        const problem = ALL_PROBLEMS.find(pr => pr.key === p.problem_key);
        return problem ? { ...problem, progress: p, overdue: p.next_review_at ? new Date(p.next_review_at) < now : true } : null;
      })
      .filter(Boolean)
      .sort((a: any, b: any) => {
        // Overdue first, then by difficulty
        if (a.overdue && !b.overdue) return -1;
        if (!a.overdue && b.overdue) return 1;
        const diffOrder: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2 };
        return (diffOrder[a.difficulty] || 0) - (diffOrder[b.difficulty] || 0);
      });
  }, [progressData]);

  const handleMarkReviewed = async (problemKey: string) => {
    if (!authUser) return;
    const progress = progressData.find(p => p.problem_key === problemKey);
    if (!progress) return;

    const newInterval = Math.max(1, (progress.review_interval || 1) * Math.max(1.3, progress.ease_factor || 2.5));
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + Math.round(newInterval));

    await supabase.from('user_problem_progress').update({
      review_count: (progress.review_count || 0) + 1,
      review_interval: Math.round(newInterval),
      next_review_at: nextReview.toISOString(),
      last_attempted: new Date().toISOString(),
    }).eq('id', progress.id);

    setCompletedToday(prev => new Set([...prev, problemKey]));
  };

  const completedCount = completedToday.size;
  const totalReview = reviewItems.length;
  const progressPercent = totalReview > 0 ? (completedCount / totalReview) * 100 : 0;

  if (loading) return <div className="flex h-screen items-center justify-center bg-background"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex items-center gap-2 sm:gap-3 border-b border-border bg-card px-3 sm:px-5 py-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-8 gap-1.5 text-xs font-medium rounded-lg shrink-0">
          <ArrowLeft className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Modules</span>
        </Button>
        <div className="h-4 w-px bg-border" />
        <RotateCcw className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold tracking-tight">Today's Review</span>
        <Badge variant="secondary" className="ml-auto text-xs">{totalReview} due</Badge>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
          {/* Progress */}
          <Card className="border-border">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-destructive" />
                  <span className="text-sm font-semibold">Review Progress</span>
                </div>
                <span className="text-xs text-muted-foreground">{completedCount}/{totalReview} reviewed</span>
              </div>
              <Progress value={progressPercent} className="h-2.5" />
              {completedCount === totalReview && totalReview > 0 && (
                <p className="text-xs text-primary mt-2 font-medium">🎉 All reviews complete for today!</p>
              )}
            </CardContent>
          </Card>

          {totalReview === 0 ? (
            <Card className="border-border">
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-foreground">All caught up!</h3>
                <p className="text-sm text-muted-foreground mt-1">No problems due for review today. Solve more problems to build your review queue.</p>
                <Button className="mt-4" onClick={() => navigate('/modules')}>Browse Problems</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {reviewItems.map((item: any) => {
                const done = completedToday.has(item.key);
                return (
                  <Card key={item.key} className={`border-border transition-opacity ${done ? 'opacity-50' : ''}`}>
                    <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground truncate">{item.title}</span>
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${item.difficulty === 'Easy' ? 'text-green-500' : item.difficulty === 'Medium' ? 'text-yellow-500' : 'text-red-500'}`}>
                            {item.difficulty}
                          </Badge>
                          {item.overdue && !done && (
                            <Badge variant="destructive" className="text-[10px] shrink-0">Overdue</Badge>
                          )}
                          {item.progress.marked_for_revision && (
                            <Badge variant="secondary" className="text-[10px] shrink-0">📌 Revision</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.topic}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => navigate(`/problem/${item.key}`)}>
                          <Play className="h-3 w-3" /> Solve
                        </Button>
                        {!done && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-primary" onClick={() => handleMarkReviewed(item.key)}>
                            <CheckCircle2 className="h-3 w-3" /> Done
                          </Button>
                        )}
                        {done && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TodayReview;
