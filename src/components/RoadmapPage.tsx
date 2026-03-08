import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronDown, ChevronRight, CheckCircle2, Circle,
  Bookmark, BookmarkCheck, Loader2, Target, Sparkles, RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';
import { getDifficultyBg, type RoadmapProblem, type RoadmapTopic } from '@/lib/striver-roadmap-data';

interface UserProgress {
  problem_key: string;
  status: string;
  solved: boolean;
  marked_for_revision: boolean;
  attempts: number;
}

interface RoadmapPageProps {
  title: string;
  icon: React.ReactNode;
  roadmap: RoadmapTopic[];
  backPath?: string;
}

const RoadmapPage = ({ title, icon, roadmap, backPath = '/modules' }: RoadmapPageProps) => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [progress, setProgress] = useState<Record<string, UserProgress>>({});
  const [loading, setLoading] = useState(true);
  const [openTopics, setOpenTopics] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'solved' | 'unsolved' | 'revision'>('all');

  // Collect all problem keys for this roadmap
  const allKeys = useMemo(() => roadmap.flatMap(t => t.problems.map(p => p.key)), [roadmap]);

  useEffect(() => {
    if (!authUser) return;
    const load = async () => {
      setLoading(true);
      // Fetch progress only for keys in this module
      const { data } = await supabase
        .from('user_problem_progress')
        .select('problem_key, status, solved, marked_for_revision, attempts')
        .eq('user_id', authUser.id)
        .in('problem_key', allKeys);
      const map: Record<string, UserProgress> = {};
      (data || []).forEach((p: any) => { map[p.problem_key] = p; });
      setProgress(map);
      setLoading(false);
    };
    load();
  }, [authUser, allKeys]);

  const stats = useMemo(() => {
    const total = roadmap.reduce((s, t) => s + t.problems.length, 0);
    const solved = Object.values(progress).filter(p => p.solved).length;
    const revision = Object.values(progress).filter(p => p.marked_for_revision).length;
    const easy = roadmap.flatMap(t => t.problems).filter(p => p.difficulty === 'Easy' && progress[p.key]?.solved).length;
    const medium = roadmap.flatMap(t => t.problems).filter(p => p.difficulty === 'Medium' && progress[p.key]?.solved).length;
    const hard = roadmap.flatMap(t => t.problems).filter(p => p.difficulty === 'Hard' && progress[p.key]?.solved).length;
    return { total, solved, revision, easy, medium, hard };
  }, [progress, roadmap]);

  const recommendation = useMemo(() => {
    let weakest = { name: '', pct: 100, problem: null as RoadmapProblem | null };
    for (const topic of roadmap) {
      const solved = topic.problems.filter(p => progress[p.key]?.solved).length;
      const pct = topic.problems.length > 0 ? (solved / topic.problems.length) * 100 : 100;
      if (pct < weakest.pct) {
        const next = topic.problems.find(p => !progress[p.key]?.solved);
        if (next) weakest = { name: topic.name, pct, problem: next };
      }
    }
    return weakest.problem ? { topic: weakest.name, problem: weakest.problem } : null;
  }, [progress, roadmap]);

  const toggleTopic = (name: string) => {
    setOpenTopics(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const handlePractice = (problem: RoadmapProblem) => {
    navigate(`/problem/${problem.key}`);
  };

  const toggleSolved = async (problem: RoadmapProblem) => {
    if (!authUser) return;
    const existing = progress[problem.key];
    const nowSolved = !existing?.solved;
    const upsertData = {
      user_id: authUser.id,
      problem_key: problem.key,
      status: nowSolved ? 'solved' : 'attempted',
      solved: nowSolved,
      attempts: (existing?.attempts || 0) + 1,
      last_attempted: new Date().toISOString(),
      ...(nowSolved ? { solved_at: new Date().toISOString() } : {}),
    };

    if (existing) {
      await supabase.from('user_problem_progress').update(upsertData as any).eq('user_id', authUser.id).eq('problem_key', problem.key);
    } else {
      await supabase.from('user_problem_progress').insert(upsertData as any);
    }

    setProgress(prev => ({
      ...prev,
      [problem.key]: { ...prev[problem.key], ...upsertData } as UserProgress,
    }));
  };

  const toggleRevision = async (problem: RoadmapProblem) => {
    if (!authUser) return;
    const existing = progress[problem.key];
    const newVal = !existing?.marked_for_revision;

    if (existing) {
      await supabase.from('user_problem_progress').update({ marked_for_revision: newVal } as any).eq('user_id', authUser.id).eq('problem_key', problem.key);
    } else {
      await supabase.from('user_problem_progress').insert({
        user_id: authUser.id,
        problem_key: problem.key,
        status: 'not_started',
        solved: false,
        marked_for_revision: newVal,
        attempts: 0,
      } as any);
    }

    setProgress(prev => ({
      ...prev,
      [problem.key]: { ...prev[problem.key], problem_key: problem.key, marked_for_revision: newVal } as UserProgress,
    }));
  };

  const filterProblems = (problems: RoadmapProblem[]) => {
    if (filter === 'all') return problems;
    if (filter === 'solved') return problems.filter(p => progress[p.key]?.solved);
    if (filter === 'unsolved') return problems.filter(p => !progress[p.key]?.solved);
    if (filter === 'revision') return problems.filter(p => progress[p.key]?.marked_for_revision);
    return problems;
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 border-b border-panel-border bg-ide-toolbar px-3 sm:px-4 py-2 overflow-x-auto scrollbar-none">
        <Button variant="ghost" size="sm" onClick={() => navigate(backPath)} className="h-7 gap-1 text-xs shrink-0">
          <ArrowLeft className="h-3 w-3" /> <span className="hidden sm:inline">Back</span>
        </Button>
        <div className="flex items-center gap-2 shrink-0">
          {icon}
          <span className="text-xs sm:text-sm font-bold truncate max-w-[150px] sm:max-w-none">{title}</span>
        </div>
        <Badge variant="secondary" className="text-xs shrink-0">{stats.solved}/{stats.total}</Badge>
      </div>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Sidebar stats - hidden on mobile, shown as horizontal scroll on tablet */}
        <div className="hidden md:block w-64 lg:w-72 shrink-0 border-r border-panel-border bg-ide-sidebar overflow-auto">
          <div className="p-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-muted-foreground">Overall Progress</span>
                <span className="text-xs font-bold text-primary">{stats.total > 0 ? Math.round((stats.solved / stats.total) * 100) : 0}%</span>
              </div>
              <Progress value={stats.total > 0 ? (stats.solved / stats.total) * 100 : 0} className="h-2" />
              <div className="mt-1 text-[10px] text-muted-foreground">{stats.solved} of {stats.total} problems completed</div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">By Difficulty</span>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[10px]">Easy</Badge>
                <span className="text-xs font-mono">{stats.easy}</span>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-[10px]">Medium</Badge>
                <span className="text-xs font-mono">{stats.medium}</span>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">Hard</Badge>
                <span className="text-xs font-mono">{stats.hard}</span>
              </div>
            </div>

            {recommendation && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Recommended Next</span>
                  </div>
                  <div className="text-xs font-medium text-foreground">{recommendation.problem.title}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{recommendation.topic}</div>
                  <Button size="sm" className="mt-2 h-6 text-[10px] w-full" onClick={() => handlePractice(recommendation.problem)}>
                    Practice Now
                  </Button>
                </CardContent>
              </Card>
            )}

            {stats.revision > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 gap-1.5 text-xs"
                onClick={() => setFilter(filter === 'revision' ? 'all' : 'revision')}
              >
                <RotateCcw className="h-3 w-3" />
                Revision List ({stats.revision})
              </Button>
            )}

            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Filter</span>
              <div className="flex flex-wrap gap-1">
                {(['all', 'unsolved', 'solved', 'revision'] as const).map(f => (
                  <Badge
                    key={f}
                    variant={filter === f ? 'default' : 'secondary'}
                    className="cursor-pointer text-[10px]"
                    onClick={() => setFilter(f)}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Topics</span>
              {roadmap.map(topic => {
                const solved = topic.problems.filter(p => progress[p.key]?.solved).length;
                return (
                  <button
                    key={topic.name}
                    onClick={() => {
                      toggleTopic(topic.name);
                      document.getElementById(`topic-${topic.name}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-muted"
                  >
                    <span>{topic.icon}</span>
                    <span className="flex-1 text-left truncate">{topic.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{solved}/{topic.problems.length}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main content */}
        <ScrollArea className="flex-1">
          <div className="p-6 max-w-4xl mx-auto space-y-3">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              roadmap.map(topic => {
                const filteredProblems = filterProblems(topic.problems);
                const solvedCount = topic.problems.filter(p => progress[p.key]?.solved).length;
                const pct = topic.problems.length > 0 ? (solvedCount / topic.problems.length) * 100 : 0;
                const isOpen = openTopics.has(topic.name);

                if (filter !== 'all' && filteredProblems.length === 0) return null;

                return (
                  <Collapsible key={topic.name} open={isOpen} onOpenChange={() => toggleTopic(topic.name)}>
                    <div id={`topic-${topic.name}`}>
                      <CollapsibleTrigger asChild>
                        <Card className={`cursor-pointer transition-all hover:border-primary/30 ${isOpen ? 'border-primary/30 shadow-sm' : ''}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{topic.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-foreground">{topic.name}</span>
                                  <Badge variant="secondary" className="text-[10px]">{topic.problems.length} problems</Badge>
                                  {pct >= 80 && <Badge className="bg-success text-[10px]">Mastered</Badge>}
                                </div>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <Progress value={pct} className="h-1.5 flex-1" />
                                  <span className="text-[10px] font-mono text-muted-foreground w-16 text-right">
                                    {solvedCount}/{topic.problems.length}
                                  </span>
                                </div>
                              </div>
                              {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                            </div>
                          </CardContent>
                        </Card>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="mt-1 space-y-0.5 pl-4">
                          {filteredProblems.map((problem, idx) => {
                            const p = progress[problem.key];
                            const isSolved = p?.solved;
                            const isRevision = p?.marked_for_revision;

                            return (
                              <div
                                key={problem.key}
                                className={`flex items-center gap-3 rounded-md px-3 py-2 text-xs transition-all animate-fade-in ${
                                  isSolved ? 'bg-success/5' : 'hover:bg-muted/50'
                                }`}
                                style={{ animationDelay: `${idx * 20}ms` }}
                              >
                                <button onClick={() => toggleSolved(problem)} className="shrink-0">
                                  {isSolved ? (
                                    <CheckCircle2 className="h-4 w-4 text-success" />
                                  ) : (
                                    <Circle className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                                  )}
                                </button>

                                <span className="text-[10px] text-muted-foreground font-mono w-6">{idx + 1}</span>

                                <button
                                  onClick={() => handlePractice(problem)}
                                  className={`flex-1 text-left font-medium transition-colors hover:text-primary ${
                                    isSolved ? 'text-muted-foreground line-through' : 'text-foreground'
                                  }`}
                                >
                                  {problem.title}
                                </button>

                                <Badge variant="outline" className={`text-[9px] ${getDifficultyBg(problem.difficulty)}`}>
                                  {problem.difficulty}
                                </Badge>

                                {p?.attempts ? (
                                  <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                                    <Target className="h-2.5 w-2.5" />{p.attempts}
                                  </span>
                                ) : null}

                                <button onClick={() => toggleRevision(problem)} className="shrink-0">
                                  {isRevision ? (
                                    <BookmarkCheck className="h-3.5 w-3.5 text-warning" />
                                  ) : (
                                    <Bookmark className="h-3.5 w-3.5 text-muted-foreground hover:text-warning transition-colors" />
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default RoadmapPage;
