import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Timer, MessageSquare, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';
import { STRIVER_ROADMAP } from '@/lib/striver-roadmap-data';
import { NEETCODE_ROADMAP } from '@/lib/neetcode-roadmap-data';
import { getProblemDetail } from '@/lib/striver-problem-details';
import CodeEditor from '@/components/CodeEditor';
import ReactMarkdown from 'react-markdown';

const ALL_PROBLEMS = [...STRIVER_ROADMAP, ...NEETCODE_ROADMAP].flatMap(t => t.problems);

const InterviewSimulator = () => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [difficulty, setDifficulty] = useState('Medium');
  const [timeLimit, setTimeLimit] = useState(30);
  const [phase, setPhase] = useState<'setup' | 'coding' | 'review'>('setup');
  const [problem, setProblem] = useState<any>(null);
  const [code, setCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [aiFeedback, setAiFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!authUser) return;
    supabase.from('interview_results').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false }).limit(10)
      .then(({ data }) => setHistory(data || []));
  }, [authUser, phase]);

  useEffect(() => {
    if (phase !== 'coding') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const startInterview = () => {
    const filtered = ALL_PROBLEMS.filter(p => p.difficulty === difficulty);
    const picked = filtered[Math.floor(Math.random() * filtered.length)];
    if (!picked) return;
    const detail = getProblemDetail(picked.key, picked.title, picked.difficulty);
    setProblem({ ...picked, detail });
    setCode(detail.starterCode);
    setTimeLeft(timeLimit * 60);
    setAiFeedback('');
    setPhase('coding');
  };

  const handleSubmit = async () => {
    clearInterval(timerRef.current);
    setPhase('review');
    setLoading(true);

    const elapsed = timeLimit * 60 - timeLeft;
    try {
      const { data } = await supabase.functions.invoke('analyze-complexity', {
        body: { code, mode: 'interview-feedback', problemTitle: problem?.title },
      });
      const feedback = data?.suggestion || data?.bestApproach || 'Good attempt! Review your approach and optimize.';
      const score = Math.max(10, Math.min(100, Math.round(
        (timeLeft > 0 ? 30 : 0) + (feedback.toLowerCase().includes('optimal') ? 40 : 20) + 30
      )));
      setAiFeedback(typeof feedback === 'string' ? feedback : JSON.stringify(feedback));

      if (authUser) {
        await supabase.from('interview_results').insert({
          user_id: authUser.id,
          problem_title: problem?.title || 'Unknown',
          difficulty,
          time_taken_seconds: elapsed,
          score,
          ai_feedback: feedback,
          code_snapshot: code,
        } as any);
      }
    } catch {
      setAiFeedback('Could not get AI feedback. Review your solution manually.');
    }
    setLoading(false);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (!authUser) return <div className="flex h-screen items-center justify-center bg-background"><p className="text-foreground">Please log in</p></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b border-panel-border bg-ide-toolbar px-4 py-2 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-7 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back
        </Button>
        <MessageSquare className="h-4 w-4 text-primary" />
        <span className="font-bold text-foreground">Mock Interview</span>
        {phase === 'coding' && (
          <Badge variant={timeLeft < 60 ? 'destructive' : 'outline'} className="ml-auto font-mono text-sm">
            <Timer className="h-3 w-3 mr-1" /> {fmt(timeLeft)}
          </Badge>
        )}
      </div>

      {phase === 'setup' && (
        <div className="max-w-2xl mx-auto p-6 space-y-6 flex-1">
          <Card>
            <CardHeader><CardTitle>Configure Interview</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Difficulty</label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Time Limit (minutes)</label>
                <Select value={String(timeLimit)} onValueChange={v => setTimeLimit(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={startInterview} className="w-full gap-2">
                <Play className="h-4 w-4" /> Start Interview
              </Button>
            </CardContent>
          </Card>

          {history.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Recent Interviews</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {history.map((h: any) => (
                    <div key={h.id} className="flex items-center justify-between text-xs border-b border-panel-border pb-2">
                      <span className="text-foreground font-medium">{h.problem_title}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{h.difficulty}</Badge>
                        <span className="text-muted-foreground">{fmt(h.time_taken_seconds)}</span>
                        <Badge className="text-[10px]">Score: {h.score}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {phase === 'coding' && problem && (
        <div className="flex flex-1 overflow-hidden">
          <div className="w-[380px] border-r border-panel-border overflow-auto p-4 space-y-3">
            <h2 className="font-bold text-foreground">{problem.title}</h2>
            <Badge className="text-[10px]">{problem.difficulty}</Badge>
            <div className="prose prose-sm dark:prose-invert text-foreground">
              <ReactMarkdown>{problem.detail?.description || ''}</ReactMarkdown>
            </div>
          </div>
          <div className="flex-1 flex flex-col">
            <div className="flex-1"><CodeEditor code={code} onChange={setCode} /></div>
            <div className="border-t border-panel-border p-2 flex justify-end">
              <Button onClick={handleSubmit} size="sm" className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> Submit Solution
              </Button>
            </div>
          </div>
        </div>
      )}

      {phase === 'review' && (
        <div className="max-w-2xl mx-auto p-6 space-y-4 flex-1">
          <Card>
            <CardHeader><CardTitle>Interview Feedback</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Analyzing your solution...
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{aiFeedback}</ReactMarkdown>
                </div>
              )}
            </CardContent>
          </Card>
          <Button onClick={() => setPhase('setup')} variant="outline" className="w-full">
            Start New Interview
          </Button>
        </div>
      )}
    </div>
  );
};

export default InterviewSimulator;
