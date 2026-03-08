import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Play, Brain, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProblemExplorer from '@/components/ProblemExplorer';
import CodeEditor from '@/components/CodeEditor';
import AIChatPanel from '@/components/AIChatPanel';
import ConsolePanel, { ConsoleEntry } from '@/components/ConsolePanel';
import Toolbar from '@/components/Toolbar';
import ExecutionStatus from '@/components/ExecutionStatus';
import SettingsDialog from '@/components/SettingsDialog';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useUser } from '@/lib/user-context';
import { DbProblem, fetchProblems, updateProblem, DEFAULT_CODE } from '@/lib/supabase';
import { executeJavaCode, type ExecutionStatus as ExecStatusType } from '@/lib/executor';
import { detectProblemTitle } from '@/lib/ai-backend';

const Dashboard = () => {
  const { user, setUser } = useUser();
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

  // Load problems on mount
  useEffect(() => {
    if (user) {
      fetchProblems(user.id).then(setProblems).catch(() => {});
    }
  }, [user]);

  const refreshProblems = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchProblems(user.id);
      setProblems(data);
    } catch { /* silent */ }
  }, [user]);

  const handleSelectProblem = (problem: DbProblem) => {
    setActiveProblem(problem);
    setCode(problem.code);
  };

  const addConsoleEntry = (type: ConsoleEntry['type'], text: string) => {
    setConsoleEntries(prev => [...prev, {
      type,
      text,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
    }]);
  };

  const handleRun = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setExecStatus('sending');
    setConsoleCollapsed(false);
    addConsoleEntry('system', '▶ Compiling and running...');

    try {
      const result = await executeJavaCode(code, (status) => setExecStatus(status));
      if (result.success) {
        if (result.output) addConsoleEntry('output', result.output);
        addConsoleEntry('info', '✓ Execution completed successfully');
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

  const handleSave = async () => {
    if (!activeProblem || !user) {
      toast.error('No problem selected');
      return;
    }
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
    } catch {
      toast.error('Failed to save');
    }
    setIsSaving(false);
  };

  const handleExplain = () => {
    if (!aiEnabled) {
      toast.error('AI Assistant is disabled. Enable it in the toolbar.');
      return;
    }
    setIsExplaining(true);
    window.dispatchEvent(new CustomEvent('trigger-explain', { detail: { code } }));
    setTimeout(() => setIsExplaining(false), 1000);
  };

  const handleAnalyze = async () => {
    if (!activeProblem) { toast.error('No problem selected'); return; }
    if (!aiEnabled) { toast.error('AI Assistant is disabled.'); return; }
    toast.info('Use the AI chat panel to analyze your code.');
  };

  const handleLogout = () => {
    setUser(null);
  };

  // Resizable divider drag for console
  const dividerRef = useRef<HTMLDivElement>(null);
  const [consoleHeight, setConsoleHeight] = useState(288); // default h-72

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = consoleHeight;

    const onMouseMove = (ev: MouseEvent) => {
      const delta = startY - ev.clientY;
      setConsoleHeight(Math.max(80, Math.min(600, startHeight + delta)));
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [consoleHeight]);

  return (
    <div className="flex h-screen flex-col bg-background">
      <Toolbar
        onRun={handleRun}
        onSave={handleSave}
        onAnalyze={handleAnalyze}
        onSettings={() => setShowSettings(true)}
        onLogout={handleLogout}
        username={user?.username || ''}
        isRunning={isRunning}
        isSaving={isSaving}
        runDisabled={false}
        aiEnabled={aiEnabled}
        onAIToggle={setAiEnabled}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Problem Explorer Sidebar */}
        <div className="w-56 shrink-0 border-r border-panel-border">
          <ProblemExplorer
            problems={problems}
            activeProblemId={activeProblem?.id || null}
            onSelect={handleSelectProblem}
            onRefresh={refreshProblems}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Code Editor - takes remaining space */}
          <div className={`overflow-hidden ${consoleFullscreen ? 'hidden' : 'flex-1'}`}>
            <CodeEditor code={code} onChange={setCode} />
          </div>

          {/* Action Buttons Bar */}
          {!consoleFullscreen && (
            <div className="flex items-center gap-2 border-t border-panel-border bg-ide-toolbar px-4 py-2">
              <Button
                onClick={handleRun}
                disabled={isRunning}
                size="sm"
                className="h-8 gap-1.5 px-4 text-xs font-semibold"
              >
                {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                {isRunning ? 'Running...' : 'Run Code'}
              </Button>
              <Button
                onClick={handleExplain}
                disabled={isExplaining || !aiEnabled}
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 px-4 text-xs font-semibold"
              >
                {isExplaining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
                {isExplaining ? 'Analyzing Code...' : 'Explain Code'}
              </Button>
              <ExecutionStatus status={execStatus} />
            </div>
          )}

          {/* Resizable Divider */}
          <div
            ref={dividerRef}
            onMouseDown={handleDividerMouseDown}
            className="resize-handle h-1 cursor-row-resize border-t border-panel-border hover:bg-primary/30 transition-colors"
          />

          {/* Bottom Split: Console + AI Panel */}
          <div
            className={`shrink-0 border-t border-panel-border ${consoleFullscreen ? 'flex-1' : ''}`}
            style={consoleFullscreen ? {} : { height: consoleCollapsed ? 32 : consoleHeight }}
          >
            <div className="flex h-full">
              {/* Console Panel - Left */}
              <div className="flex-1 overflow-hidden border-r border-panel-border">
                <ConsolePanel
                  entries={consoleEntries}
                  isRunning={isRunning}
                  onClear={() => setConsoleEntries([])}
                  isCollapsed={consoleCollapsed}
                  onToggleCollapse={() => setConsoleCollapsed(c => !c)}
                  isFullscreen={consoleFullscreen}
                  onToggleFullscreen={() => setConsoleFullscreen(f => !f)}
                />
              </div>

              {/* AI Explanation Panel - Right */}
              {!consoleCollapsed && (
                <div className="w-[420px] shrink-0 overflow-hidden">
                  <AIChatPanel code={code} problemId={activeProblem?.id || null} aiEnabled={aiEnabled} />
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
