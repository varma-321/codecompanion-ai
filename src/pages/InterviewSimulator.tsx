import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Timer, MessageSquare, Loader2, CheckCircle2, Shuffle, Building2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';
import { STRIVER_ROADMAP } from '@/lib/striver-roadmap-data';
import { NEETCODE_ROADMAP } from '@/lib/neetcode-roadmap-data';
import { LEETCODE_TOP150_ROADMAP } from '@/lib/leetcode-top150-data';
import { getProblemDetail } from '@/lib/striver-problem-details';
import CodeEditor from '@/components/CodeEditor';
import ReactMarkdown from 'react-markdown';

// ─── Problem pool helpers ────────────────────────────────────────

const MODULES = {
  striver: { label: 'Striver SDE Sheet', data: STRIVER_ROADMAP },
  neetcode: { label: 'NeetCode 150', data: NEETCODE_ROADMAP },
  leetcode150: { label: 'LeetCode Top 150', data: LEETCODE_TOP150_ROADMAP },
};

type ModuleKey = keyof typeof MODULES | 'all';

const ALL_ROADMAPS = [...STRIVER_ROADMAP, ...NEETCODE_ROADMAP, ...LEETCODE_TOP150_ROADMAP];
const ALL_PROBLEMS = ALL_ROADMAPS.flatMap(t => t.problems.map(p => ({ ...p, topic: t.name })));

// Title lookup for company matching
const TITLE_LOOKUP = new Map<string, typeof ALL_PROBLEMS[0]>();
ALL_PROBLEMS.forEach(p => {
  const normalized = p.title.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!TITLE_LOOKUP.has(normalized)) TITLE_LOOKUP.set(normalized, p);
});

function findBySlug(slug: string) {
  const normalized = slug.replace(/-/g, '');
  if (TITLE_LOOKUP.has(normalized)) return TITLE_LOOKUP.get(normalized)!;
  const terms = slug.split('-').filter(Boolean);
  for (const [key, prob] of TITLE_LOOKUP) {
    if (terms.every(t => key.includes(t))) return prob;
  }
  return null;
}

