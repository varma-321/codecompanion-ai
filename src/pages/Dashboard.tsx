import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Play, Brain, Loader2, FlaskConical, Bug, Zap, CloudOff, Cloud, FolderOpen, MessageSquare, Square } from 'lucide-react';
import { useAutosave } from '@/hooks/use-autosave';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import ProblemExplorer from '@/components/ProblemExplorer';
import CodeEditor from '@/components/CodeEditor';
import AIChatPanel from '@/components/AIChatPanel';
import ConsolePanel, { ConsoleEntry } from '@/components/ConsolePanel';
import TestCasePanel, { TestResult } from '@/components/TestCasePanel';
import TestResultsTable from '@/components/TestResultsTable';
import VisualDebugger from '@/components/VisualDebugger';
import ExecutionAnalyticsPanel from '@/components/ExecutionAnalyticsPanel';
import DailyChallenge from '@/components/DailyChallenge';
import NotesPanel from '@/components/NotesPanel';
import StreakPanel from '@/components/StreakPanel';
import RecursionTreePanel from '@/components/RecursionTreePanel';
import Toolbar from '@/components/Toolbar';
import ExecutionStatus from '@/components/ExecutionStatus';
import ProblemTimer from '@/components/ProblemTimer';
import CodeSnippets from '@/components/CodeSnippets';
import SolutionComparison from '@/components/SolutionComparison';
import SettingsDialog from '@/components/SettingsDialog';
import { useUser } from '@/lib/user-context';
import {
  DbProblem, DbTestCase, fetchProblems, updateProblem, signOut, DEFAULT_CODE,
  fetchTestCases, insertTestCase, updateTestCase, deleteTestCase,
} from '@/lib/supabase';
import { executeJavaCode, stopExecution, type ExecutionStatus as ExecStatusType } from '@/lib/executor';
import { detectProblemTitle } from '@/lib/ai-backend';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const { authUser, profile } = useUser();
  const userId = authUser?.id || '';
  const username = profile?.username || authUser?.email?.split('@')[0] || 'User';

  const [problems, setProblems] = useState<DbProblem[]>([]);
  const [activeProblem, setActiveProblem] = useState<DbProblem | null>(null);
  const [code, setCode] = useState(DEFAULT_CODE);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [execStatus, setExecStatus] = useState<ExecStatusType>('ready');
  const [consoleCollapsed, setConsoleCollapsed] = useState(false);
  const [consoleFullscreen, setConsoleFullscreen] = useState(false);
  const [consoleHeight, setConsoleHeight] = useState(288);

  // LeetCode mode state
  const [testCases, setTestCases] = useState<DbTestCase[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isGeneratingTests, setIsGeneratingTests] = useState(false);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [bottomTab, setBottomTab] = useState<'console' | 'tests' | 'results' | 'debugger' | 'daily' | 'notes' | 'streak' | 'recursion' | 'snippets' | 'solutions'>('tests');

  // Execution analytics
  const [execTimeMs, setExecTimeMs] = useState<number | null>(null);
  const [timeComplexity, setTimeComplexity] = useState<string | null>(null);
  const [spaceComplexity, setSpaceComplexity] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [optimizationPossible, setOptimizationPossible] = useState(false);
  const [isAnalyzingComplexity, setIsAnalyzingComplexity] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'Enter') { e.preventDefault(); handleRun(); }
        if (e.key === 's') { e.preventDefault(); handleSave(); }
        if (e.shiftKey && e.key === 'E') { e.preventDefault(); handleExplain(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  useEffect(() => {
    if (userId) {
      fetchProblems(userId).then(setProblems).catch(() => {});
    }
  }, [userId]);

  // Load test cases when problem changes
  useEffect(() => {
    if (activeProblem) {
      fetchTestCases(activeProblem.id).then(setTestCases).catch(() => {});
      setTestResults([]);
    } else {
      setTestCases([]);
      setTestResults([]);
    }
  }, [activeProblem?.id]);

  const refreshProblems = useCallback(async () => {
    if (!userId) return;
    try { setProblems(await fetchProblems(userId)); } catch {}
  }, [userId]);

  // Autosave code
  const autosaveCode = useCallback(async (val: string) => {
    if (!activeProblem) return;
    await updateProblem(activeProblem.id, { code: val });
  }, [activeProblem]);

  const { isDirty: codeIsDirty, isSaving: isAutoSaving, lastSaved, resetSavedValue } = useAutosave(code, autosaveCode, {
    delay: 2000,
    enabled: !!activeProblem && !!userId,
  });

  const handleSelectProblem = (problem: DbProblem) => {
    setActiveProblem(problem);
    setCode(problem.code);
    resetSavedValue(problem.code);
  };

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
    setConsoleCollapsed(false);
    setBottomTab('console');
    setExecTimeMs(null);
    addConsoleEntry('system', '▶ Compiling and running...');
    const startTime = Date.now();
    try {
      const result = await executeJavaCode(code, (status) => setExecStatus(status));
      const elapsed = Date.now() - startTime;
      setExecTimeMs(elapsed);
      if (result.success) {
        if (result.output) addConsoleEntry('output', result.output);
        addConsoleEntry('info', `✓ Execution completed in ${elapsed}ms`);
        // Analyze complexity in background
        if (aiEnabled) {
          setIsAnalyzingComplexity(true);
          supabase.functions.invoke('analyze-complexity', { body: { code, executionTimeMs: elapsed } })
            .then(({ data }) => {
              if (data) {
                setTimeComplexity(data.timeComplexity || null);
                setSpaceComplexity(data.spaceComplexity || null);
                setSuggestion(data.suggestion || null);
                setOptimizationPossible(data.optimizationPossible || false);
              }
            })
            .catch(() => {})
            .finally(() => setIsAnalyzingComplexity(false));
        }
      } else {
        if (result.error) addConsoleEntry('error', result.error);
        if (result.status.description !== 'Compilation Error') {
          addConsoleEntry('system', `Status: ${result.status.description}`);
        }
      }
    } catch (err: any) {
      addConsoleEntry('error', err?.message || 'Execution failed');
      setExecStatus('failed');
    }
    setIsRunning(false);
  };

  const handleRunTests = async () => {
    if (isRunningTests || testCases.length === 0) return;
    setIsRunningTests(true);
    setTestResults([]);
    setBottomTab('console');
    addConsoleEntry('system', `▶ Running ${testCases.length} test(s)...`);

    const { runAllTests } = await import('@/lib/test-runner');

    const tcInputs = testCases.map(tc => ({
      inputs: (tc.inputs && Object.keys(tc.inputs).length > 0)
        ? tc.inputs
        : { [tc.variable_name || 'arr']: tc.input || '' },
      expected: tc.expected_output.trim(),
    }));

    const results = await runAllTests(code, tcInputs, setExecStatus, (idx, r) => {
      addConsoleEntry(
        r.status === 'PASSED' ? 'info' : 'error',
        `Test ${r.test} ${r.status}${r.status === 'FAILED' ? ` (expected: ${r.expected}, got: ${r.actual})` : ''}`
      );
    });

    const passed = results.filter(r => r.status === 'PASSED').length;
    addConsoleEntry('system', `\nExecution finished. ${passed}/${results.length} tests passed.`);
    setTestResults(results);
    setBottomTab('results');
    setExecStatus('complete');
    setIsRunningTests(false);
  };

  const handleAddTestCase = async (inputs: Record<string, string>, expectedOutput: string) => {
    if (!activeProblem || !userId) { toast.error('Select a problem first'); return; }
    try {
      const tc = await insertTestCase(userId, activeProblem.id, inputs, expectedOutput);
      setTestCases(prev => [...prev, tc]);
    } catch { toast.error('Failed to add test case'); }
  };

  const handleUpdateTestCase = async (id: string, inputs: Record<string, string>, expectedOutput: string) => {
    try {
      await updateTestCase(id, { inputs, expected_output: expectedOutput });
      setTestCases(prev => prev.map(tc => tc.id === id ? { ...tc, inputs, expected_output: expectedOutput } : tc));
    } catch { toast.error('Failed to update'); }
  };

  const handleDeleteTestCase = async (id: string) => {
    try {
      await deleteTestCase(id);
      setTestCases(prev => prev.filter(tc => tc.id !== id));
    } catch { toast.error('Failed to delete'); }
  };

  const handleGenerateAITests = async () => {
    if (!activeProblem || !userId) { toast.error('Select a problem first'); return; }
    setIsGeneratingTests(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-test-cases', {
        body: { code },
      });
      if (error) throw error;
      const generated = data?.testCases || [];
      if (generated.length === 0) { toast.info('No test cases generated'); setIsGeneratingTests(false); return; }

      const newCases: DbTestCase[] = [];
      for (const tc of generated) {
        // Support both new multi-input format and legacy single-input format
        const inputs: Record<string, string> = tc.inputs || { [tc.variableName || 'arr']: tc.input || '' };
        const saved = await insertTestCase(userId, activeProblem.id, inputs, tc.expectedOutput || '');
        newCases.push(saved);
      }
      setTestCases(prev => [...prev, ...newCases]);
      toast.success(`Generated ${newCases.length} test cases`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate test cases');
    }
    setIsGeneratingTests(false);
  };

  const handleSave = async () => {
    if (!activeProblem) { toast.error('No problem selected'); return; }
    setIsSaving(true);
    try {
      if (activeProblem.title === 'New Problem' && aiEnabled) {
        try {
          const detectedTitle = await detectProblemTitle(code);
          if (detectedTitle && detectedTitle !== 'Unknown Problem') {
            await updateProblem(activeProblem.id, { title: detectedTitle, code });
            setActiveProblem(prev => prev ? { ...prev, title: detectedTitle, code } : null);
            toast.success(`Saved as "${detectedTitle}"`);
          } else {
            await updateProblem(activeProblem.id, { code });
            toast.success('Code saved');
          }
        } catch {
          await updateProblem(activeProblem.id, { code });
          toast.success('Code saved');
        }
      } else {
        await updateProblem(activeProblem.id, { code });
        toast.success('Code saved');
      }
      refreshProblems();
    } catch { toast.error('Failed to save'); }
    setIsSaving(false);
  };

  const handleExplain = () => {
    if (!aiEnabled) { toast.error('AI Assistant is disabled.'); return; }
    setIsExplaining(true);
    window.dispatchEvent(new CustomEvent('trigger-explain', { detail: { code } }));
    setTimeout(() => setIsExplaining(false), 1000);
  };

  const handleAnalyze = () => {
    if (!activeProblem) { toast.error('No problem selected'); return; }
    if (!aiEnabled) { toast.error('AI Assistant is disabled.'); return; }
    toast.info('Use the AI chat panel to analyze your code.');
  };

  const handleSaveNotes = useCallback(async (notes: string) => {
    if (!activeProblem) return;
    await supabase.from('problems').update({ notes } as any).eq('id', activeProblem.id);
    toast.success('Notes saved');
  }, [activeProblem]);

  const handleLogout = async () => {
    try { await signOut(); } catch {}
  };

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = consoleHeight;
    const onMouseMove = (ev: MouseEvent) => {
      setConsoleHeight(Math.max(80, Math.min(600, startHeight + (startY - ev.clientY))));
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [consoleHeight]);

  const TAB_LABELS: Record<string, string> = {
    console: 'Console',
    tests: `Tests (${testCases.length})`,
    results: testResults.length > 0 ? `Results (${testResults.filter(r => r.status === 'PASSED').length}/${testResults.length})` : 'Results',
    debugger: 'Debug',
    notes: 'Notes',
    recursion: 'Recursion',
    snippets: 'Templates',
    solutions: 'Solutions',
    streak: 'Streak',
    daily: 'Daily',
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <Toolbar
        onRun={handleRun}
        onSave={handleSave}
        onAnalyze={handleAnalyze}
        onSettings={() => setShowSettings(true)}
        onLogout={handleLogout}
        username={username}
        isRunning={isRunning}
        isSaving={isSaving}
        runDisabled={false}
        aiEnabled={aiEnabled}
        onAIToggle={setAiEnabled}
        isAutoSaving={isAutoSaving}
        codeIsDirty={codeIsDirty}
      />

      {/* Mobile action bar for hidden panels */}
      <div className="flex md:hidden items-center gap-2 border-b border-border bg-card px-3 py-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <FolderOpen className="h-3.5 w-3.5" /> Files
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="px-4 pt-4 pb-2">
              <SheetTitle className="text-sm">Problem Explorer</SheetTitle>
            </SheetHeader>
            <div className="h-[calc(100%-60px)] overflow-auto">
              <ProblemExplorer
                problems={problems}
                activeProblemId={activeProblem?.id || null}
                onSelect={handleSelectProblem}
                onRefresh={refreshProblems}
              />
            </div>
          </SheetContent>
        </Sheet>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <MessageSquare className="h-3.5 w-3.5" /> AI Chat
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[85vw] sm:max-w-md p-0">
            <SheetHeader className="px-4 pt-4 pb-2">
              <SheetTitle className="text-sm">AI Assistant</SheetTitle>
            </SheetHeader>
            <div className="h-[calc(100%-60px)] overflow-auto">
              <AIChatPanel code={code} problemId={activeProblem?.id || null} aiEnabled={aiEnabled} />
            </div>
          </SheetContent>
        </Sheet>
        {activeProblem && <span className="text-xs text-muted-foreground truncate ml-1">{activeProblem.title}</span>}
      </div>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Left: Problem Explorer - hidden on mobile */}
        <div className="hidden md:block w-56 shrink-0 border-r border-border">
          <ProblemExplorer
            problems={problems}
            activeProblemId={activeProblem?.id || null}
            onSelect={handleSelectProblem}
            onRefresh={refreshProblems}
          />
        </div>

        {/* Center: Editor + Bottom Panels */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className={`overflow-hidden ${consoleFullscreen ? 'hidden' : 'flex-1'}`}>
            <CodeEditor code={code} onChange={setCode} />
          </div>

          {!consoleFullscreen && (
          <div className="flex items-center gap-1 sm:gap-2 border-t border-border bg-card px-2 sm:px-4 py-2 overflow-x-auto scrollbar-none">
              <Button onClick={handleRun} disabled={isRunning || isRunningTests} size="sm" className="h-8 gap-1.5 px-3 sm:px-4 text-xs font-medium rounded-lg shrink-0">
                {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                {isRunning ? 'Running...' : 'Run'}
              </Button>
              <Button onClick={handleRunTests} disabled={isRunning || isRunningTests || testCases.length === 0} size="sm" variant="outline" className="h-8 gap-1.5 px-3 sm:px-4 text-xs font-medium rounded-lg shrink-0">
                {isRunningTests ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{isRunningTests ? 'Testing...' : `Run Tests (${testCases.length})`}</span>
                <span className="sm:hidden">Test</span>
              </Button>
              <Button onClick={handleExplain} disabled={isExplaining || !aiEnabled} size="sm" variant="outline" className="h-8 gap-1.5 px-3 sm:px-4 text-xs font-medium rounded-lg shrink-0 hidden sm:flex">
                {isExplaining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
                Explain
              </Button>
              <div className="h-5 w-px bg-border mx-1 hidden sm:block" />
              <div className="hidden sm:block"><ProblemTimer problemId={activeProblem?.id || null} /></div>
              <ExecutionStatus status={execStatus} />
            </div>
          )}

          <div
            onMouseDown={handleDividerMouseDown}
            className="resize-handle h-1 cursor-row-resize border-t border-border hover:bg-foreground/10 transition-colors"
          />

          {/* Bottom tabs */}
          <div
            className={`shrink-0 border-t border-border ${consoleFullscreen ? 'flex-1' : ''}`}
            style={consoleFullscreen ? {} : { height: consoleCollapsed ? 36 : consoleHeight }}
          >
            {/* Tab bar */}
            <div className="flex items-center border-b border-border bg-card px-1 overflow-x-auto scrollbar-none">
              {(['console', 'tests', 'results', 'debugger', 'notes', 'recursion', 'snippets', 'solutions', 'streak', 'daily'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => { setBottomTab(tab); setConsoleCollapsed(false); }}
                  className={`px-3 py-2 text-[11px] font-medium tracking-wide transition-colors whitespace-nowrap relative ${
                    bottomTab === tab
                      ? 'text-foreground tab-active'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {TAB_LABELS[tab] || tab}
                </button>
              ))}
            </div>

            <div className="flex h-[calc(100%-32px)]">
              {bottomTab === 'console' && (
                <div className="flex flex-1 flex-col lg:flex-row">
                  <div className="flex-1 overflow-hidden border-r border-panel-border">
                    <ConsolePanel
                      entries={consoleEntries}
                      isRunning={isRunning || isRunningTests}
                      onClear={() => setConsoleEntries([])}
                      isCollapsed={consoleCollapsed}
                      onToggleCollapse={() => setConsoleCollapsed(c => !c)}
                      isFullscreen={consoleFullscreen}
                      onToggleFullscreen={() => setConsoleFullscreen(f => !f)}
                    />
                  </div>
                  {!consoleCollapsed && (
                    <div className="hidden lg:block w-[380px] xl:w-[420px] shrink-0 overflow-hidden">
                      <AIChatPanel code={code} problemId={activeProblem?.id || null} aiEnabled={aiEnabled} />
                    </div>
                  )}
                </div>
              )}

              {bottomTab === 'tests' && (
                <div className="flex flex-1 flex-col lg:flex-row">
                  <div className="flex-1 overflow-hidden">
                    <TestCasePanel
                      testCases={testCases}
                      testResults={testResults}
                      onAdd={handleAddTestCase}
                      onUpdate={handleUpdateTestCase}
                      onDelete={handleDeleteTestCase}
                      onGenerateAI={handleGenerateAITests}
                      isGenerating={isGeneratingTests}
                    />
                  </div>
                  <div className="hidden lg:block w-[380px] xl:w-[420px] shrink-0 overflow-hidden border-l border-panel-border">
                    <AIChatPanel code={code} problemId={activeProblem?.id || null} aiEnabled={aiEnabled} />
                  </div>
                </div>
              )}

              {bottomTab === 'results' && (
                <div className="flex flex-1 flex-col lg:flex-row">
                  <div className="flex-1 overflow-auto p-3">
                    {testResults.length > 0 ? (
                      <TestResultsTable results={testResults} />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        Run tests to see results
                      </div>
                    )}
                  </div>
                  <div className="hidden lg:block w-[380px] xl:w-[420px] shrink-0 overflow-hidden border-l border-panel-border">
                    <AIChatPanel code={code} problemId={activeProblem?.id || null} aiEnabled={aiEnabled} />
                  </div>
                </div>
              )}

              {bottomTab === 'debugger' && (
                <div className="flex flex-1 flex-col lg:flex-row">
                  <div className="flex-1 overflow-hidden">
                    <VisualDebugger code={code} isVisible={true} />
                  </div>
                  <div className="hidden lg:block w-[380px] xl:w-[420px] shrink-0 overflow-hidden border-l border-panel-border">
                    <AIChatPanel code={code} problemId={activeProblem?.id || null} aiEnabled={aiEnabled} />
                  </div>
                </div>
              )}

              {bottomTab === 'daily' && (
                <div className="flex flex-1 flex-col lg:flex-row">
                  <div className="flex-1 overflow-auto p-3">
                    <DailyChallenge />
                  </div>
                  <div className="hidden lg:block w-[380px] xl:w-[420px] shrink-0 overflow-hidden border-l border-panel-border">
                    <AIChatPanel code={code} problemId={activeProblem?.id || null} aiEnabled={aiEnabled} />
                  </div>
                </div>
              )}

              {bottomTab === 'notes' && (
                <div className="flex flex-1 flex-col lg:flex-row">
                  <div className="flex-1 overflow-hidden">
                    <NotesPanel notes={(activeProblem as any)?.notes || ''} onSave={handleSaveNotes} />
                  </div>
                  <div className="hidden lg:block w-[380px] xl:w-[420px] shrink-0 overflow-hidden border-l border-panel-border">
                    <AIChatPanel code={code} problemId={activeProblem?.id || null} aiEnabled={aiEnabled} />
                  </div>
                </div>
              )}

              {bottomTab === 'recursion' && (
                <div className="flex flex-1 flex-col lg:flex-row">
                  <div className="flex-1 overflow-hidden">
                    <RecursionTreePanel code={code} />
                  </div>
                  <div className="hidden lg:block w-[380px] xl:w-[420px] shrink-0 overflow-hidden border-l border-panel-border">
                    <AIChatPanel code={code} problemId={activeProblem?.id || null} aiEnabled={aiEnabled} />
                  </div>
                </div>
              )}

              {bottomTab === 'streak' && (
                <div className="flex flex-1 flex-col lg:flex-row">
                  <div className="flex-1 overflow-auto">
                    <StreakPanel />
                  </div>
                  <div className="hidden lg:block w-[380px] xl:w-[420px] shrink-0 overflow-hidden border-l border-panel-border">
                    <AIChatPanel code={code} problemId={activeProblem?.id || null} aiEnabled={aiEnabled} />
                  </div>
                </div>
              )}

              {bottomTab === 'snippets' && (
                <div className="flex flex-1 flex-col lg:flex-row">
                  <div className="flex-1 overflow-hidden">
                    <CodeSnippets onInsert={(snippet) => setCode(prev => prev + snippet)} />
                  </div>
                  <div className="hidden lg:block w-[380px] xl:w-[420px] shrink-0 overflow-hidden border-l border-panel-border">
                    <AIChatPanel code={code} problemId={activeProblem?.id || null} aiEnabled={aiEnabled} />
                  </div>
                </div>
              )}

              {bottomTab === 'solutions' && (
                <div className="flex flex-1 flex-col lg:flex-row">
                  <div className="flex-1 overflow-hidden">
                    <SolutionComparison code={code} problemTitle={activeProblem?.title} />
                  </div>
                  <div className="hidden lg:block w-[380px] xl:w-[420px] shrink-0 overflow-hidden border-l border-panel-border">
                    <AIChatPanel code={code} problemId={activeProblem?.id || null} aiEnabled={aiEnabled} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <SettingsDialog open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};

export default Dashboard;
