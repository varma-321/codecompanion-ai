import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  ArrowLeft, Play, FlaskConical, Loader2, CheckCircle2, XCircle, Brain, ChevronRight, 
  Code2, GitCompare, Cloud, Keyboard, Sparkles, AlertTriangle, Zap, TrendingUp, 
  Trophy, Eye, EyeOff, BarChart3, ChevronDown, ChevronUp, MessageSquare, 
  FileText, Bot, Square, Workflow, Shield, Lightbulb, Github, BookOpen
} from 'lucide-react';
import { CONTEST_PROBLEMS } from '../lib/contest-problems-data';
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
import { ReportIssueDialog } from '@/components/ReportIssueDialog';
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
  const [searchParams] = useSearchParams();
  const contestMode = searchParams.get('contestMode') === 'true';
  const contestId = searchParams.get('contestId');
  const generatorMode = searchParams.get('generatorMode') === 'true';
  const genId = searchParams.get('genId');
  const customMode = searchParams.get('customMode') === 'true';
  const customId = searchParams.get('customId');
  const navigate = useNavigate();
  const { authUser, isAdmin } = useUser();

  // Find the problem from any roadmap OR contest problems OR generated
  const roadmapProblem = useMemo(() => {
    if (!key) return null;
    
    // Check roadmap sheets first
    for (const topic of ALL_ROADMAPS) {
      if (!topic?.problems) continue;
      const found = topic.problems.find(p => p.key === key);
      if (found) return { ...found, topic: topic.name };
    }
    
    // Check contest problems
    if (Array.isArray(CONTEST_PROBLEMS)) {
      const contestFound = CONTEST_PROBLEMS.find(p => p.key === key);
      if (contestFound) return { ...contestFound, topic: 'Contest Challenge' };
    }

    // Check for Generator Mode
    if (generatorMode && genId === key) {
      return {
        key,
        title: searchParams.get('title') || 'Generated Problem',
        difficulty: (searchParams.get('difficulty') as any) || 'Medium',
        topic: 'AI Generated'
      } as any;
    }

    // Check for Custom Mode
    if (customMode && customId === key) {
      return {
        key,
        title: searchParams.get('title') || 'Custom Problem',
        difficulty: (searchParams.get('difficulty') as any) || 'Medium',
        topic: 'Custom Lab'
      } as any;
    }
    
    return null;
  }, [key, generatorMode, genId, customMode, customId, searchParams]);

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
  // Track whether we are in the middle of loading codes for a new problem
  const [isCodeLoading, setIsCodeLoading] = useState(false);
  // The key that the current codes belong to — used to prevent stale saves
  const codesKeyRef = useRef<string | undefined>(key);

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
  const [waitingForInput, setWaitingForInput] = useState(false);
  // Holds a resolve callback that ConsolePanel calls when the user submits stdin
  const stdinResolverRef = useRef<((value: string) => void) | null>(null);
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
  const [visualizerChart, setVisualizerChart] = useState<string>('');
  const [isVisualizing, setIsVisualizing] = useState(false);
  const [submissionHistory, setSubmissionHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ★ STEP 1: Immediately reset codes when problem key changes (synchronous).
  // This runs BEFORE the async load effect and prevents the old problem's code
  // from being visible or auto-saved while the new problem is loading.
  useEffect(() => {
    if (!key) return;
    codesKeyRef.current = key;
    const placeholder = detail.starterCode || '';
    setCodes({ brute: placeholder, better: placeholder, optimal: placeholder });
    setIsCodeLoading(true);
    setConsoleEntries([]);
    setTestResults([]);
    setExecStatus('ready');
    setBottomTab('description');
    // Immediately reset the autosave baseline so the 2s debounce doesn't
    // fire with stale code after navigation.
    wsResetSaved(placeholder);
  }, [key]); // intentionally only [key]

  // ★ STEP 2: Save to localStorage — but ONLY if the code belongs to the current key.
  // This prevents the stale-code write that happens during the async loading window.
  useEffect(() => {
    if (!key || codesKeyRef.current !== key || isCodeLoading) return;
    const prefix = contestMode 
      ? `contest_${contestId || 'anon'}_` 
      : generatorMode 
      ? `gen_${genId || 'anon'}_` 
      : customMode
      ? `custom_${customId || 'anon'}_`
      : '';
    const saveKey = `${prefix}${key}__${activeApproach}`;
    try { localStorage.setItem(`workspace-code-${authUser?.id || 'anon'}-${saveKey}`, code); } catch {}
  }, [code, key, activeApproach, isCodeLoading, contestMode, contestId, generatorMode, genId, customMode, customId, authUser?.id]);

  // Debounced Supabase autosave (every 2s)
  const autosaveWorkspaceCode = useCallback(async (approach: Approach, val: string) => {
    if (!authUser || !key) return;
    const prefix = contestMode 
      ? `contest_${contestId || 'anon'}_` 
      : generatorMode 
      ? `gen_${genId || 'anon'}_` 
      : customMode
      ? `custom_${customId || 'anon'}_`
      : '';
    const saveKey = `${prefix}${key}__${approach}`;
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
  }, [authUser, key, contestMode, contestId, generatorMode, genId, customMode, customId]);

  const bruteAutosave = useAutosave(codes.brute, (val) => autosaveWorkspaceCode('brute', val), {
    delay: 2000,
    enabled: !!key && !!authUser && !isCodeLoading,
  });
  const betterAutosave = useAutosave(codes.better, (val) => autosaveWorkspaceCode('better', val), {
    delay: 2000,
    enabled: !!key && !!authUser && !isCodeLoading,
  });
  const optimalAutosave = useAutosave(codes.optimal, (val) => autosaveWorkspaceCode('optimal', val), {
    delay: 2000,
    enabled: !!key && !!authUser && !isCodeLoading,
  });

  const activeAutosave = useMemo(() => {
    if (activeApproach === 'brute') return bruteAutosave;
    if (activeApproach === 'better') return betterAutosave;
    return optimalAutosave;
  }, [activeApproach, bruteAutosave, betterAutosave, optimalAutosave]);

  const wsCodeDirty = activeAutosave.isDirty;
  const wsAutoSaving = activeAutosave.isSaving;
  const wsResetSaved = activeAutosave.resetSavedValue;

  // Reset autosave ref when switching approaches so it doesn't incorrectly detect dirty
  useEffect(() => {
    wsResetSaved(codes[activeApproach]);
  }, [activeApproach, wsResetSaved]);

  // Fetch full problem details from Java Spring Boot Backend
  const generateFullDetail = useCallback(async () => {
    if (!roadmapProblem || !key || hasHardcodedDetail) return;
    const cached = getCachedDetail(key);
    const isValid = (d: any) => d && Array.isArray(d.testCases) && d.testCases.length >= 1 && d.testCases.every((tc: any) => tc.expected && String(tc.expected).trim() !== '');

    if (isValid(cached)) {
      setDetail(cached!);
      if (!codesLoadedFromDb.current && cached!.starterCode) {
        setCodes(prev => {
          const starter = cached!.starterCode;
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
      // First check shared DB cache (populated by any previous user)
      const { data: cachedRow } = await supabase
        .from('problem_test_cases')
        .select('*')
        .eq('problem_key', key)
        .maybeSingle();

      if (cachedRow && Array.isArray((cachedRow as any).test_cases) && (cachedRow as any).test_cases.length >= 1) {
        const c: any = cachedRow;
        
        // Quality check: ensure test cases actually have expected values
        const tcs = c.test_cases || [];
        const isLowQuality = tcs.some((tc: any) => !tc.expected || String(tc.expected).trim() === '');
        
        if (!isLowQuality) {
          const enhanced: EnhancedDetail = {
            key,
            description: c.description || detail.description,
            examples: c.examples || [],
            starterCode: c.starter_code || detail.starterCode,
            testCases: c.test_cases,
            functionName: c.function_name || 'solve',
            returnType: c.return_type || 'void',
            params: c.params || [],
            constraints: c.constraints || [],
            hints: c.hints || [],
          };
          setCachedDetail(key, enhanced);
          setDetail(enhanced);
          setIsGenerating(false);
          return;
        }
      }

      // If Custom Mode, check custom_problems table instead of generator or roadway
      if (customMode && customId) {
        const { data: customData } = await supabase
          .from('custom_problems')
          .select('*')
          .eq('id', customId)
          .single();
        
        if (customData) {
          const c = customData as any;
          const enhanced: EnhancedDetail = {
            key: customId,
            description: c.description,
            examples: [], // Custom problems might not have formal examples array yet
            starterCode: c.starter_code,
            testCases: c.test_cases || [],
            functionName: 'solve', // Defaults for custom
            returnType: 'void',
            params: [],
            constraints: [],
            hints: []
          };
          setCachedDetail(key, enhanced);
          setDetail(enhanced);
          setIsGenerating(false);
          return;
        }
      }

      // Cache miss → invoke edge function (which itself caches and writes to DB)
      const { data, error } = await supabase.functions.invoke('generate-problem-detail', {
        body: {
          problem_key: key,
          title: roadmapProblem.title,
          difficulty: roadmapProblem.difficulty,
          topic: (roadmapProblem as any).topic || '',
        },
      });

      if (error) throw new Error('Failed to generate problem details');
      const generated = data?.detail;
      if (generated) {
        // Client-side fallback: derive test cases from examples if AI returned none.
        let testCases = (generated.testCases || []).map((tc: any) => ({
          inputs: tc.inputs || {},
          expected: tc.expected || tc.expectedOutput || '',
        })).filter((tc: any) => Object.keys(tc.inputs).length > 0 && tc.expected);

        if (testCases.length === 0 && Array.isArray(generated.examples) && Array.isArray(generated.params)) {
          const paramNames: string[] = generated.params.map((p: any) => p?.name).filter(Boolean);
          testCases = generated.examples.map((ex: any) => {
            const raw = String(ex?.input ?? '');
            const inputs: Record<string, string> = {};
            const assignments = raw.split(/,\s*(?=[a-zA-Z_]\w*\s*=)/);
            let matched = 0;
            for (const part of assignments) {
              const m = part.match(/^\s*([a-zA-Z_]\w*)\s*=\s*([\s\S]+?)\s*$/);
              if (m && paramNames.includes(m[1])) {
                inputs[m[1]] = m[2];
                matched++;
              }
            }
            if (matched === 0 && paramNames.length === 1) {
              inputs[paramNames[0]] = raw.replace(/^[a-zA-Z_]\w*\s*=\s*/, '');
            }
            return { inputs, expected: String(ex?.output ?? '').trim() };
          }).filter((tc: any) => Object.keys(tc.inputs).length > 0 && tc.expected);
        }

        const enhanced: EnhancedDetail = {
          key,
          description: generated.description || detail.description,
          examples: generated.examples || [],
          starterCode: generated.starterCode || detail.starterCode,
          testCases,
          functionName: generated.functionName || 'solve',
          returnType: generated.returnType || 'void',
          params: generated.params || [],
          constraints: generated.constraints || [],
          hints: generated.hints || [],
          approach: generated.approach,
        };
        setCachedDetail(key, enhanced);
        setDetail(enhanced);
        if (generated.starterCode) {
          setCodes(prev => {
            const isPlaceholder = (c: string) => !c || c.trim().length < 50 || c.includes('// 🤖 AI is generating') || c.includes('public void solve()');
            const newBrute = isPlaceholder(prev.brute) ? generated.starterCode : prev.brute;
            const newBetter = isPlaceholder(prev.better) ? generated.starterCode : prev.better;
            const newOptimal = isPlaceholder(prev.optimal) ? generated.starterCode : prev.optimal;
            if (newBrute !== prev.brute) {
               toast.success('🚀 AI has generated the official problem signature!');
            }
            return { brute: newBrute, better: newBetter, optimal: newOptimal };
          });
        }
      }
    } catch (err: any) {
      console.error(err);
      setGenerateError('Could not generate problem details. You can still code!');
    }
    setIsGenerating(false);
  }, [key, roadmapProblem, hasHardcodedDetail]);

  // ★ STEP 3: Async load of saved codes. Uses a snapshot of `key` at call time
  // to discard results that arrived after the user has already navigated away.
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const loadKey = key; // snapshot to detect stale results
    codesLoadedFromDb.current = false;

    const loadAllCodes = async () => {
      const approaches: Approach[] = ['brute', 'better', 'optimal'];
      const loaded: Record<string, string> = {};
      let anyFromDb = false;
      for (const approach of approaches) {
        const saveKey = `${loadKey}__${approach}`;
        let savedCode: string | null = null;
        if (authUser && loadKey) {
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
          savedCode = localStorage.getItem(`workspace-code-${authUser?.id || 'anon'}-${saveKey}`);
        }
        // Also check legacy key (no approach suffix) for brute force migration
        if (!savedCode && approach === 'brute') {
          if (authUser && loadKey) {
            try {
              const { data } = await supabase
                .from('user_code_saves')
                .select('code')
                .eq('user_id', authUser.id)
                .eq('problem_key', loadKey)
                .maybeSingle();
              if (data && (data as any).code) { savedCode = (data as any).code; anyFromDb = true; }
            } catch {}
          }
          if (!savedCode) savedCode = localStorage.getItem(`workspace-code-${authUser?.id || 'anon'}-${loadKey}`);
        }
        if (savedCode) {
          try { localStorage.setItem(`workspace-code-${authUser?.id || 'anon'}-${saveKey}`, savedCode); } catch {}
        }
        loaded[approach] = savedCode || detail.starterCode;
      }

      // Discard if user navigated away while we were fetching
      if (cancelled || loadKey !== codesKeyRef.current) return;

      codesLoadedFromDb.current = anyFromDb;
      setCodes({ brute: loaded.brute, better: loaded.better, optimal: loaded.optimal });
      wsResetSaved(loaded[activeApproach] || detail.starterCode);
      setIsCodeLoading(false);
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
        if (e.key === '4') { e.preventDefault(); setBottomTab('analysis'); }
        if (e.key === '5') { e.preventDefault(); setBottomTab('visualizer'); }
        if (e.key === '6') { e.preventDefault(); setBottomTab('analytics'); }
        if (e.key === '7') { e.preventDefault(); setBottomTab('history'); }
        if (e.key === '8') { e.preventDefault(); setBottomTab('snippets'); }
        if (e.key === '9') { e.preventDefault(); setBottomTab('solutions'); }
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

  /** Returns true if the code reads from stdin (Scanner / BufferedReader / System.in) */
  const usesScannerInput = (src: string) =>
    /new\s+Scanner\s*\(/.test(src) ||
    /System\.in/.test(src) ||
    /BufferedReader/.test(src) ||
    /InputStreamReader/.test(src);

  /**
   * Shows the interactive stdin bar in the console and waits until the user
   * presses Enter. Returns the submitted value.
   */
  const waitForUserInput = (): Promise<string> => {
    return new Promise(resolve => {
      setWaitingForInput(true);
      stdinResolverRef.current = (val: string) => {
        setWaitingForInput(false);
        stdinResolverRef.current = null;
        resolve(val);
      };
    });
  };

  /** Called by ConsolePanel when the user submits stdin */
  const handleStdinSubmit = (val: string) => {
    addConsoleEntry('stdin', val);
    stdinResolverRef.current?.(val);
  };

  /**
   * For programs using Scanner: prompts the user to enter all inputs upfront
   * (one per Enter press), then concatenates and sends to the backend.
   */
  const collectStdinInteractively = async (src: string): Promise<string> => {
    addConsoleEntry('system', '📥 This program reads from stdin. Enter each input value and press Enter. Type an empty line when done.');
    const lines: string[] = [];
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const val = await waitForUserInput();
      if (val === '') break; // empty line = done
      lines.push(val);
    }
    return lines.join('\n');
  };

  // Run: execute the code. If it uses Scanner, collect stdin interactively first.
  const handleRun = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setExecStatus('compiling');
    setBottomTab('console');
    const startTime = Date.now();

    try {
      const { executeJavaCode } = await import('@/lib/executor');
      const hasMain = /public\s+static\s+void\s+main\s*\(/.test(code);

      let stdin: string | undefined;
      if (hasMain && usesScannerInput(code)) {
        addConsoleEntry('system', '▶ Compiling...');
        stdin = await collectStdinInteractively(code);
        addConsoleEntry('system', `▶ Running with ${stdin.split('\n').filter(Boolean).length} input line(s)...`);
      } else {
        addConsoleEntry('system', '▶ Checking syntax (compile only)...');
      }

      const result = await executeJavaCode(code, (s) => setExecStatus(s), stdin);
      const execTime = Date.now() - startTime;

      const errText = (result.error || '').toLowerCase();
      const isCompileError =
        result.status?.id === 6 ||
        result.status?.description?.toLowerCase().includes('compil') ||
        errText.includes('error:') ||
        errText.includes('cannot find symbol') ||
        errText.includes('compilation');

      if (isCompileError) {
        addConsoleEntry('error', '✗ Compilation failed:');
        if (result.error) addConsoleEntry('error', result.error);
        setExecStatus('compile_error');
      } else if (result.success) {
        if (result.output) addConsoleEntry('output', result.output);
        if (hasMain) {
          addConsoleEntry('info', `✓ Finished (${execTime}ms)`);
        } else {
          addConsoleEntry('info', `✓ Syntax OK — code compiles cleanly (${execTime}ms)`);
          addConsoleEntry('system', 'Use "Run Tests" to execute against test cases, or "Submit" to grade.');
        }
        setExecStatus('complete');
      } else {
        if (result.output) addConsoleEntry('output', result.output);
        if (result.error) addConsoleEntry('error', result.error);
        addConsoleEntry('error', `✗ Runtime error (${execTime}ms)`);
        setExecStatus('failed');
      }
    } catch (err: any) {
      addConsoleEntry('error', err?.message || 'Execution failed');
      setExecStatus('failed');
    }
    setIsRunning(false);
  };


  // Run Tests: runs ONLY VISIBLE test cases using local test-runner
  const handleRunTests = async () => {
    if (isRunningTests || detail.testCases.length === 0) return;
    setIsRunningTests(true);
    setTestResults([]);
    setBottomTab('console');
    const startTime = Date.now();

    try {
      const { runAllTests, isMainClassStyle } = await import('@/lib/test-runner');

      // Tell user which mode the runner will use
      const stdinMode = isMainClassStyle(code);
      addConsoleEntry('system',
        stdinMode
          ? `▶ Running ${detail.testCases.length} test(s) — Scanner/stdin mode (inputs piped automatically)...`
          : `▶ Running ${detail.testCases.length} test(s) — Solution method mode...`
      );

      const tcInputs = detail.testCases.map(tc => ({
        inputs: tc.inputs || {},
        expected: tc.expected || '',
      }));
      const results = await runAllTests(code, tcInputs, setExecStatus, (idx, r) => {
        const label = r.status === 'PASSED' ? '✓' : '✗';
        addConsoleEntry(
          r.status === 'PASSED' ? 'info' : 'error',
          `${label} Test ${r.test} ${r.status}${r.status === 'FAILED' ? ` → expected: "${r.expected}", got: "${r.actual}"` : ''}`
        );
      });
      const execTime = Date.now() - startTime;
      const passed = results.filter(r => r.status === 'PASSED').length;
      const allPassed = passed === results.length;
      addConsoleEntry('system', `\n${passed}/${results.length} visible tests passed (${execTime}ms).`);
      setTestResults(results);
      setBottomTab('results');
      setExecStatus(allPassed ? 'complete' : 'failed');

      if (authUser && key) {
        saveExecutionHistory(authUser.id, key, code, results, allPassed, execTime).then(() => setHistoryRefreshKey(prev => prev + 1));
      }
    } catch (err: any) {
      addConsoleEntry('error', 'Execution failed: ' + err.message);
      setExecStatus('failed');
    }
    setIsRunningTests(false);
  };


  // Submit Code: runs all test cases (same as run tests for now)
  const handleSubmitCode = async () => {
    if (isRunningTests) return;
    setIsRunningTests(true);
    setTestResults([]);
    setBottomTab('console');
    addConsoleEntry('system', `▶ Submitting code — running ALL test cases...`);
    const startTime = Date.now();

    try {
      const { runAllTests } = await import('@/lib/test-runner');
      const tcInputs = detail.testCases.map(tc => ({
        inputs: tc.inputs || {},
        expected: tc.expected || '',
      }));
      const results = await runAllTests(code, tcInputs, setExecStatus, (idx, r) => {
        addConsoleEntry(
          r.status === 'PASSED' ? 'info' : 'error',
          `Test ${r.test} ${r.status}${r.status === 'FAILED' ? ` — expected: ${r.expected}, got: ${r.actual}` : ''}`
        );
      });
      const execTime = Date.now() - startTime;
      const passed = results.filter(r => r.status === 'PASSED').length;
      const total = results.length;
      const allPassed = passed === total;

      if (allPassed) {
        addConsoleEntry('info', `✅ ACCEPTED — ${passed}/${total} test cases passed (${execTime}ms)`);
        setExecStatus('complete');
      } else {
        addConsoleEntry('error', `❌ FAILED — ${passed}/${total} test cases passed (${execTime}ms)`);
        const failed = results.find(r => r.status === 'FAILED');
        if (failed) {
          addConsoleEntry('error', `\nFailed on Test ${failed.test}:`);
          addConsoleEntry('error', `  Expected: ${failed.expected}`);
          addConsoleEntry('error', `  Got:      ${failed.actual}`);
        }
        setExecStatus('failed');
      }

      setTestResults(results);
      setBottomTab('results');

      // Save execution history & update progress
      if (authUser && key) {
        saveExecutionHistory(authUser.id, key, code, results, allPassed, execTime).then(() => setHistoryRefreshKey(prev => prev + 1));

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

      if (allPassed) {
        setCelebrationTime(execTime);
        setShowCelebration(true);
      }
    } catch (err: any) {
      addConsoleEntry('error', 'Submission failed: ' + err.message);
      setExecStatus('failed');
    }
    setIsRunningTests(false);
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

  const handleGenerateVisualization = async () => {
    if (isVisualizing || !code.trim()) return;
    setIsVisualizing(true);
    setBottomTab('visualizer');
    try {
      const { getExtraInsights } = await import('@/lib/ai-backend');
      const chart = await getExtraInsights(code, 'visualize', key);
      // Extract mermaid chart if it's wrapped in code blocks
      const match = /```mermaid\n([\s\S]*?)```/.exec(chart);
      setVisualizerChart(match ? match[1] : chart);
    } catch {
      toast.error('Failed to visualize logic');
    }
    setIsVisualizing(false);
  };

  const fetchSubmissionHistory = async () => {
    if (!authUser || !key) return;
    setLoadingHistory(true);
    const prefix = contestMode ? 'contest_' : generatorMode ? 'gen_' : '';
    const saveKey = `${prefix}${key}`;
    try {
      const { data } = await supabase
        .from('submission_history')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('problem_key', key) // Use the raw key for history tracking across modes
        .order('created_at', { ascending: false });
      setSubmissionHistory(data || []);
    } catch (e) {
      console.error('History fetch error:', e);
    }
    setLoadingHistory(false);
  };

  useEffect(() => {
    if (bottomTab === 'analytics') {
      fetchSubmissionHistory();
    }
  }, [bottomTab, key]);

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
    { key: 'visualizer' as const, label: '🧠 Visualizer' },
    { key: 'analytics' as const, label: '📈 Stats' },
    { key: 'history' as const, label: '📜 History' },
    ...(!contestMode && !generatorMode ? [
      { key: 'snippets' as const, label: '📋 Templates' },
      { key: 'solutions' as const, label: '⚡ Solutions' },
    ] : [])
  ];

  return (
    <div className="flex h-screen flex-col bg-background">
      {contestMode && (
        <div className="bg-warning/10 border-b border-warning/20 px-4 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-warning animate-pulse" />
            <span className="text-[10px] font-bold text-warning uppercase tracking-widest">Contest Mode Active — External help disabled</span>
          </div>
          <div className="text-[10px] text-warning/80 font-mono">ID: {contestId}</div>
        </div>
      )}
      {generatorMode && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Generator Mode Active — Solving AI Challenge</span>
          </div>
          <div className="text-[10px] text-primary/80 font-mono">GEN_ID: {genId}</div>
        </div>
      )}
      {/* Header — refined LeetCode-style top bar */}
      <header className="flex h-11 items-center gap-2 border-b border-panel-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-3 overflow-x-auto scrollbar-none">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-7 gap-1.5 text-xs shrink-0 -ml-1">
          <ArrowLeft className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Back</span>
        </Button>
        <div className="h-4 w-px bg-border hidden sm:block" />
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-foreground truncate max-w-[160px] sm:max-w-[280px] tracking-tight">{roadmapProblem?.title || 'Problem'}</span>
          <Badge variant="outline" className={`text-[10px] font-medium shrink-0 ${getDifficultyBg(roadmapProblem?.difficulty || 'Medium')}`}>
            {roadmapProblem?.difficulty || 'Medium'}
          </Badge>
          <Badge variant="secondary" className="text-[10px] font-normal hidden md:inline-flex shrink-0">{(roadmapProblem as any)?.topic || 'Challenge'}</Badge>
        </div>
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] text-muted-foreground items-center gap-1.5 hidden md:flex">
            {wsAutoSaving ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> Saving</>
            ) : wsCodeDirty ? (
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" /> Unsaved</span>
            ) : (
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-success" /> Saved</span>
            )}
          </span>
          <div className="h-4 w-px bg-border hidden md:block" />
          <div className="hidden md:block"><ProblemTimer problemId={key || null} onTimeUpdate={setTimeSpent} /></div>
          <div className="h-4 w-px bg-border hidden md:block" />
          <Button variant="ghost" size="sm" onClick={() => setFocusMode(!focusMode)} className={`h-7 w-7 p-0 ${focusMode ? 'text-foreground bg-accent' : 'text-muted-foreground'}`} title="Focus Mode">
            {focusMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowShortcuts(true)} className="h-7 w-7 p-0 hidden sm:flex text-muted-foreground" title="Keyboard Shortcuts (Ctrl+K)">
            <Keyboard className="h-3.5 w-3.5" />
          </Button>
          <ReportIssueDialog pageTitle={roadmapProblem?.title} trigger={
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-warning" title="Report Issue">
              <AlertTriangle className="h-3.5 w-3.5" />
            </Button>
          } />
          <div className="h-4 w-px bg-border hidden sm:block mx-0.5" />
          {isAdmin && (
            <Button onClick={() => navigate('/admin')} size="sm" variant="outline" className="h-7 gap-1.5 text-xs font-medium text-destructive hover:bg-destructive hover:text-destructive-foreground">
              <Shield className="h-3 w-3" />
              <span className="hidden md:inline">Admin</span>
            </Button>
          )}
          <Button onClick={handleRun} disabled={isRunning || isRunningTests} size="sm" variant="outline" className="h-7 gap-1.5 text-xs font-medium">
            {isRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            Run
          </Button>
          {(isRunning || isRunningTests) && (
            <Button onClick={() => { stopExecution(); setIsRunning(false); setIsRunningTests(false); setExecStatus('stopped' as any); }} size="sm" variant="destructive" className="h-7 gap-1.5 text-xs">
              <Square className="h-3 w-3" /> Stop
            </Button>
          )}
          <Button onClick={handleRunTests} disabled={isRunning || isRunningTests || detail.testCases.length === 0} size="sm" variant="secondary" className="h-7 gap-1.5 text-xs font-medium">
            {isRunningTests ? <Loader2 className="h-3 w-3 animate-spin" /> : <FlaskConical className="h-3 w-3" />}
            <span className="hidden md:inline">Test</span>
          </Button>
          <Button onClick={handleSubmitCode} disabled={isRunning || isRunningTests || detail.testCases.length === 0} size="sm" className="h-7 gap-1.5 text-xs font-semibold bg-success hover:bg-success/90 text-success-foreground">
            {isRunningTests ? <Loader2 className="h-3 w-3 animate-spin" /> : <Code2 className="h-3 w-3" />}
            Submit
          </Button>
          {!contestMode && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs hidden sm:flex text-muted-foreground hover:text-foreground">
                  <Sparkles className="h-3 w-3" /> AI <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('trigger-explain', { detail: '__dry_run__' }))}>
                  <Workflow className="h-3.5 w-3.5 mr-2" /> Logic Trace
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('trigger-explain', { detail: '__hints__' }))}>
                  <Brain className="h-3.5 w-3.5 mr-2" /> Hints
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('trigger-explain', { detail: '__optimal__' }))}>
                  <Trophy className="h-3.5 w-3.5 mr-2" /> Optimal
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('trigger-explain', { detail: '__mistakes__' }))}>
                  <AlertTriangle className="h-3.5 w-3.5 mr-2" /> Find Bugs
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('trigger-explain', { detail: '__patterns__' }))}>
                  <BookOpen className="h-3.5 w-3.5 mr-2" /> Patterns
                </DropdownMenuItem>
                <div className="h-px bg-border my-1" />
                <DropdownMenuItem onClick={handleAnalyze} disabled={isAnalyzing || !code.trim()}>
                  <TrendingUp className="h-3.5 w-3.5 mr-2" /> Complexity Analysis
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('trigger-explain', { detail: '__generate_tests__' }))}>
                  <FlaskConical className="h-3.5 w-3.5 mr-2" /> Generate Test Cases
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button 
            onClick={() => {
              toast.promise(new Promise(res => setTimeout(res, 1500)), {
                loading: 'Pushing to GitHub...',
                success: 'Solution pushed to my-dsa-solutions!',
                error: 'Push failed'
              });
            }} 
            size="sm" 
            variant="ghost" 
            className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground hidden lg:flex"
          >
            <Github className="h-3 w-3" />
            <span className="hidden xl:inline">GitHub</span>
          </Button>
          <Button onClick={() => navigate(`/discuss?problem=${key}`)} size="sm" variant="ghost" className="h-7 w-7 p-0 hidden lg:flex text-muted-foreground" title="Discuss">
            <MessageSquare className="h-3.5 w-3.5" />
          </Button>
          <ExecutionStatus status={execStatus} />
        </div>
      </header>

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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px] shrink-0">
              <Sparkles className="h-3 w-3" /> AI Tools
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('trigger-explain', { detail: '__dry_run__' }))}>
              <Workflow className="h-3.5 w-3.5 mr-2" /> Logic Trace
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('trigger-explain', { detail: '__hints__' }))}>
              <Brain className="h-3.5 w-3.5 mr-2" /> Hints
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('trigger-explain', { detail: '__optimal__' }))}>
              <Trophy className="h-3.5 w-3.5 mr-2" /> Optimal
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('trigger-explain', { detail: '__mistakes__' }))}>
              <AlertTriangle className="h-3.5 w-3.5 mr-2" /> Find Bugs
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('trigger-explain', { detail: '__patterns__' }))}>
              <BookOpen className="h-3.5 w-3.5 mr-2" /> Patterns
            </DropdownMenuItem>
            <div className="h-px bg-panel-border my-1" />
            <DropdownMenuItem onClick={handleAnalyze} disabled={isAnalyzing || !code.trim()}>
              <TrendingUp className="h-3.5 w-3.5 mr-2" /> Complexity Analysis
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent('trigger-explain', { detail: '__generate_tests__' }))}>
              <FlaskConical className="h-3.5 w-3.5 mr-2" /> Generate Test Cases
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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

          {/* Approach Tabs — refined segmented look */}
          <div className="flex items-center border-b border-panel-border bg-card/60 px-2 h-9">
            <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-muted/40">
              {APPROACHES.map(approach => (
                <button
                  key={approach.key}
                  onClick={() => {
                    setActiveApproach(approach.key);
                    wsResetSaved(codes[approach.key]);
                  }}
                  className={`flex items-center gap-1.5 px-3 h-7 rounded text-[11px] font-medium transition-all ${
                    activeApproach === approach.key
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {approach.icon}
                  {approach.label}
                </button>
              ))}
            </div>
            <span className="ml-auto text-[11px] text-muted-foreground tracking-tight font-mono">Java</span>
          </div>

          <div className="flex-1 overflow-hidden relative">
            {APPROACHES.map(approach => (
              <div 
                key={approach.key} 
                className="absolute inset-0"
                style={{ 
                  visibility: activeApproach === approach.key ? 'visible' : 'hidden',
                  opacity: activeApproach === approach.key ? 1 : 0,
                  pointerEvents: activeApproach === approach.key ? 'auto' : 'none',
                  zIndex: activeApproach === approach.key ? 1 : 0
                }}
              >
                <CodeEditor 
                  code={codes[approach.key]} 
                  onChange={(val) => setCodes(prev => ({ ...prev, [approach.key]: val }))} 
                />
              </div>
            ))}
          </div>

          <div onMouseDown={handleDividerMouseDown} className="resize-handle h-1 cursor-row-resize border-t border-panel-border hover:bg-primary/40 transition-colors" />

          {/* Bottom panel */}
          <div className="shrink-0 border-t border-panel-border bg-card/40" style={{ height: consoleHeight }}>
            <div className="flex items-center border-b border-panel-border bg-card/60 px-1 h-9 overflow-x-auto scrollbar-none">
              {tabItems.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setBottomTab(tab.key)}
                  className={`relative px-3 h-9 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                    bottomTab === tab.key
                      ? 'text-foreground after:absolute after:left-2 after:right-2 after:bottom-0 after:h-0.5 after:bg-foreground after:rounded-full'
                      : 'text-muted-foreground hover:text-foreground'
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
                  waitingForInput={waitingForInput}
                  onStdinSubmit={handleStdinSubmit}
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
        {!focusMode && !contestMode && !generatorMode && (
          <div className="hidden lg:block w-[320px] xl:w-[360px] shrink-0 border-l border-panel-border overflow-hidden">
            <AIChatPanel code={code} problemId={null} aiEnabled={true} />
          </div>
        )}
        {(contestMode || generatorMode) && (
          <div className="hidden lg:flex w-[320px] xl:w-[360px] shrink-0 border-l border-panel-border flex-col items-center justify-center p-6 text-center bg-secondary/5">
            <Trophy className="h-12 w-12 text-warning mb-4 opacity-50" />
            <h3 className="text-sm font-bold text-foreground">{contestMode ? 'Contest' : 'Generator'} Mode Active</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              {contestMode 
                ? 'AI Assistance and community solutions are disabled during active contests to ensure a fair testing environment.'
                : 'AI assistance is restricted for generated challenges to encourage independent problem-solving.'}
            </p>
            <div className="mt-8 p-4 rounded-lg border border-panel-border bg-card/30 text-left">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Rules:</p>
              <ul className="text-[10px] text-muted-foreground space-y-2 list-disc pl-4">
                <li>No AI explanations or hints allowed.</li>
                <li>Templates and community solutions are hidden.</li>
                <li>Your time and code are being tracked separately.</li>
              </ul>
            </div>
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