// Import company tags from CompanyTags (inline subset for lookup)
const COMPANY_TAGS: Record<string, string[]> = {
  'Google': ['two-sum', 'median-two-sorted', 'merge-intervals', 'lru-cache', 'trapping-rain', 'longest-substring', 'course-schedule', 'number-of-islands', 'valid-parentheses', 'container-most-water', 'three-sum', 'group-anagrams', 'product-except-self', 'top-k-frequent', 'coin-change', 'climbing-stairs', 'maximum-subarray', 'best-time-buy-sell', 'binary-search', 'search-rotated', 'word-break', 'longest-increasing', 'edit-distance', 'rotate-image', 'spiral-matrix', 'longest-palindrome', 'decode-ways', 'unique-paths', 'jump-game', 'house-robber', 'word-search', 'subsets', 'permutations', 'combination-sum', 'find-median-stream', 'sliding-window-max', 'daily-temperatures', 'task-scheduler'],
  'Amazon': ['two-sum', 'add-two-numbers', 'lru-cache', 'merge-intervals', 'number-of-islands', 'word-break', 'product-except-self', 'merge-k-sorted', 'trapping-rain', 'longest-substring', 'valid-parentheses', 'three-sum', 'group-anagrams', 'top-k-frequent', 'coin-change', 'climbing-stairs', 'maximum-subarray', 'best-time-buy-sell', 'binary-search', 'search-rotated', 'reverse-linked-list', 'merge-two-sorted', 'longest-palindrome', 'decode-string', 'daily-temperatures', 'task-scheduler', 'subsets', 'permutations', 'combination-sum', 'word-search', 'jump-game', 'unique-paths', 'house-robber'],
  'Meta': ['two-sum', 'longest-substring', 'valid-parentheses', 'merge-intervals', 'product-except-self', 'three-sum', 'group-anagrams', 'top-k-frequent', 'coin-change', 'number-of-islands', 'word-break', 'container-most-water', 'trapping-rain', 'lru-cache', 'best-time-buy-sell', 'maximum-subarray', 'reverse-linked-list', 'longest-palindrome', 'decode-ways', 'unique-paths', 'subsets', 'permutations', 'combination-sum', 'generate-parentheses', 'word-search', 'jump-game', 'house-robber', 'daily-temperatures', 'find-median-stream'],
  'Microsoft': ['two-sum', 'reverse-linked-list', 'lru-cache', 'merge-intervals', 'product-except-self', 'spiral-matrix', 'number-of-islands', 'word-search', 'group-anagrams', 'three-sum', 'valid-parentheses', 'trapping-rain', 'longest-substring', 'top-k-frequent', 'coin-change', 'climbing-stairs', 'maximum-subarray', 'best-time-buy-sell', 'binary-search', 'search-rotated', 'longest-palindrome', 'decode-ways', 'unique-paths', 'jump-game', 'house-robber', 'subsets', 'permutations', 'daily-temperatures', 'task-scheduler'],
  'Apple': ['two-sum', 'valid-parentheses', 'merge-two-sorted', 'best-time-buy-sell', 'three-sum', 'container-most-water', 'number-of-islands', 'reverse-linked-list', 'climbing-stairs', 'maximum-subarray', 'binary-search', 'group-anagrams', 'product-except-self', 'top-k-frequent', 'coin-change', 'merge-intervals', 'lru-cache', 'longest-substring', 'decode-ways', 'unique-paths', 'house-robber', 'word-search', 'subsets', 'longest-palindrome', 'jump-game', 'daily-temperatures'],
  'Bloomberg': ['two-sum', 'valid-parentheses', 'merge-intervals', 'lru-cache', 'three-sum', 'group-anagrams', 'top-k-frequent', 'coin-change', 'number-of-islands', 'word-break', 'product-except-self', 'best-time-buy-sell', 'maximum-subarray', 'reverse-linked-list', 'trapping-rain', 'longest-substring', 'daily-temperatures', 'sliding-window-max', 'task-scheduler', 'decode-ways', 'unique-paths', 'house-robber'],
  'Uber': ['two-sum', 'merge-intervals', 'word-break', 'number-of-islands', 'course-schedule', 'lru-cache', 'longest-substring', 'three-sum', 'valid-parentheses', 'group-anagrams', 'product-except-self', 'top-k-frequent', 'coin-change', 'best-time-buy-sell', 'binary-search', 'search-rotated', 'reverse-linked-list', 'unique-paths', 'jump-game', 'daily-temperatures', 'subsets', 'combination-sum'],
  'Goldman Sachs': ['two-sum', 'trapping-rain', 'median-two-sorted', 'lru-cache', 'number-of-islands', 'coin-change', 'edit-distance', 'longest-increasing', 'three-sum', 'valid-parentheses', 'group-anagrams', 'product-except-self', 'top-k-frequent', 'best-time-buy-sell', 'binary-search', 'merge-intervals', 'decode-ways', 'unique-paths', 'house-robber', 'daily-temperatures'],
  'TikTok / ByteDance': ['two-sum', 'lru-cache', 'merge-intervals', 'trapping-rain', 'longest-substring', 'three-sum', 'number-of-islands', 'valid-parentheses', 'group-anagrams', 'product-except-self', 'top-k-frequent', 'coin-change', 'best-time-buy-sell', 'binary-search', 'search-rotated', 'reverse-linked-list', 'word-break', 'longest-palindrome', 'decode-ways', 'unique-paths', 'jump-game', 'subsets', 'permutations', 'daily-temperatures', 'sliding-window-max'],
  'Netflix': ['lru-cache', 'merge-intervals', 'top-k-frequent', 'find-median-stream', 'course-schedule', 'longest-substring', 'two-sum', 'three-sum', 'number-of-islands', 'coin-change', 'longest-increasing', 'product-except-self', 'group-anagrams', 'daily-temperatures', 'unique-paths', 'house-robber', 'decode-ways'],
};

const COMPANY_NAMES = Object.keys(COMPANY_TAGS);

// ─── Component ───────────────────────────────────────────────────

