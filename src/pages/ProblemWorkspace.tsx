import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Play, FlaskConical, Loader2, CheckCircle2, XCircle, Brain, ChevronRight, Code2, GitCompare, Cloud, Keyboard, Sparkles, AlertTriangle, Zap, TrendingUp, Trophy } from 'lucide-react';
import { useAutosave } from '@/hooks/use-autosave';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import CodeEditor from '@/components/CodeEditor';
import AIChatPanel from '@/components/AIChatPanel';
import ConsolePanel, { ConsoleEntry } from '@/components/ConsolePanel';
import TestCasePanel, { TestResult } from '@/components/TestCasePanel';
import TestResultsTable from '@/components/TestResultsTable';
import ExecutionStatus from '@/components/ExecutionStatus';
import ProblemTimer from '@/components/ProblemTimer';
import CodeSnippets from '@/components/CodeSnippets';
import SolutionComparison from '@/components/SolutionComparison';
import ExecutionHistoryPanel, { saveExecutionHistory } from '@/components/ExecutionHistoryPanel';
import KeyboardShortcutsDialog from '@/components/KeyboardShortcutsDialog';
import SuccessCelebration from '@/components/SuccessCelebration';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';
import { STRIVER_ROADMAP, getDifficultyBg, type RoadmapProblem } from '@/lib/striver-roadmap-data';
import { NEETCODE_ROADMAP } from '@/lib/neetcode-roadmap-data';
import { LEETCODE_TOP150_ROADMAP } from '@/lib/leetcode-top150-data';
import { getProblemDetail, PROBLEM_DETAILS, type ProblemDetail } from '@/lib/striver-problem-details';
import { executeJavaCode, type ExecutionStatus as ExecStatusType } from '@/lib/executor';
import { API_BASE_URL } from '@/lib/api';
import ReactMarkdown from 'react-markdown';

// Build a lookup for all problems across all modules
const ALL_ROADMAPS = [...STRIVER_ROADMAP, ...NEETCODE_ROADMAP, ...LEETCODE_TOP150_ROADMAP];

interface EnhancedDetail extends ProblemDetail {
  constraints?: string[];
  hints?: string[];
  approach?: string;
}

function getCachedDetail(key: string): EnhancedDetail | null {
  try {
    const cached = localStorage.getItem(`problem-detail-${key}`);
    if (cached) return JSON.parse(cached);
  } catch {}
  return null;
}

function setCachedDetail(key: string, detail: EnhancedDetail) {
  try {
    localStorage.setItem(`problem-detail-${key}`, JSON.stringify(detail));
  } catch {}
}

