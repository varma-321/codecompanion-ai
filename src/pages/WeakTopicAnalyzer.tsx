import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Target, TrendingUp, TrendingDown, BarChart3, Brain, ChevronRight, CheckCircle2, XCircle, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';
import { STRIVER_ROADMAP, type RoadmapProblem } from '@/lib/striver-roadmap-data';
import { NEETCODE_ROADMAP } from '@/lib/neetcode-roadmap-data';
import { LEETCODE_TOP150_ROADMAP } from '@/lib/leetcode-top150-data';

const ALL_ROADMAPS = [...STRIVER_ROADMAP, ...NEETCODE_ROADMAP, ...LEETCODE_TOP150_ROADMAP];

interface TopicStats {
  topic: string;
  total: number;
  solved: number;
  attempted: number;
  avgAttempts: number;
  solveRate: number;
  problems: (RoadmapProblem & { status: string; attempts: number })[];
}

const WeakTopicAnalyzer = () => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [progressData, setProgressData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  useEffect(() => {
    if (!authUser) return;
    setLoading(true);
    supabase.from('user_problem_progress').select('*').eq('user_id', authUser.id)
      .then(({ data }) => {
        setProgressData((data || []) as any[]);
        setLoading(false);
      });
  }, [authUser]);

  const topicStats = useMemo(() => {
    const progressMap = new Map<string, any>();
    progressData.forEach(p => progressMap.set(p.problem_key, p));

    const topicMap = new Map<string, TopicStats>();

    ALL_ROADMAPS.forEach(topic => {
      const existing = topicMap.get(topic.name);
      const stats: TopicStats = existing || {
        topic: topic.name,
        total: 0,
        solved: 0,
        attempted: 0,
        avgAttempts: 0,
        solveRate: 0,
        problems: [],
      };

      topic.problems.forEach(p => {
        const prog = progressMap.get(p.key);
        stats.total++;
        const status = prog?.solved ? 'solved' : prog?.attempts > 0 ? 'attempted' : 'not_started';
        const attempts = prog?.attempts || 0;
        if (prog?.solved) stats.solved++;
        if (prog?.attempts > 0) stats.attempted++;
        stats.problems.push({ ...p, status, attempts });
      });

      stats.solveRate = stats.total > 0 ? (stats.solved / stats.total) * 100 : 0;
      const attemptedProblems = stats.problems.filter(p => p.attempts > 0);
      stats.avgAttempts = attemptedProblems.length > 0
        ? attemptedProblems.reduce((a, b) => a + b.attempts, 0) / attemptedProblems.length
        : 0;

      topicMap.set(topic.name, stats);
    });

    return Array.from(topicMap.values()).sort((a, b) => a.solveRate - b.solveRate);
  }, [progressData]);

  const weakTopics = topicStats.filter(t => t.attempted > 0 && t.solveRate < 50);
  const strongTopics = topicStats.filter(t => t.solveRate >= 70 && t.solved > 0);
  const needsPractice = topicStats.filter(t => t.attempted === 0 && t.total > 0);

  const recommendedProblems = useMemo(() => {
    const recs: (RoadmapProblem & { reason: string; topicName: string })[] = [];

    // From weak topics: unsolved problems sorted by difficulty
    weakTopics.forEach(ts => {
      const unsolved = ts.problems
        .filter(p => p.status !== 'solved')
        .sort((a, b) => {
          const order = { Easy: 0, Medium: 1, Hard: 2 };
          return (order[a.difficulty as keyof typeof order] || 1) - (order[b.difficulty as keyof typeof order] || 1);
        });
      unsolved.slice(0, 2).forEach(p => {
        recs.push({ ...p, reason: `Weak topic: ${ts.topic} (${ts.solveRate.toFixed(0)}% solve rate)`, topicName: ts.topic });
      });
    });

    // From untouched topics
    needsPractice.slice(0, 3).forEach(ts => {
      const easy = ts.problems.filter(p => p.difficulty === 'Easy');
      const first = easy.length > 0 ? easy[0] : ts.problems[0];
      if (first) {
        recs.push({ ...first, reason: `Unexplored topic: ${ts.topic}`, topicName: ts.topic });
      }
    });

    return recs.slice(0, 10);
  }, [weakTopics, needsPractice]);

  const selectedStats = selectedTopic ? topicStats.find(t => t.topic === selectedTopic) : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-panel-border bg-ide-toolbar px-4 py-2 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-7 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back
        </Button>
        <Brain className="h-4 w-4 text-primary" />
        <span className="font-bold text-foreground">Weak Topic Analyzer</span>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-4">
        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading your progress data...</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-card border-panel-border">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-destructive">{weakTopics.length}</p>
                  <p className="text-[10px] text-muted-foreground">Weak Topics (&lt;50%)</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-panel-border">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-500">{strongTopics.length}</p>
                  <p className="text-[10px] text-muted-foreground">Strong Topics (&gt;70%)</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-panel-border">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-amber-500">{needsPractice.length}</p>
                  <p className="text-[10px] text-muted-foreground">Unexplored Topics</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-panel-border">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{topicStats.length}</p>
                  <p className="text-[10px] text-muted-foreground">Total Topics</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Topic List */}
              <div className="lg:col-span-2">
                <Card className="bg-card border-panel-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" /> Topic-wise Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-2 pr-2">
                        {topicStats.map(ts => {
                          const isWeak = ts.solveRate < 50 && ts.attempted > 0;
                          const isStrong = ts.solveRate >= 70 && ts.solved > 0;
                          const isSelected = selectedTopic === ts.topic;
                          return (
                            <button
                              key={ts.topic}
                              onClick={() => setSelectedTopic(isSelected ? null : ts.topic)}
                              className={`w-full text-left rounded-lg border p-3 transition-all hover:bg-secondary/30 ${
                                isSelected ? 'border-primary bg-primary/5' : 'border-panel-border'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  {isWeak ? <TrendingDown className="h-3 w-3 text-destructive" /> :
                                   isStrong ? <TrendingUp className="h-3 w-3 text-emerald-500" /> :
                                   <Target className="h-3 w-3 text-muted-foreground" />}
                                  <span className="text-sm font-medium text-foreground">{ts.topic}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={isWeak ? 'destructive' : isStrong ? 'default' : 'outline'} className="text-[9px]">
                                    {ts.solveRate.toFixed(0)}%
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground">{ts.solved}/{ts.total}</span>
                                  <ChevronRight className={`h-3 w-3 text-muted-foreground transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                                </div>
                              </div>
                              <Progress
                                value={ts.solveRate}
                                className={`h-1.5 ${isWeak ? '[&>div]:bg-destructive' : isStrong ? '[&>div]:bg-emerald-500' : ''}`}
                              />
                              {isSelected && selectedStats && (
                                <div className="mt-3 space-y-1 border-t border-panel-border pt-2">
                                  {selectedStats.problems.map(p => (
                                    <div key={p.key} className="flex items-center justify-between text-xs">
                                      <div className="flex items-center gap-2">
                                        {p.status === 'solved' ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> :
                                         p.status === 'attempted' ? <XCircle className="h-3 w-3 text-amber-500" /> :
                                         <Circle className="h-3 w-3 text-muted-foreground" />}
                                        <button
                                          onClick={e => { e.stopPropagation(); navigate(`/problem/${p.key}`); }}
                                          className="text-foreground hover:text-primary truncate max-w-[200px]"
                                        >
                                          {p.title}
                                        </button>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[9px]">{p.difficulty}</Badge>
                                        {p.attempts > 0 && <span className="text-[9px] text-muted-foreground">{p.attempts} tries</span>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Recommendations */}
              <div className="space-y-3">
                <Card className="bg-card border-panel-border border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" /> Recommended Practice
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2 pr-2">
                        {recommendedProblems.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-6">
                            Start solving problems to get personalized recommendations!
                          </p>
                        )}
                        {recommendedProblems.map((p, i) => (
                          <button
                            key={`${p.key}-${i}`}
                            onClick={() => navigate(`/problem/${p.key}`)}
                            className="w-full text-left rounded-lg border border-panel-border p-2.5 hover:bg-secondary/30 transition-all"
                          >
                            <p className="text-xs font-medium text-foreground truncate">{p.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[9px]">{p.difficulty}</Badge>
                              <span className="text-[9px] text-muted-foreground truncate">{p.reason}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card className="bg-card border-panel-border bg-gradient-to-br from-destructive/5 to-amber-500/5">
                  <CardContent className="p-4">
                    <h3 className="text-sm font-bold text-foreground mb-2">💡 Tips</h3>
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      <li>• Focus on topics with &lt;50% solve rate first</li>
                      <li>• Start with Easy problems in weak topics</li>
                      <li>• Revisit attempted-but-unsolved problems</li>
                      <li>• Use spaced repetition for topics you've solved</li>
                      <li>• Explore untouched topics regularly</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WeakTopicAnalyzer;
