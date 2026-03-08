import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, Loader2, Sparkles, ChevronRight, Target, TrendingUp, RotateCw, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';
import { STRIVER_ROADMAP, getDifficultyBg, type RoadmapProblem } from '@/lib/striver-roadmap-data';
import { NEETCODE_ROADMAP } from '@/lib/neetcode-roadmap-data';
import { LEETCODE_TOP150_ROADMAP } from '@/lib/leetcode-top150-data';
import ReactMarkdown from 'react-markdown';

const ALL_ROADMAPS = [...STRIVER_ROADMAP, ...NEETCODE_ROADMAP, ...LEETCODE_TOP150_ROADMAP];

interface PathStep {
  problemKey: string;
  title: string;
  difficulty: string;
  topic: string;
  reason: string;
}

const AdaptiveLearningPath = () => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progressData, setProgressData] = useState<any[]>([]);
  const [path, setPath] = useState<PathStep[]>([]);
  const [aiInsight, setAiInsight] = useState('');

  useEffect(() => {
    if (!authUser) { setLoading(false); return; }
    supabase.from('user_problem_progress').select('*').eq('user_id', authUser.id)
      .then(({ data }) => { setProgressData(data || []); setLoading(false); });
  }, [authUser]);

  const topicStats = useMemo(() => {
    const map = new Map<string, { total: number; solved: number; problems: (RoadmapProblem & { topic: string })[] }>();
    ALL_ROADMAPS.forEach(t => {
      t.problems.forEach(p => {
        const e = map.get(t.name) || { total: 0, solved: 0, problems: [] };
        e.total++;
        if (progressData.find(pr => pr.problem_key === p.key && pr.solved)) e.solved++;
        e.problems.push({ ...p, topic: t.name });
        map.set(t.name, e);
      });
    });
    return map;
  }, [progressData]);

  const generatePath = async () => {
    setGenerating(true);
    setAiInsight('');
    setPath([]);

    // Build local adaptive path based on weak topics
    const solvedKeys = new Set(progressData.filter(p => p.solved).map(p => p.problem_key));
    const topicEntries = [...topicStats.entries()]
      .map(([topic, v]) => ({ topic, ...v, rate: v.total > 0 ? v.solved / v.total : 0 }))
      .sort((a, b) => a.rate - b.rate);

    const steps: PathStep[] = [];
    const diffOrder = ['Easy', 'Medium', 'Hard'];

    // Pick problems from weakest topics first
    for (const t of topicEntries) {
      if (steps.length >= 15) break;
      const unsolved = t.problems
        .filter(p => !solvedKeys.has(p.key))
        .sort((a, b) => diffOrder.indexOf(a.difficulty) - diffOrder.indexOf(b.difficulty));
      for (const p of unsolved) {
        if (steps.length >= 15) break;
        if (!steps.find(s => s.problemKey === p.key)) {
          steps.push({
            problemKey: p.key, title: p.title, difficulty: p.difficulty, topic: t.topic,
            reason: t.rate === 0 ? `New topic — start here` : t.rate < 0.3 ? `Weak topic (${Math.round(t.rate * 100)}% solved)` : `Continue progress (${Math.round(t.rate * 100)}% solved)`,
          });
        }
      }
    }
    setPath(steps);

    // Get AI insight
    try {
      const summary = topicEntries.slice(0, 10).map(t =>
        `${t.topic}: ${t.solved}/${t.total} solved (${Math.round(t.rate * 100)}%)`
      ).join('\n');

      const resp = await supabase.functions.invoke('adaptive-path', {
        body: { progressSummary: summary, totalSolved: solvedKeys.size, totalProblems: topicEntries.reduce((a, t) => a + t.total, 0) },
      });

      if (resp.data?.insight) setAiInsight(resp.data.insight);
    } catch (e) {
      console.error('AI insight error:', e);
    }
    setGenerating(false);
  };

  useEffect(() => {
    if (!loading && progressData.length >= 0) generatePath();
  }, [loading]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-background"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border bg-card px-5 py-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-8 gap-1.5 text-xs font-medium rounded-lg">
          <ArrowLeft className="h-3.5 w-3.5" /> Modules
        </Button>
        <div className="h-4 w-px bg-border" />
        <Brain className="h-4 w-4 text-foreground" />
        <span className="text-sm font-semibold tracking-tight">Adaptive Learning Path</span>
        <Badge variant="secondary" className="text-[10px] gap-1"><Sparkles className="h-3 w-3" /> AI-Powered</Badge>
        <Button variant="outline" size="sm" className="ml-auto h-7 text-xs gap-1" onClick={generatePath} disabled={generating}>
          <RotateCw className={`h-3 w-3 ${generating ? 'animate-spin' : ''}`} /> Regenerate
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          {/* AI Insight */}
          {aiInsight && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="text-sm text-foreground prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{aiInsight}</ReactMarkdown>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {generating && (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Generating your personalized path...</span>
            </div>
          )}

          {/* Path Steps */}
          {!generating && path.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Personalized Path ({path.length} problems)</h2>
              {path.map((step, i) => (
                <div
                  key={step.problemKey}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 cursor-pointer transition-colors group"
                  onClick={() => navigate(`/problem/${step.problemKey}`)}
                >
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{step.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px]">{step.topic}</Badge>
                      <span className="text-[10px] text-muted-foreground">{step.reason}</span>
                    </div>
                  </div>
                  <Badge className={`text-[10px] shrink-0 ${getDifficultyBg(step.difficulty)}`}>{step.difficulty}</Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          )}

          {!generating && path.length === 0 && (
            <div className="text-center py-16">
              <Trophy className="h-12 w-12 mx-auto text-primary mb-3" />
              <p className="text-lg font-semibold text-foreground">All caught up!</p>
              <p className="text-sm text-muted-foreground">You've solved all available problems. Amazing work!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdaptiveLearningPath;
