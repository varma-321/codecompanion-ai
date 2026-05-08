import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, ArrowLeft, Clock, CheckCircle2, AlertCircle, Play, RotateCcw, Flame, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    if (!authUser) { setLoading(false); return; }
    supabase.from('user_problem_progress').select('*').eq('user_id', authUser.id)
      .then(({ data }) => {
        setProgressData(data || []);
        setLoading(false);
      });
  }, [authUser]);

  const reviewItems = useMemo(() => {
    return progressData
      .filter(p => {
        if (!p.solved || !p.solved_at) return false;
        
        const solvedDate = new Date(p.solved_at);
        return solvedDate.toDateString() === selectedDate.toDateString();
      })
      .map(p => {
        const problem = ALL_PROBLEMS.find(pr => pr.key === p.problem_key);
        return problem ? { 
          ...problem, 
          progress: p, 
          overdue: p.next_review_at ? new Date(p.next_review_at) < new Date() : false 
        } : null;
      })
      .filter(Boolean)
      .sort((a: any, b: any) => {
        const diffOrder: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2 };
        return (diffOrder[a.difficulty] || 0) - (diffOrder[b.difficulty] || 0);
      });
  }, [progressData, selectedDate]);

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
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center gap-2 sm:gap-3 border-b border-border bg-card px-3 sm:px-5 py-3 overflow-x-auto scrollbar-none">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-8 gap-1.5 text-xs font-medium rounded-lg shrink-0">
          <ArrowLeft className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Back</span>
        </Button>
        <div className="h-4 w-px bg-border shrink-0" />
        
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <RotateCcw className="h-4 w-4 text-primary shrink-0" />
          <h1 className="text-sm font-bold tracking-tight truncate shrink-0">Review Tracker</h1>
          
          <div className="flex items-center gap-1.5 ml-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={() => {
                const prev = new Date(selectedDate);
                prev.setDate(prev.getDate() - 1);
                setSelectedDate(prev);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 gap-2 text-[11px] font-bold bg-secondary/30 border-primary/10 rounded-full"
                >
                  <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                  {format(selectedDate, 'MMM d, yyyy')}
                  {selectedDate.toDateString() === new Date().toDateString() && (
                    <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full ml-1">Today</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-panel-border shadow-2xl" align="center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                  className="rounded-xl border-none"
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={() => {
                const next = new Date(selectedDate);
                next.setDate(next.getDate() + 1);
                setSelectedDate(next);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Badge variant="secondary" className="ml-auto text-[10px] font-bold px-2 py-0.5 shrink-0">{totalReview} solved</Badge>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
          {/* Progress */}
          <Card className="border-border bg-gradient-to-br from-card to-secondary/10 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <CalendarDays className="h-24 w-24" />
            </div>
            <CardContent className="p-4 sm:p-6 relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-destructive/10">
                    <Flame className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <span className="text-sm font-bold block leading-tight">Daily Solve Target</span>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Solved on {format(selectedDate, 'MMMM d')}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-foreground">{completedCount}</span>
                  <span className="text-xs text-muted-foreground font-bold ml-1">/ {totalReview}</span>
                </div>
              </div>
              <Progress value={progressPercent} className="h-3 rounded-full bg-secondary" />
              {completedCount === totalReview && totalReview > 0 && (
                <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-success/10 border border-success/20 animate-in zoom-in-95 duration-500">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <p className="text-[11px] text-success font-bold">You reviewed everything solved on this day! Awesome work.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {totalReview === 0 ? (
            <Card className="border-border border-dashed bg-secondary/5 rounded-3xl">
              <CardContent className="p-10 sm:p-16 text-center">
                <div className="h-20 w-20 rounded-3xl bg-secondary/20 flex items-center justify-center mx-auto mb-6 rotate-3">
                  <CalendarDays className="h-10 w-10 text-muted-foreground/30" />
                </div>
                <h3 className="text-xl font-bold text-foreground">No solves on this date</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-[260px] mx-auto leading-relaxed">
                  You didn't solve any problems on {format(selectedDate, 'MMMM d, yyyy')}. Start a streak today!
                </p>
                <Button className="mt-8 rounded-2xl font-bold h-12 px-8 shadow-lg shadow-primary/20" onClick={() => navigate('/modules')}>
                  Explore Modules
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {reviewItems.map((item: any) => {
                const done = completedToday.has(item.key);
                return (
                  <Card key={item.key} className={`border-2 transition-all ${done ? 'opacity-40 grayscale-[0.5] border-transparent bg-secondary/10' : 'hover:border-primary/30 border-border/50'}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-sm sm:text-base font-bold text-foreground truncate">{item.title}</span>
                            <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-tighter shrink-0 ${item.difficulty === 'Easy' ? 'bg-green-500/10 text-green-500 border-green-500/20' : item.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                              {item.difficulty}
                            </Badge>
                            {item.overdue && !done && (
                              <Badge variant="destructive" className="text-[9px] font-black uppercase tracking-widest shrink-0">Overdue</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            <span>{item.topic}</span>
                            {item.progress.marked_for_revision && (
                              <span className="text-primary flex items-center gap-1">
                                <span className="h-1 w-1 rounded-full bg-primary" /> 📌 Revision
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
                          <Button size="sm" variant="outline" className="h-9 text-[11px] font-bold gap-2 px-4 rounded-xl flex-1 sm:flex-none" onClick={() => navigate(`/problem/${item.key}`)}>
                            <Play className="h-3.5 w-3.5" /> Solve
                          </Button>
                          {!done ? (
                            <Button size="sm" variant="ghost" className="h-9 text-[11px] font-bold gap-2 text-primary hover:bg-primary/10 rounded-xl flex-1 sm:flex-none border border-primary/10" onClick={() => handleMarkReviewed(item.key)}>
                              <CheckCircle2 className="h-3.5 w-3.5" /> Mark Done
                            </Button>
                          ) : (
                            <div className="h-9 w-9 flex items-center justify-center bg-primary/10 rounded-full">
                               <CheckCircle2 className="h-5 w-5 text-primary" />
                            </div>
                          )}
                        </div>
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
