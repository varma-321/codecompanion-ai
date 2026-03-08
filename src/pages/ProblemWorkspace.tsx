import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Play, FlaskConical, Loader2, CheckCircle2, XCircle, Brain, ChevronRight, Code2, GitCompare, Cloud, Keyboard } from 'lucide-react';
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
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';
import { STRIVER_ROADMAP, getDifficultyBg, type RoadmapProblem } from '@/lib/striver-roadmap-data';
import { NEETCODE_ROADMAP } from '@/lib/neetcode-roadmap-data';
import { LEETCODE_TOP150_ROADMAP } from '@/lib/leetcode-top150-data';
import { getProblemDetail, type ProblemDetail } from '@/lib/striver-problem-details';
import { executeJavaCode, type ExecutionStatus as ExecStatusType } from '@/lib/executor';
import { API_BASE_URL } from '@/lib/api';
import ReactMarkdown from 'react-markdown';

// Build a lookup for all problems across all modules
const ALL_ROADMAPS = [...STRIVER_ROADMAP, ...NEETCODE_ROADMAP, ...LEETCODE_TOP150_ROADMAP];

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

  const detail: ProblemDetail = useMemo(() => {
    if (!roadmapProblem) return getProblemDetail('', 'Unknown', 'Medium');
    return getProblemDetail(roadmapProblem.key, roadmapProblem.title, roadmapProblem.difficulty);
  }, [roadmapProblem]);

  const [code, setCode] = useState(detail.starterCode);
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

  // Autosave code to localStorage
  const autosaveWorkspaceCode = useCallback(async (val: string) => {
    if (!authUser || !key) return;
    try {
      localStorage.setItem(`workspace-code-${key}`, val);
    } catch {}
  }, [authUser, key]);

  const { isDirty: wsCodeDirty, isSaving: wsAutoSaving, resetSavedValue: wsResetSaved } = useAutosave(code, autosaveWorkspaceCode, {
    delay: 1500,
    enabled: !!key,
  });

  // Reset code when problem changes
  useEffect(() => {
    const saved = localStorage.getItem(`workspace-code-${key}`);
    if (saved && saved !== detail.starterCode) {
      setCode(saved);
    } else {
      setCode(detail.starterCode);
    }
    wsResetSaved(saved || detail.starterCode);
    setConsoleEntries([]);
    setTestResults([]);
    setBottomTab('description');
  }, [key]);

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

  const handleRunTests = async () => {
    if (isRunningTests || detail.testCases.length === 0) return;
    setIsRunningTests(true);
    setTestResults([]);
    setBottomTab('console');
    addConsoleEntry('system', `▶ Running ${detail.testCases.length} test(s)...`);
    const startTime = Date.now();

    const { runAllTests } = await import('@/lib/test-runner');

    const tcInputs = detail.testCases.map(tc => ({
      inputs: tc.inputs,
      expected: tc.expected.trim(),
    }));

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
                  <Badge className={`mt-1 text-[10px] ${getDifficultyBg(roadmapProblem.difficulty)}`}>{roadmapProblem.difficulty}</Badge>
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
    </div>
  );
};

export default ProblemWorkspace;
