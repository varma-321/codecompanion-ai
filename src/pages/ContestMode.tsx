import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Timer, Trophy, Zap, CheckCircle2, XCircle, Play, RotateCcw, Clock, BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';
import { STRIVER_ROADMAP, type RoadmapProblem } from '@/lib/striver-roadmap-data';
import { NEETCODE_ROADMAP } from '@/lib/neetcode-roadmap-data';
import { LEETCODE_TOP150_ROADMAP } from '@/lib/leetcode-top150-data';

type ContestState = 'setup' | 'running' | 'finished';
type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Mixed';
type QuestionSource = 'all' | 'solved';

const ALL_PROBLEMS = [
  ...STRIVER_ROADMAP.flatMap(t => t.problems),
  ...NEETCODE_ROADMAP.flatMap(t => t.problems),
  ...LEETCODE_TOP150_ROADMAP.flatMap(t => t.problems),
];

// Deduplicate by key
const UNIQUE_PROBLEMS = (() => {
  const seen = new Set<string>();
  return ALL_PROBLEMS.filter(p => {
    if (seen.has(p.key)) return false;
    seen.add(p.key);
    return true;
  });
})();

function pickRandom(arr: RoadmapProblem[], count: number, difficulty: Difficulty): RoadmapProblem[] {
  let pool = difficulty === 'Mixed' ? arr : arr.filter(p => p.difficulty === difficulty);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

interface ContestResult {
  problem: RoadmapProblem;
  solved: boolean;
  timeSpent: number;
}

const ContestMode = () => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [state, setState] = useState<ContestState>('setup');
  const [difficulty, setDifficulty] = useState<Difficulty>('Mixed');
  const [problemCount, setProblemCount] = useState(5);
  const [timeLimit, setTimeLimit] = useState(30);
  const [questionSource, setQuestionSource] = useState<QuestionSource>('all');
  const [problems, setProblems] = useState<RoadmapProblem[]>([]);
  const [results, setResults] = useState<ContestResult[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [problemStart, setProblemStart] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const [pastResults, setPastResults] = useState<any[]>([]);
  const [solvedKeys, setSolvedKeys] = useState<Set<string>>(new Set());
  const [loadingSolved, setLoadingSolved] = useState(false);

  useEffect(() => {
    if (!authUser) return;
    supabase
      .from('contest_results')
      .select('*')
      .eq('user_id', authUser.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setPastResults(data || []));

    // Load solved problem keys
    setLoadingSolved(true);
    supabase
      .from('user_problem_progress')
      .select('problem_key')
      .eq('user_id', authUser.id)
      .eq('solved', true)
      .then(({ data }) => {
        setSolvedKeys(new Set((data || []).map(d => d.problem_key)));
        setLoadingSolved(false);
      });
  }, [authUser, state]);

  const startContest = () => {
    let pool = UNIQUE_PROBLEMS;
    if (questionSource === 'solved' && solvedKeys.size > 0) {
      pool = UNIQUE_PROBLEMS.filter(p => solvedKeys.has(p.key));
    }
    const selected = pickRandom(pool, problemCount, difficulty);
    setProblems(selected);
    setResults([]);
    setCurrentIdx(0);
    setElapsed(0);
    setProblemStart(0);
    setState('running');

    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1;
        if (next >= timeLimit * 60) {
          finishContest();
        }
        return next;
      });
    }, 1000);
  };

  const finishContest = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setState('finished');

    if (!authUser) return;
    const solved = results.filter(r => r.solved).length;
    const score = results.reduce((s, r) => {
      if (!r.solved) return s;
      const base = r.problem.difficulty === 'Easy' ? 100 : r.problem.difficulty === 'Medium' ? 200 : 300;
      return s + base;
    }, 0);

    await supabase.from('contest_results').insert({
      user_id: authUser.id,
      contest_type: difficulty,
      problems_attempted: results.length,
      problems_solved: solved,
      total_time_seconds: elapsed,
      score,
      problem_keys: problems.map(p => p.key),
    } as any);
  }, [authUser, results, elapsed, problems, difficulty]);

  const markProblem = (solved: boolean) => {
    const timeSpent = elapsed - problemStart;
    const newResults = [...results, { problem: problems[currentIdx], solved, timeSpent }];
    setResults(newResults);

    if (currentIdx + 1 < problems.length) {
      setCurrentIdx(currentIdx + 1);
      setProblemStart(elapsed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setState('finished');
      if (authUser) {
        const solvedCount = newResults.filter(r => r.solved).length;
        const score = newResults.reduce((s, r) => {
          if (!r.solved) return s;
          const base = r.problem.difficulty === 'Easy' ? 100 : r.problem.difficulty === 'Medium' ? 200 : 300;
          return s + base;
        }, 0);
        supabase.from('contest_results').insert({
          user_id: authUser.id,
          contest_type: difficulty,
          problems_attempted: newResults.length,
          problems_solved: solvedCount,
          total_time_seconds: elapsed,
          score,
          problem_keys: problems.map(p => p.key),
        } as any);
      }
    }
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const remaining = Math.max(0, timeLimit * 60 - elapsed);

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-panel-border bg-ide-toolbar px-4 py-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="h-7 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold">Contest Mode</span>
        </div>
        {state === 'running' && (
          <Badge variant={remaining < 60 ? 'destructive' : 'secondary'} className="ml-auto font-mono text-xs">
            ⏱ {formatTime(remaining)}
          </Badge>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          {state === 'setup' && (
            <>
              <div>
                <h1 className="text-xl font-bold text-foreground">🏆 Start a Contest</h1>
                <p className="text-sm text-muted-foreground mt-1">Test yourself under timed conditions</p>
              </div>

              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Difficulty</label>
                      <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mixed">Mixed</SelectItem>
                          <SelectItem value="Easy">Easy</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Problems</label>
                      <Select value={String(problemCount)} onValueChange={(v) => setProblemCount(Number(v))}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[3, 5, 7, 10].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Time (min)</label>
                      <Select value={String(timeLimit)} onValueChange={(v) => setTimeLimit(Number(v))}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[15, 30, 45, 60, 90].map(n => <SelectItem key={n} value={String(n)}>{n} min</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Source</label>
                      <Select value={questionSource} onValueChange={(v) => setQuestionSource(v as QuestionSource)}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Problems</SelectItem>
                          <SelectItem value="solved" disabled={solvedKeys.size === 0}>
                            Solved ({solvedKeys.size})
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {questionSource === 'solved' && solvedKeys.size === 0 && (
                    <p className="text-xs text-warning">You haven't solved any problems yet. Solve problems in any module first.</p>
                  )}

                  <Button 
                    className="w-full gap-2" 
                    onClick={startContest}
                    disabled={questionSource === 'solved' && solvedKeys.size === 0}
                  >
                    <Play className="h-4 w-4" /> Start Contest
                  </Button>
                </CardContent>
              </Card>

              {pastResults.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-foreground mb-2">Past Contests</h2>
                  <div className="space-y-2">
                    {pastResults.map((r: any) => (
                      <Card key={r.id}>
                        <CardContent className="p-3 flex items-center gap-3">
                          <Trophy className="h-4 w-4 text-warning" />
                          <div className="flex-1">
                            <div className="text-xs font-medium">{r.problems_solved}/{r.problems_attempted} solved</div>
                            <div className="text-[10px] text-muted-foreground">{r.contest_type} · {formatTime(r.total_time_seconds)} · {new Date(r.created_at).toLocaleDateString()}</div>
                          </div>
                          <Badge variant="secondary" className="font-mono text-xs">{r.score} pts</Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {state === 'running' && problems[currentIdx] && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">Problem {currentIdx + 1} of {problems.length}</Badge>
                <Progress value={((currentIdx) / problems.length) * 100} className="w-32 h-1.5" />
              </div>

              <Card className="border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={problems[currentIdx].difficulty === 'Easy' ? 'bg-success' : problems[currentIdx].difficulty === 'Medium' ? 'bg-warning' : 'bg-destructive'}>
                      {problems[currentIdx].difficulty}
                    </Badge>
                  </div>
                  <h2 className="text-lg font-bold text-foreground">{problems[currentIdx].title}</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Solve this problem in the workspace, then mark it as solved or skipped.
                  </p>

                  <div className="flex gap-2 mt-6">
                    <Button className="flex-1 gap-2" onClick={() => navigate(`/problem/${problems[currentIdx].key}?title=${encodeURIComponent(problems[currentIdx].title)}`)}>
                      <Zap className="h-4 w-4" /> Open in Workspace
                    </Button>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="default" className="flex-1 gap-2 bg-success hover:bg-success/80" onClick={() => markProblem(true)}>
                      <CheckCircle2 className="h-4 w-4" /> Solved
                    </Button>
                    <Button variant="outline" className="flex-1 gap-2" onClick={() => markProblem(false)}>
                      <XCircle className="h-4 w-4" /> Skip
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Button variant="destructive" size="sm" className="gap-1" onClick={finishContest}>
                End Contest Early
              </Button>
            </div>
          )}

          {state === 'finished' && (
            <div className="space-y-4">
              <div className="text-center">
                <Trophy className="h-10 w-10 text-warning mx-auto mb-2" />
                <h1 className="text-xl font-bold text-foreground">Contest Complete!</h1>
              </div>

              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">{results.filter(r => r.solved).length}</div>
                      <div className="text-[10px] text-muted-foreground">Solved</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-foreground">{results.length}</div>
                      <div className="text-[10px] text-muted-foreground">Attempted</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-warning">{formatTime(elapsed)}</div>
                      <div className="text-[10px] text-muted-foreground">Time</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-1">
                {results.map((r, i) => (
                  <div key={i} className={`flex items-center gap-3 rounded-md px-3 py-2 text-xs ${r.solved ? 'bg-success/5' : 'bg-destructive/5'}`}>
                    {r.solved ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
                    <span className="flex-1 font-medium">{r.problem.title}</span>
                    <Badge variant="outline" className="text-[9px]">{r.problem.difficulty}</Badge>
                    <span className="text-[10px] text-muted-foreground font-mono">{formatTime(r.timeSpent)}</span>
                  </div>
                ))}
              </div>

              <Button className="w-full gap-2" onClick={() => setState('setup')}>
                <RotateCcw className="h-4 w-4" /> New Contest
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContestMode;
