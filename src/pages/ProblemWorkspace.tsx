import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Play, FlaskConical, Loader2, CheckCircle2, XCircle, Brain, ChevronRight, Code2, GitCompare, Cloud, Keyboard, Sparkles, AlertTriangle, Zap, TrendingUp, Trophy, Eye, EyeOff, BarChart3, ChevronDown, ChevronUp, MessageSquare, FileText, Bot, Square } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAutosave } from '@/hooks/use-autosave';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
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
import { executeJavaCode, stopExecution, type ExecutionStatus as ExecStatusType } from '@/lib/executor';
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
  // Track whether codes have been loaded from DB to prevent generateFullDetail from overwriting
  const codesLoadedFromDb = useRef(false);

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
  const [bottomTab, setBottomTab] = useState<'description' | 'console' | 'results' | 'history' | 'snippets' | 'solutions' | 'analysis'>('description');
  const [consoleHeight, setConsoleHeight] = useState(320);
  const [showDescription, setShowDescription] = useState(true);
  const [timeSpent, setTimeSpent] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationTime, setCelebrationTime] = useState<number | undefined>();
  const [focusMode, setFocusMode] = useState(false);

  // Complexity analysis state
  interface ComplexityResult {
    timeComplexity: string;
    spaceComplexity: string;
    suggestion: string;
    optimizationPossible?: boolean;
    betterApproach?: string;
    fullExplanation?: string;
  }
  const [analysisResult, setAnalysisResult] = useState<ComplexityResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [showFullExplanation, setShowFullExplanation] = useState(false);

  // Autosave active approach code to Supabase + localStorage
  const autosaveWorkspaceCode = useCallback(async (val: string) => {
    if (!authUser || !key) return;
    const saveKey = `${key}__${activeApproach}`;
    try { localStorage.setItem(`workspace-code-${saveKey}`, val); } catch {}
    try {
      const { error } = await supabase.from('user_code_saves').upsert({
        user_id: authUser.id,
        problem_key: saveKey,
        code: val,
        language: 'java',
      } as any, { onConflict: 'user_id,problem_key' });
      if (error) console.error('Autosave DB error:', error);
    } catch (e) {
      console.error('Autosave exception:', e);
    }
  }, [authUser, key, activeApproach]);

  const { isDirty: wsCodeDirty, isSaving: wsAutoSaving, resetSavedValue: wsResetSaved } = useAutosave(code, autosaveWorkspaceCode, {
    delay: 2000,
    enabled: !!key && !!authUser,
  });

  // Reset autosave ref when switching approaches so it doesn't incorrectly detect dirty
  useEffect(() => {
    wsResetSaved(codes[activeApproach]);
  }, [activeApproach]);

  // Auto-generate full problem details if not hardcoded
  const generateFullDetail = useCallback(async () => {
    if (!roadmapProblem || !key || hasHardcodedDetail) return;
    const cached = getCachedDetail(key);
    if (cached && cached.testCases.length >= 10) {
      setDetail(cached);
      // Only set starter code if codes haven't been loaded from DB yet
      if (!codesLoadedFromDb.current) {
        setCodes(prev => {
          const starter = cached.starterCode;
          return {
            brute: prev.brute === detail.starterCode ? starter : prev.brute,
            better: prev.better === detail.starterCode ? starter : prev.better,
            optimal: prev.optimal === detail.starterCode ? starter : prev.optimal,
          };
        });
      }
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
        // Only update codes if they haven't been loaded from DB
        if (generated.starterCode && !codesLoadedFromDb.current) {
          setCodes(prev => ({
            brute: prev.brute === detail.starterCode ? generated.starterCode : prev.brute,
            better: prev.better === detail.starterCode ? generated.starterCode : prev.better,
            optimal: prev.optimal === detail.starterCode ? generated.starterCode : prev.optimal,
          }));
        }
      }
    } catch (err: any) {
      setGenerateError('Could not auto-generate problem details. You can still code!');
    }
    setIsGenerating(false);
  }, [key, roadmapProblem, hasHardcodedDetail]);

  // Load saved code for ALL approaches from DB (with localStorage fallback)
  useEffect(() => {
    let cancelled = false;
    codesLoadedFromDb.current = false;
    const loadAllCodes = async () => {
      const approaches: Approach[] = ['brute', 'better', 'optimal'];
      const loaded: Record<string, string> = {};
      let anyFromDb = false;
      for (const approach of approaches) {
        const saveKey = `${key}__${approach}`;
        let savedCode: string | null = null;
        if (authUser && key) {
          try {
            const { data, error } = await supabase
              .from('user_code_saves')
              .select('code')
              .eq('user_id', authUser.id)
              .eq('problem_key', saveKey)
              .maybeSingle();
            if (error) console.error('Load code error:', error);
            if (data && (data as any).code) { savedCode = (data as any).code; anyFromDb = true; }
          } catch (e) { console.error('Load code exception:', e); }
        }
        if (!savedCode) {
          savedCode = localStorage.getItem(`workspace-code-${saveKey}`);
        }
        // Also check legacy key (no approach suffix) for brute force migration
        if (!savedCode && approach === 'brute') {
          if (authUser && key) {
            try {
              const { data } = await supabase
                .from('user_code_saves')
                .select('code')
                .eq('user_id', authUser.id)
                .eq('problem_key', key)
                .maybeSingle();
              if (data && (data as any).code) { savedCode = (data as any).code; anyFromDb = true; }
            } catch {}
          }
          if (!savedCode) savedCode = localStorage.getItem(`workspace-code-${key}`);
        }
        if (savedCode) {
          // Also persist to localStorage for faster future loads
          try { localStorage.setItem(`workspace-code-${saveKey}`, savedCode); } catch {}
        }
        loaded[approach] = savedCode || detail.starterCode;
      }
      if (cancelled) return;
      codesLoadedFromDb.current = anyFromDb;
      setCodes({ brute: loaded.brute, better: loaded.better, optimal: loaded.optimal });
      wsResetSaved(loaded[activeApproach] || detail.starterCode);
      setConsoleEntries([]);
      setTestResults([]);
      setBottomTab('description');
    };
    loadAllCodes();
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

  // Analyze complexity
  const handleAnalyze = async () => {
    if (isAnalyzing || !code.trim()) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setShowFullExplanation(false);
    setBottomTab('analysis');
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-complexity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ code, executionTimeMs: 0 }),
      });
      if (!resp.ok) throw new Error('Analysis failed');
      const result = await resp.json();
      setAnalysisResult(result);
    } catch (err: any) {
      toast.error('Complexity analysis failed. Try again.');
    }
    setIsAnalyzing(false);
  };

  // Get full explanation
  const handleFullExplanation = async () => {
    if (isExplaining || !analysisResult) return;
    setIsExplaining(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-complexity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          code,
          executionTimeMs: 0,
          fullExplanation: true,
          problemTitle: roadmapProblem?.title || '',
        }),
      });
      if (!resp.ok) throw new Error('Explanation failed');
      const result = await resp.json();
      setAnalysisResult(prev => prev ? { ...prev, fullExplanation: result.fullExplanation || result.suggestion } : prev);
      setShowFullExplanation(true);
    } catch {
      toast.error('Could not generate explanation.');
    }
    setIsExplaining(false);
  };

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
    { key: 'analysis' as const, label: analysisResult ? '📊 Analysis ✓' : '📊 Analysis' },
    { key: 'history' as const, label: '📜 History' },
    { key: 'snippets' as const, label: '📋 Templates' },
    { key: 'solutions' as const, label: '⚡ Solutions' },
  ];

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header - scrollable on mobile */}
      {/* Header */}
      <div className="flex items-center gap-1 sm:gap-2 border-b border-panel-border bg-ide-toolbar px-2 sm:px-3 py-1.5 overflow-x-auto scrollbar-none">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-7 gap-1 text-xs shrink-0">
          <ArrowLeft className="h-3 w-3" /> <span className="hidden sm:inline">Back</span>
        </Button>
        <ChevronRight className="h-3 w-3 text-muted-foreground hidden sm:block" />
        <Badge variant="outline" className="text-[10px] hidden md:inline-flex">{(roadmapProblem as any).topic}</Badge>
        <span className="text-xs sm:text-sm font-bold text-foreground truncate max-w-[120px] sm:max-w-none">{roadmapProblem.title}</span>
        <Badge className={`text-[10px] shrink-0 ${getDifficultyBg(roadmapProblem.difficulty)}`}>
          {roadmapProblem.difficulty}
        </Badge>
        <div className="ml-auto flex items-center gap-1 sm:gap-2 shrink-0">
          <span className="text-[10px] text-muted-foreground items-center gap-1 hidden md:flex">
            {wsAutoSaving ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> Saving...</>
            ) : wsCodeDirty ? (
              <span className="text-yellow-500">● Unsaved</span>
            ) : (
              <><Cloud className="h-3 w-3 text-green-500" /> Auto-saved</>
            )}
          </span>
          <div className="h-4 w-px bg-panel-border hidden sm:block" />
          <div className="hidden sm:block"><ProblemTimer problemId={key || null} onTimeUpdate={setTimeSpent} /></div>
          <div className="h-4 w-px bg-panel-border hidden sm:block" />
          <Button variant="ghost" size="sm" onClick={() => setFocusMode(!focusMode)} className={`h-7 w-7 p-0 ${focusMode ? 'text-primary' : ''}`} title="Focus Mode">
            {focusMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowShortcuts(true)} className="h-7 w-7 p-0 hidden sm:flex" title="Keyboard Shortcuts (Ctrl+K)">
            <Keyboard className="h-3.5 w-3.5" />
          </Button>
          <Button onClick={handleRun} disabled={isRunning || isRunningTests} size="sm" className="h-7 gap-1 text-xs">
            {isRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            Run
          </Button>
          {(isRunning || isRunningTests) && (
            <Button onClick={() => { stopExecution(); import('@/lib/test-runner').then(m => m.stopTestExecution()); setIsRunning(false); setIsRunningTests(false); setExecStatus('stopped' as any); }} size="sm" variant="destructive" className="h-7 gap-1 text-xs">
              <Square className="h-3 w-3" /> Stop
            </Button>
          )}
          <Button onClick={handleRunTests} disabled={isRunning || isRunningTests || detail.testCases.length === 0} size="sm" variant="outline" className="h-7 gap-1 text-xs">
            {isRunningTests ? <Loader2 className="h-3 w-3 animate-spin" /> : <FlaskConical className="h-3 w-3" />}
            <span className="hidden md:inline">Run Tests ({detail.testCases.length})</span>
            <span className="md:hidden">Test</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs hidden sm:flex">
                <Sparkles className="h-3 w-3" /> AI Tools <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleAnalyze} disabled={isAnalyzing || !code.trim()}>
                <BarChart3 className="h-3.5 w-3.5 mr-2" /> Analyze Code
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('trigger-explain', { detail: '__mistakes__' }))}>
                <AlertTriangle className="h-3.5 w-3.5 mr-2" /> Find Mistakes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('trigger-explain', { detail: '__hints__' }))}>
                <Brain className="h-3.5 w-3.5 mr-2" /> Hints
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                /* trigger AI test case generation via the edge function */
                const genEvent = new CustomEvent('trigger-explain', { detail: '__generate_tests__' });
                window.dispatchEvent(genEvent);
              }}>
                <FlaskConical className="h-3.5 w-3.5 mr-2" /> Generate Test Cases
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('trigger-explain', { detail: '__brute__' }))}>
                <Zap className="h-3.5 w-3.5 mr-2" /> Brute Force Solution
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('trigger-explain', { detail: '__optimal__' }))}>
                <Trophy className="h-3.5 w-3.5 mr-2" /> Optimal Solution
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('trigger-explain', { detail: '__patterns__' }))}>
                <TrendingUp className="h-3.5 w-3.5 mr-2" /> Detect Pattern
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => navigate(`/discuss?problem=${key}`)} size="sm" variant="ghost" className="h-7 gap-1 text-xs hidden lg:flex">
            <MessageSquare className="h-3 w-3" /> Discuss
          </Button>
          <ExecutionStatus status={execStatus} />
        </div>
      </div>

      {/* Mobile action bar - visible only on small screens */}
      <div className="flex sm:hidden items-center gap-1.5 border-b border-panel-border bg-card px-2 py-1.5 overflow-x-auto scrollbar-none">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px] shrink-0">
              <FileText className="h-3 w-3" /> Problem
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] sm:max-w-md p-0">
            <SheetHeader className="px-4 pt-4 pb-2">
              <SheetTitle className="text-sm">{roadmapProblem.title}</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(100%-60px)]">
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={`text-[10px] ${getDifficultyBg(roadmapProblem.difficulty)}`}>{roadmapProblem.difficulty}</Badge>
                  <Badge variant="outline" className="text-[10px]">{(roadmapProblem as any).topic}</Badge>
                </div>
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
                {detail.testCases.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Test Cases</h3>
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
          </SheetContent>
        </Sheet>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px] shrink-0">
              <Bot className="h-3 w-3" /> AI Chat
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[85vw] sm:max-w-md p-0">
            <SheetHeader className="px-4 pt-4 pb-2">
              <SheetTitle className="text-sm">AI Assistant</SheetTitle>
            </SheetHeader>
            <div className="h-[calc(100%-60px)] overflow-hidden">
              <AIChatPanel code={code} problemId={null} aiEnabled={true} />
            </div>
          </SheetContent>
        </Sheet>

        <Button onClick={handleAnalyze} disabled={isAnalyzing || !code.trim()} size="sm" variant="outline" className="h-7 gap-1 text-[11px] shrink-0">
          {isAnalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <BarChart3 className="h-3 w-3" />}
          Analyze
        </Button>
      </div>

      {/* Main layout: responsive columns */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Left: Problem Description */}
        {showDescription && !focusMode && (
          <div className="hidden md:flex w-[340px] lg:w-[380px] shrink-0 border-r border-panel-border overflow-hidden flex-col">
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

          {/* Approach Tabs */}
          <div className="flex items-center gap-0 border-b border-panel-border bg-ide-toolbar px-1">
            {APPROACHES.map(approach => (
              <button
                key={approach.key}
                onClick={() => {
                  setActiveApproach(approach.key);
                  wsResetSaved(codes[approach.key]);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors border-b-2 ${
                  activeApproach === approach.key
                    ? `${approach.color} border-current`
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                {approach.icon}
                {approach.label}
              </button>
            ))}
            <span className="ml-auto text-[10px] text-muted-foreground pr-2">
              {APPROACHES.find(a => a.key === activeApproach)?.label} approach
            </span>
          </div>

          <div className="flex-1 overflow-hidden">
            <CodeEditor code={code} onChange={setCode} />
          </div>

          <div onMouseDown={handleDividerMouseDown} className="resize-handle h-1 cursor-row-resize border-t border-panel-border hover:bg-primary/30 transition-colors" />

          {/* Bottom panel */}
          <div className="shrink-0 border-t border-panel-border" style={{ height: consoleHeight }}>
            <div className="flex items-center border-b border-panel-border bg-ide-toolbar overflow-x-auto scrollbar-none">
              {tabItems.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setBottomTab(tab.key)}
                  className={`px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap shrink-0 ${
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
              {bottomTab === 'analysis' && (
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    {isAnalyzing ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p className="text-xs text-muted-foreground">Analyzing your code complexity...</p>
                      </div>
                    ) : analysisResult ? (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg border border-panel-border bg-secondary/20 p-3">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">⏱️ Time Complexity</p>
                            <p className="text-lg font-bold font-mono text-primary">{analysisResult.timeComplexity}</p>
                          </div>
                          <div className="rounded-lg border border-panel-border bg-secondary/20 p-3">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">💾 Space Complexity</p>
                            <p className="text-lg font-bold font-mono text-primary">{analysisResult.spaceComplexity}</p>
                          </div>
                        </div>
                        {analysisResult.suggestion && (
                          <div className="rounded-lg border border-panel-border bg-primary/5 p-3">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">💡 Suggestion</p>
                            <p className="text-xs text-foreground leading-relaxed">{analysisResult.suggestion}</p>
                          </div>
                        )}
                        {analysisResult.optimizationPossible && analysisResult.betterApproach && (
                          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                            <p className="text-[10px] uppercase tracking-wider font-bold mb-1 text-emerald-600">🚀 Better Approach</p>
                            <p className="text-xs text-foreground leading-relaxed">{analysisResult.betterApproach}</p>
                          </div>
                        )}
                        {showFullExplanation && analysisResult.fullExplanation && (
                          <div className="rounded-lg border border-panel-border bg-secondary/10 p-3">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">📖 Full Explanation</p>
                            <div className="text-xs text-foreground leading-relaxed prose prose-sm max-w-none dark:prose-invert">
                              <ReactMarkdown>{analysisResult.fullExplanation}</ReactMarkdown>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={handleFullExplanation} disabled={isExplaining}>
                            {isExplaining ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />}
                            {showFullExplanation ? 'Refresh Explanation' : 'Full Explanation'}
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={handleAnalyze}>
                            <BarChart3 className="h-3 w-3" /> Re-analyze
                          </Button>
                        </div>
                        <div className="rounded border border-panel-border bg-secondary/10 p-2 text-[10px] text-muted-foreground">
                          💡 Tip: Write different approaches in the Brute/Better/Optimal tabs, then analyze each to compare complexities.
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 gap-3">
                        <BarChart3 className="h-8 w-8 text-muted-foreground/30" />
                        <p className="text-xs text-muted-foreground">Click <strong>Analyze</strong> to get time & space complexity analysis</p>
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
        {!focusMode && (
          <div className="hidden lg:block w-[320px] xl:w-[360px] shrink-0 border-l border-panel-border overflow-hidden">
            <AIChatPanel code={code} problemId={null} aiEnabled={true} />
          </div>
        )}
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