const InterviewSimulator = () => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [difficulty, setDifficulty] = useState('all');
  const [timeLimit, setTimeLimit] = useState(30);
  const [source, setSource] = useState<'random' | 'module' | 'company' | 'solved'>('random');
  const [selectedModule, setSelectedModule] = useState<ModuleKey>('all');
  const [selectedCompany, setSelectedCompany] = useState(COMPANY_NAMES[0]);
  const [phase, setPhase] = useState<'setup' | 'coding' | 'review'>('setup');
  const [problem, setProblem] = useState<any>(null);
  const [code, setCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [aiFeedback, setAiFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [solvedKeys, setSolvedKeys] = useState<Set<string>>(new Set());
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!authUser) return;
    supabase.from('interview_results').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false }).limit(10)
      .then(({ data }) => setHistory(data || []));
    // Load solved keys
    supabase.from('user_problem_progress').select('problem_key').eq('user_id', authUser.id).eq('solved', true)
      .then(({ data }) => setSolvedKeys(new Set((data || []).map(d => d.problem_key))));
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

  // Build the problem pool based on source selection
  const problemPool = useMemo(() => {
    let pool: typeof ALL_PROBLEMS = [];

    if (source === 'company') {
      const slugs = COMPANY_TAGS[selectedCompany] || [];
      pool = slugs.map(s => findBySlug(s)).filter(Boolean) as typeof ALL_PROBLEMS;
    } else if (source === 'module') {
      if (selectedModule === 'all') {
        pool = ALL_PROBLEMS;
      } else {
        const mod = MODULES[selectedModule];
        pool = mod.data.flatMap(t => t.problems.map(p => ({ ...p, topic: t.name })));
      }
    } else {
      // random from everything
      pool = ALL_PROBLEMS;
    }

    // Filter by difficulty
    if (difficulty !== 'all') {
      pool = pool.filter(p => p.difficulty === difficulty);
    }

    // Deduplicate by key
    const seen = new Set<string>();
    return pool.filter(p => {
      if (seen.has(p.key)) return false;
      seen.add(p.key);
      return true;
    });
  }, [source, selectedModule, selectedCompany, difficulty]);

  const startInterview = () => {
    if (problemPool.length === 0) return;
    const picked = problemPool[Math.floor(Math.random() * problemPool.length)];
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
          difficulty: problem?.difficulty || 'Medium',
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

              {/* Source selection */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Question Source</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: 'random' as const, label: 'Random (All)', icon: <Shuffle className="h-3.5 w-3.5" /> },
                    { key: 'module' as const, label: 'By Module', icon: <BookOpen className="h-3.5 w-3.5" /> },
                    { key: 'company' as const, label: 'By Company', icon: <Building2 className="h-3.5 w-3.5" /> },
                  ]).map(s => (
                    <button
                      key={s.key}
                      onClick={() => setSource(s.key)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors ${
                        source === s.key
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/20'
                      }`}
                    >
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Module selector */}
              {source === 'module' && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Module</label>
                  <Select value={selectedModule} onValueChange={v => setSelectedModule(v as ModuleKey)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Modules</SelectItem>
                      <SelectItem value="striver">Striver SDE Sheet</SelectItem>
                      <SelectItem value="neetcode">NeetCode 150</SelectItem>
                      <SelectItem value="leetcode150">LeetCode Top 150</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Company selector */}
              {source === 'company' && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Company</label>
                  <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COMPANY_NAMES.map(c => (
                        <SelectItem key={c} value={c}>{c} ({COMPANY_TAGS[c].length} problems)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Difficulty */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Difficulty</label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Difficulty</SelectItem>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Time limit */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Time Limit</label>
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

              {/* Pool info */}
              <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{problemPool.length}</span> problems in pool
                {source === 'company' && <span> from <span className="font-semibold text-foreground">{selectedCompany}</span></span>}
                {source === 'module' && selectedModule !== 'all' && <span> from <span className="font-semibold text-foreground">{MODULES[selectedModule].label}</span></span>}
                {difficulty !== 'all' && <span> ({difficulty})</span>}
              </div>

              <Button onClick={startInterview} disabled={problemPool.length === 0} className="w-full gap-2">
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
                      <span className="text-foreground font-medium truncate max-w-[180px]">{h.problem_title}</span>
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
            <div className="flex items-center gap-2">
              <Badge className="text-[10px]">{problem.difficulty}</Badge>
              {problem.topic && <Badge variant="outline" className="text-[10px]">{problem.topic}</Badge>}
            </div>
            <div className="prose prose-sm dark:prose-invert text-foreground">
              <ReactMarkdown>{problem.detail?.description || ''}</ReactMarkdown>
            </div>
            {problem.detail?.examples?.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Examples</h3>
                {problem.detail.examples.map((ex: any, i: number) => (
                  <div key={i} className="rounded border border-panel-border bg-secondary/30 p-2 font-mono text-[11px] space-y-0.5">
                    <p><span className="text-muted-foreground">Input:</span> {ex.input}</p>
                    <p><span className="text-muted-foreground">Output:</span> <span className="font-semibold">{ex.output}</span></p>
                  </div>
                ))}
              </div>
            )}
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
