import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, Clock, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';
import { STRIVER_ROADMAP, getDifficultyBg, type RoadmapProblem } from '@/lib/striver-roadmap-data';
import { NEETCODE_ROADMAP } from '@/lib/neetcode-roadmap-data';
import { LEETCODE_TOP150_ROADMAP } from '@/lib/leetcode-top150-data';

interface ReviewItem {
  problem_key: string;
  next_review_at: string | null;
  ease_factor: number;
  review_interval: number;
  review_count: number;
  solved: boolean;
}

// SM-2 algorithm
function calculateNextReview(item: ReviewItem, quality: number) {
  // quality: 0-5 (0=complete blackout, 5=perfect)
  let ef = item.ease_factor;
  let interval = item.review_interval;
  let count = item.review_count;

  if (quality >= 3) {
    if (count === 0) interval = 1;
    else if (count === 1) interval = 6;
    else interval = Math.round(interval * ef);
    count++;
  } else {
    count = 0;
    interval = 1;
  }

  ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ef < 1.3) ef = 1.3;

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    ease_factor: ef,
    review_interval: interval,
    review_count: count,
    next_review_at: nextReview.toISOString(),
  };
}

const ALL_PROBLEMS_MAP = new Map<string, RoadmapProblem>();
[...STRIVER_ROADMAP, ...NEETCODE_ROADMAP, ...LEETCODE_TOP150_ROADMAP]
  .flatMap(t => t.problems)
  .forEach(p => ALL_PROBLEMS_MAP.set(p.key, p));

const SpacedRepetition = () => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [dueItems, setDueItems] = useState<ReviewItem[]>([]);
  const [upcomingItems, setUpcomingItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingIdx, setReviewingIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!authUser) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('user_problem_progress')
        .select('problem_key, next_review_at, ease_factor, review_interval, review_count, solved')
        .eq('user_id', authUser.id)
        .eq('solved', true);

      const now = new Date();
      const items = (data || []) as ReviewItem[];
      
      // Items due for review (next_review_at is null or in the past)
      const due = items.filter(i => !i.next_review_at || new Date(i.next_review_at) <= now);
      const upcoming = items
        .filter(i => i.next_review_at && new Date(i.next_review_at) > now)
        .sort((a, b) => new Date(a.next_review_at!).getTime() - new Date(b.next_review_at!).getTime());

      setDueItems(due);
      setUpcomingItems(upcoming.slice(0, 20));
      setLoading(false);
    };
    load();
  }, [authUser]);

  const handleReview = async (item: ReviewItem, quality: number) => {
    if (!authUser) return;
    const updates = calculateNextReview(item, quality);
    
    await supabase
      .from('user_problem_progress')
      .update(updates as any)
      .eq('user_id', authUser.id)
      .eq('problem_key', item.problem_key);

    // Remove from due list
    setDueItems(prev => prev.filter(i => i.problem_key !== item.problem_key));
    setReviewingIdx(null);
  };

  const problem = (key: string) => ALL_PROBLEMS_MAP.get(key);

  const daysUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days} days`;
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-panel-border bg-ide-toolbar px-4 py-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="h-7 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold">Spaced Repetition</span>
        </div>
        {dueItems.length > 0 && (
          <Badge variant="destructive" className="text-xs">{dueItems.length} due</Badge>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">📚 Review Schedule</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Solved problems are auto-scheduled for review using the SM-2 spaced repetition algorithm
            </p>
          </div>

          {/* Stats */}
          {/* Stats */}
          <div className="grid grid-cols-1 xs:grid-cols-3 gap-3">
            <Card className="bg-destructive/5 border-destructive/10">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-destructive tabular-nums">{dueItems.length}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Due Now</div>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/10">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-primary tabular-nums">{upcomingItems.length}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Upcoming</div>
              </CardContent>
            </Card>
            <Card className="bg-success/5 border-success/10">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-success tabular-nums">{dueItems.length + upcomingItems.length}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rotation</div>
              </CardContent>
            </Card>
          </div>

          {/* Due Reviews */}
          {dueItems.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-destructive flex items-center gap-2 px-1">
                <AlertCircle className="h-4 w-4" /> Due for Review
              </h2>
              <div className="space-y-2">
                {dueItems.map((item, idx) => {
                  const p = problem(item.problem_key);
                  if (!p) return null;
                  const isReviewing = reviewingIdx === idx;

                  return (
                    <Card key={item.problem_key} className={`transition-all border-2 ${isReviewing ? 'border-primary shadow-lg' : 'hover:border-primary/20 border-border/50'}`}>
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <RotateCcw className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <button
                                onClick={() => navigate(`/problem/${item.problem_key}`)}
                                className="text-sm font-bold hover:text-primary transition-colors leading-tight block mb-1"
                              >
                                {p.title}
                              </button>
                              <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-tighter ${getDifficultyBg(p.difficulty)}`}>
                                {p.difficulty}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 sm:ml-auto">
                            <Button size="sm" variant="outline" className="h-8 text-[10px] font-black uppercase tracking-widest flex-1 sm:flex-none px-4 rounded-full" onClick={() => setReviewingIdx(isReviewing ? null : idx)}>
                              {isReviewing ? 'Cancel' : 'Review'}
                            </Button>
                          </div>
                        </div>

                        {isReviewing && (
                          <div className="mt-4 pt-4 border-t border-panel-border animate-in slide-in-from-top-2 duration-200">
                            <div className="text-center space-y-4">
                              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Rate your recall</p>
                              <div className="grid grid-cols-2 xs:grid-cols-4 gap-2">
                                {[
                                  { q: 1, label: 'Forgot', cls: 'bg-destructive/10 hover:bg-destructive text-destructive hover:text-white border-destructive/20' },
                                  { q: 3, label: 'Hard', cls: 'bg-warning/10 hover:bg-warning text-warning hover:text-white border-warning/20' },
                                  { q: 4, label: 'Good', cls: 'bg-primary/10 hover:bg-primary text-primary hover:text-white border-primary/20' },
                                  { q: 5, label: 'Easy', cls: 'bg-success/10 hover:bg-success text-success hover:text-white border-success/20' },
                                ].map(btn => (
                                  <Button
                                    key={btn.q}
                                    variant="ghost"
                                    size="sm"
                                    className={`h-10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${btn.cls}`}
                                    onClick={() => handleReview(item, btn.q)}
                                  >
                                    {btn.label}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {dueItems.length === 0 && !loading && (
            <Card className="border-success/20 bg-success/5">
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="h-6 w-6 text-success mx-auto mb-2" />
                <div className="text-sm font-medium text-foreground">All caught up!</div>
                <div className="text-xs text-muted-foreground">No reviews due right now. Keep solving problems!</div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming */}
          {upcomingItems.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" /> Upcoming Reviews
              </h2>
              <div className="space-y-0.5">
                {upcomingItems.map(item => {
                  const p = problem(item.problem_key);
                  if (!p) return null;
                  return (
                    <div key={item.problem_key} className="flex items-center gap-3 rounded-md px-3 py-2 text-xs hover:bg-muted/50">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="flex-1 font-medium text-foreground">{p.title}</span>
                      <Badge variant="outline" className={`text-[9px] ${getDifficultyBg(p.difficulty)}`}>{p.difficulty}</Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">{daysUntil(item.next_review_at!)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpacedRepetition;