const ProblemWorkspace = () => {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const { authUser } = useUser();

  // Find the problem from any roadmap
  const roadmapProblem = useMemo(() => {
    for (const topic of ALL_ROADMAPS) {
      const found = topic.problems.find(p => p.key === key);
      if (found) return { ...found, topic: topic.name };
    }
    return null;
  }, [key]);

  const hasHardcodedDetail = key ? !!PROBLEM_DETAILS[key] : false;

  const [detail, setDetail] = useState<EnhancedDetail>(() => {
    if (!roadmapProblem) return getProblemDetail('', 'Unknown', 'Medium');
    // Check cache first
    if (key) {
      const cached = getCachedDetail(key);
      if (cached) return cached;
    }
    return getProblemDetail(roadmapProblem.key, roadmapProblem.title, roadmapProblem.difficulty);
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');

  // Approach tabs
  type Approach = 'brute' | 'better' | 'optimal';
  const APPROACHES: { key: Approach; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'brute', label: 'Brute Force', icon: <Zap className="h-3 w-3" />, color: 'text-orange-500' },
    { key: 'better', label: 'Better', icon: <TrendingUp className="h-3 w-3" />, color: 'text-blue-500' },
    { key: 'optimal', label: 'Optimal', icon: <Trophy className="h-3 w-3" />, color: 'text-emerald-500' },
  ];
  const [activeApproach, setActiveApproach] = useState<Approach>('brute');
  const [codes, setCodes] = useState<Record<Approach, string>>({
    brute: detail.starterCode,
    better: detail.starterCode,
    optimal: detail.starterCode,
  });

  // Convenience: active code getter/setter
  const code = codes[activeApproach];
  const setCode = useCallback((valOrFn: string | ((prev: string) => string)) => {
    setCodes(prev => ({
      ...prev,
      [activeApproach]: typeof valOrFn === 'function' ? valOrFn(prev[activeApproach]) : valOrFn,
    }));
  }, [activeApproach]);

  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [execStatus, setExecStatus] = useState<ExecStatusType>('ready');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [bottomTab, setBottomTab] = useState<'description' | 'console' | 'results' | 'history' | 'snippets' | 'solutions'>('description');
  const [consoleHeight, setConsoleHeight] = useState(320);
  const [showDescription, setShowDescription] = useState(true);
  const [timeSpent, setTimeSpent] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationTime, setCelebrationTime] = useState<number | undefined>();

  // Autosave active approach code to Supabase + localStorage
  const autosaveWorkspaceCode = useCallback(async (val: string) => {
    if (!authUser || !key) return;
    const saveKey = `${key}__${activeApproach}`;
    try { localStorage.setItem(`workspace-code-${saveKey}`, val); } catch {}
    try {
      await supabase.from('user_code_saves').upsert({
        user_id: authUser.id,
        problem_key: saveKey,
        code: val,
        language: 'java',
      } as any, { onConflict: 'user_id,problem_key' });
    } catch {}
  }, [authUser, key, activeApproach]);

  const { isDirty: wsCodeDirty, isSaving: wsAutoSaving, resetSavedValue: wsResetSaved } = useAutosave(code, autosaveWorkspaceCode, {
    delay: 2000,
    enabled: !!key,
  });

  // Auto-generate full problem details if not hardcoded
  const generateFullDetail = useCallback(async () => {
    if (!roadmapProblem || !key || hasHardcodedDetail) return;
    // Check cache
    const cached = getCachedDetail(key);
    // Re-generate if cached version has fewer than 10 test cases (old format)
    if (cached && cached.testCases.length >= 10) {
      setDetail(cached);
      if (!localStorage.getItem(`workspace-code-${key}`)) setCode(cached.starterCode);
      return;
    }
    setIsGenerating(true);
    setGenerateError('');
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-problem-detail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          title: roadmapProblem.title,
          difficulty: roadmapProblem.difficulty,
          topic: (roadmapProblem as any).topic || '',
        }),
      });
      if (!resp.ok) throw new Error('Failed to generate');
      const { detail: generated } = await resp.json();
      if (generated) {
        const enhanced: EnhancedDetail = {
          key,
          description: generated.description,
          examples: generated.examples || [],
          starterCode: generated.starterCode || detail.starterCode,
          testCases: generated.testCases || [],
          functionName: generated.functionName || 'solve',
          returnType: generated.returnType || 'void',
          params: generated.params || [],
          constraints: generated.constraints,
          hints: generated.hints,
          approach: generated.approach,
        };
        setCachedDetail(key, enhanced);
        setDetail(enhanced);
        // Update code only if user hasn't written anything
        if (!localStorage.getItem(`workspace-code-${key}`) && generated.starterCode) {
          setCode(generated.starterCode);
        }
      }
    } catch (err: any) {
      setGenerateError('Could not auto-generate problem details. You can still code!');
    }
    setIsGenerating(false);
  }, [key, roadmapProblem, hasHardcodedDetail]);

  // Load saved code from DB (with localStorage fallback)
  useEffect(() => {
    let cancelled = false;
    const loadCode = async () => {
      let savedCode: string | null = null;
      // Try DB first
      if (authUser && key) {
        try {
          const { data } = await supabase
            .from('user_code_saves')
            .select('code')
            .eq('user_id', authUser.id)
            .eq('problem_key', key)
            .maybeSingle();
          if (data && (data as any).code) savedCode = (data as any).code;
        } catch {}
      }
      // Fallback to localStorage
      if (!savedCode) {
        savedCode = localStorage.getItem(`workspace-code-${key}`);
      }
      if (cancelled) return;
      if (savedCode && savedCode !== detail.starterCode) {
        setCode(savedCode);
        wsResetSaved(savedCode);
      } else {
        setCode(detail.starterCode);
        wsResetSaved(detail.starterCode);
      }
      setConsoleEntries([]);
      setTestResults([]);
      setBottomTab('description');
    };
    loadCode();
    // Auto-generate if no hardcoded detail
    if (!hasHardcodedDetail) {
      generateFullDetail();
    }
    return () => { cancelled = true; };
  }, [key, authUser?.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod) {
        if (e.key === 'Enter') { e.preventDefault(); handleRun(); }
        if (e.key === 's') { e.preventDefault(); /* autosave handles this */ toast.success('Auto-saved'); }
        if (e.shiftKey && e.key === 'E') { e.preventDefault(); /* AI explain */ }
        if (e.shiftKey && e.key === 'T') { e.preventDefault(); handleRunTests(); }
        if (e.shiftKey && e.key === 'H') { e.preventDefault(); setShowDescription(p => !p); }
        if (e.key === 'k') { e.preventDefault(); setShowShortcuts(p => !p); }
        if (e.key === '1') { e.preventDefault(); setBottomTab('description'); }
        if (e.key === '2') { e.preventDefault(); setBottomTab('console'); }
        if (e.key === '3') { e.preventDefault(); setBottomTab('results'); }
        if (e.key === '4') { e.preventDefault(); setBottomTab('history'); }
        if (e.key === '5') { e.preventDefault(); setBottomTab('snippets'); }
        if (e.key === '6') { e.preventDefault(); setBottomTab('solutions'); }
      }
      if (e.key === 'Escape') { setShowShortcuts(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const addConsoleEntry = (type: ConsoleEntry['type'], text: string) => {
    setConsoleEntries(prev => [...prev, {
      type, text,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
    }]);
  };

  const handleRun = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setExecStatus('sending');
    setBottomTab('console');
    addConsoleEntry('system', '▶ Compiling and running...');
    const startTime = Date.now();
    try {
      const result = await executeJavaCode(code, (s) => setExecStatus(s));
      const execTime = Date.now() - startTime;
      if (result.success) {
        if (result.output) addConsoleEntry('output', result.output);
        addConsoleEntry('info', `✓ Execution completed (${execTime}ms)`);
      } else {
        if (result.error) addConsoleEntry('error', result.error);
      }
      // Save to history
      if (authUser && key) {
        await saveExecutionHistory(authUser.id, key, code, [], result.success, execTime);
        setHistoryRefreshKey(prev => prev + 1);
      }
    } catch (err: any) {
      addConsoleEntry('error', err?.message || 'Execution failed');
      setExecStatus('failed');
    }
    setIsRunning(false);
  };

  // Run Tests: runs ALL test cases, saves progress, shows celebration
  const handleRunTests = async () => {
    if (isRunningTests || detail.testCases.length === 0) return;
    setIsRunningTests(true);
    setTestResults([]);
    setBottomTab('console');
    addConsoleEntry('system', `▶ Running ${detail.testCases.length} test(s)...`);
    const startTime = Date.now();

    const { runAllTests } = await import('@/lib/test-runner');
    const tcInputs = detail.testCases.map(tc => ({ inputs: tc.inputs || {}, expected: (tc.expected || '').trim() }));

    const results = await runAllTests(code, tcInputs, setExecStatus, (idx, r) => {
      addConsoleEntry(
        r.status === 'PASSED' ? 'info' : 'error',
        `Test ${r.test} ${r.status}${r.status === 'FAILED' ? ` (expected: ${r.expected}, got: ${r.actual})` : ''}`
      );
    });

    const execTime = Date.now() - startTime;
    const passed = results.filter(r => r.status === 'PASSED').length;
    const allPassed = passed === results.length;
    addConsoleEntry('system', `\n${passed}/${results.length} tests passed (${execTime}ms).`);
    setTestResults(results);
    setBottomTab('results');
    setExecStatus('complete');
    setIsRunningTests(false);

    // Save execution history
    if (authUser && key) {
      await saveExecutionHistory(authUser.id, key, code, results, allPassed, execTime);
      setHistoryRefreshKey(prev => prev + 1);
    }

    // Update progress in Supabase
    if (authUser && key) {
      try {
        const { data: existing } = await supabase
          .from('user_problem_progress')
          .select('*')
          .eq('user_id', authUser.id)
          .eq('problem_key', key)
          .maybeSingle();

        if (existing) {
          await supabase.from('user_problem_progress').update({
            attempts: (existing as any).attempts + 1,
            last_attempted: new Date().toISOString(),
            ...(allPassed ? { solved: true, solved_at: new Date().toISOString(), status: 'solved' } : { status: 'attempted' }),
          } as any).eq('id', (existing as any).id);
        } else {
          await supabase.from('user_problem_progress').insert({
            user_id: authUser.id,
            problem_key: key,
            attempts: 1,
            last_attempted: new Date().toISOString(),
            ...(allPassed ? { solved: true, solved_at: new Date().toISOString(), status: 'solved' } : { status: 'attempted' }),
          } as any);
        }
        if (allPassed) toast.success('🎉 Problem solved! Progress saved.');
      } catch {}
    }

    // Show celebration modal
    setCelebrationTime(execTime);
    setShowCelebration(true);
  };

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = consoleHeight;
    const onMove = (ev: MouseEvent) => setConsoleHeight(Math.max(100, Math.min(600, startH + (startY - ev.clientY))));
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [consoleHeight]);

  if (!roadmapProblem) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">Problem not found</p>
          <Button onClick={() => navigate('/modules')} className="mt-4">Back to Modules</Button>
        </div>
      </div>
    );
  }

  const tabItems = [
    { key: 'description' as const, label: 'Tests' },
    { key: 'console' as const, label: 'Console' },
    { key: 'results' as const, label: testResults.length > 0 ? `Results (${testResults.filter(r => r.status === 'PASSED').length}/${testResults.length})` : 'Results' },
    { key: 'history' as const, label: '📜 History' },
    { key: 'snippets' as const, label: '📋 Templates' },
    { key: 'solutions' as const, label: '⚡ Solutions' },
  ];

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-panel-border bg-ide-toolbar px-3 py-1.5">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-7 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back
        </Button>
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
        <Badge variant="outline" className="text-[10px]">{(roadmapProblem as any).topic}</Badge>
        <span className="text-sm font-bold text-foreground">{roadmapProblem.title}</span>
        <Badge className={`text-[10px] ${getDifficultyBg(roadmapProblem.difficulty)}`}>
          {roadmapProblem.difficulty}
        </Badge>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            {wsAutoSaving ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> Saving...</>
            ) : wsCodeDirty ? (
              <span className="text-yellow-500">● Unsaved</span>
            ) : (
              <><Cloud className="h-3 w-3 text-green-500" /> Auto-saved</>
            )}
          </span>
          <div className="h-4 w-px bg-panel-border" />
          <ProblemTimer problemId={key || null} onTimeUpdate={setTimeSpent} />
          <div className="h-4 w-px bg-panel-border" />
          <Button variant="ghost" size="sm" onClick={() => setShowShortcuts(true)} className="h-7 w-7 p-0" title="Keyboard Shortcuts (Ctrl+K)">
            <Keyboard className="h-3.5 w-3.5" />
          </Button>
          <Button onClick={handleRun} disabled={isRunning || isRunningTests} size="sm" className="h-7 gap-1 text-xs">
            {isRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            Run
          </Button>
          <Button onClick={handleRunTests} disabled={isRunning || isRunningTests || detail.testCases.length === 0} size="sm" variant="outline" className="h-7 gap-1 text-xs">
            {isRunningTests ? <Loader2 className="h-3 w-3 animate-spin" /> : <FlaskConical className="h-3 w-3" />}
            Run Tests ({detail.testCases.length})
          </Button>
          <ExecutionStatus status={execStatus} />
        </div>
      </div>

      {/* Main layout: 3 columns */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Problem Description */}
        {showDescription && (
          <div className="w-[380px] shrink-0 border-r border-panel-border overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-panel-border bg-ide-toolbar px-3 py-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Problem</span>
              <Button variant="ghost" size="sm" onClick={() => setShowDescription(false)} className="h-5 text-[10px]">
                Hide
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground">{roadmapProblem.title}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`text-[10px] ${getDifficultyBg(roadmapProblem.difficulty)}`}>{roadmapProblem.difficulty}</Badge>
                    <Badge variant="outline" className="text-[10px]">{(roadmapProblem as any).topic}</Badge>
                  </div>
                </div>

                {isGenerating && (
                  <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                    <span className="text-xs text-primary font-medium">Generating full problem details...</span>
                  </div>
                )}

                {generateError && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-xs text-destructive">{generateError}</span>
                    <Button size="sm" variant="outline" className="ml-auto h-6 text-[10px]" onClick={generateFullDetail}>Retry</Button>
                  </div>
                )}

                <div className="prose prose-sm max-w-none dark:prose-invert [&_p]:text-foreground [&_li]:text-foreground">
                  <ReactMarkdown>{detail.description}</ReactMarkdown>
                </div>

                {detail.examples.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Examples</h3>
                    {detail.examples.map((ex, i) => (
                      <div key={i} className="rounded-lg border border-panel-border bg-secondary/30 p-3 space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">Example {i + 1}:</p>
                        <div className="font-mono text-xs">
                          <p><span className="text-muted-foreground">Input:</span> <span className="text-foreground">{ex.input}</span></p>
                          <p><span className="text-muted-foreground">Output:</span> <span className="font-semibold text-foreground">{ex.output}</span></p>
                          {ex.explanation && <p className="text-muted-foreground mt-1">💡 {ex.explanation}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(detail as EnhancedDetail).constraints && (detail as EnhancedDetail).constraints!.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Constraints</h3>
                    <ul className="space-y-1">
                      {(detail as EnhancedDetail).constraints!.map((c, i) => (
                        <li key={i} className="text-xs text-foreground font-mono flex items-start gap-2">
                          <span className="text-muted-foreground mt-0.5">•</span>
                          <code className="bg-secondary/50 px-1.5 py-0.5 rounded text-[11px]">{c}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(detail as EnhancedDetail).hints && (detail as EnhancedDetail).hints!.length > 0 && (
                  <details className="group">
                    <summary className="text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                      💡 Hints ({(detail as EnhancedDetail).hints!.length})
                    </summary>
                    <div className="mt-2 space-y-2">
                      {(detail as EnhancedDetail).hints!.map((h, i) => (
                        <div key={i} className="rounded border border-panel-border bg-primary/5 p-2 text-xs text-foreground">
                          <span className="font-semibold text-primary">Hint {i + 1}:</span> {h}
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {(detail as EnhancedDetail).approach && (
                  <details className="group">
                    <summary className="text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                      🧠 Approach & Complexity
                    </summary>
                    <div className="mt-2 rounded border border-panel-border bg-secondary/20 p-3 text-xs text-foreground">
                      <ReactMarkdown>{(detail as EnhancedDetail).approach!}</ReactMarkdown>
                    </div>
                  </details>
                )}

                {detail.testCases.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Built-in Test Cases</h3>
                    {detail.testCases.map((tc, i) => (
                      <div key={i} className="rounded border border-panel-border bg-secondary/20 p-2 font-mono text-[11px] space-y-0.5">
                        <p className="font-semibold text-muted-foreground">Test {i + 1}:</p>
                        {Object.entries(tc.inputs).map(([k, v]) => (
                          <p key={k}><span className="text-muted-foreground">{k}</span> = <span className="text-foreground">{v}</span></p>
                        ))}
                        <p><span className="text-muted-foreground">Expected:</span> <span className="text-success font-semibold">{tc.expected}</span></p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Center: Code Editor + Bottom */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {!showDescription && (
            <Button variant="ghost" size="sm" onClick={() => setShowDescription(true)} className="absolute z-10 left-1 top-14 h-6 text-[10px]">
              📄 Show
            </Button>
          )}
          <div className="flex-1 overflow-hidden">
            <CodeEditor code={code} onChange={setCode} />
          </div>

          <div onMouseDown={handleDividerMouseDown} className="resize-handle h-1 cursor-row-resize border-t border-panel-border hover:bg-primary/30 transition-colors" />

          {/* Bottom panel */}
          <div className="shrink-0 border-t border-panel-border" style={{ height: consoleHeight }}>
            <div className="flex items-center border-b border-panel-border bg-ide-toolbar">
              {tabItems.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setBottomTab(tab.key)}
                  className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                    bottomTab === tab.key ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="h-[calc(100%-32px)] overflow-hidden">
              {bottomTab === 'description' && (
                <ScrollArea className="h-full">
                  <div className="p-3 space-y-2">
                    {detail.testCases.map((tc, i) => (
                      <div key={i} className="flex items-start gap-3 rounded border border-panel-border bg-secondary/20 p-2 font-mono text-xs">
                        <span className="font-bold text-muted-foreground">#{i + 1}</span>
                        <div className="flex-1 space-y-0.5">
                          {Object.entries(tc.inputs).map(([k, v]) => (
                            <span key={k} className="mr-3"><span className="text-muted-foreground">{k}=</span>{v}</span>
                          ))}
                        </div>
                        <span className="text-success font-semibold">→ {tc.expected}</span>
                      </div>
                    ))}
                    {detail.testCases.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-6">No built-in test cases for this problem yet. Use AI to generate them!</p>
                    )}
                  </div>
                </ScrollArea>
              )}
              {bottomTab === 'console' && (
                <ConsolePanel
                  entries={consoleEntries}
                  isRunning={isRunning || isRunningTests}
                  onClear={() => setConsoleEntries([])}
                  isCollapsed={false}
                  onToggleCollapse={() => {}}
                  isFullscreen={false}
                  onToggleFullscreen={() => {}}
                />
              )}
              {bottomTab === 'results' && (
                <ScrollArea className="h-full">
                  <div className="p-3">
                    {testResults.length > 0 ? (
                      <TestResultsTable results={testResults} />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground py-10">
                        Run tests to see results
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
              {bottomTab === 'history' && authUser && key && (
                <ExecutionHistoryPanel
                  key={historyRefreshKey}
                  userId={authUser.id}
                  problemId={key}
                  onRestoreCode={(restored) => { setCode(restored); toast.success('Code restored from history'); }}
                />
              )}
              {bottomTab === 'snippets' && (
                <CodeSnippets onInsert={(snippet) => setCode(prev => prev + snippet)} />
              )}
              {bottomTab === 'solutions' && (
                <SolutionComparison code={code} problemTitle={roadmapProblem.title} />
              )}
            </div>
          </div>
        </div>

        {/* Right: AI Assistant */}
        <div className="w-[360px] shrink-0 border-l border-panel-border overflow-hidden">
          <AIChatPanel code={code} problemId={null} aiEnabled={true} />
        </div>
      </div>

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />

      {/* Success Celebration Modal */}
      <SuccessCelebration
        open={showCelebration}
        onClose={() => setShowCelebration(false)}
        problemTitle={roadmapProblem?.title || 'Problem'}
        passedCount={testResults.filter(r => r.status === 'PASSED').length}
        totalCount={testResults.length}
        executionTime={celebrationTime}
        onTryAgain={() => setShowCelebration(false)}
        onNextProblem={() => {
          // Find next problem in the same topic
          for (const topic of ALL_ROADMAPS) {
            const idx = topic.problems.findIndex(p => p.key === key);
            if (idx >= 0 && idx < topic.problems.length - 1) {
              navigate(`/problem/${topic.problems[idx + 1].key}`);
              setShowCelebration(false);
              return;
            }
          }
          navigate('/modules');
          setShowCelebration(false);
        }}
      />
    </div>
  );
};

export default ProblemWorkspace;
