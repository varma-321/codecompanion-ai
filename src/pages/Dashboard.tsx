import { useState, useCallback } from 'react';
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
import { Problem, getProblems, updateProblem, DEFAULT_CODE } from '@/lib/store';
import { executeJavaCode, type ExecutionStatus as ExecStatusType } from '@/lib/executor';
import { detectProblemTitle } from '@/lib/ai-backend';

interface DashboardProps {
  username: string;
  onLogout: () => void;
}

const Dashboard = ({ username, onLogout }: DashboardProps) => {
  const [problems, setProblems] = useState<Problem[]>(getProblems());
  const [activeProblem, setActiveProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState(DEFAULT_CODE);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [execStatus, setExecStatus] = useState<ExecStatusType>('ready');

  const refreshProblems = useCallback(() => {
    setProblems(getProblems());
  }, []);

  const handleSelectProblem = (problem: Problem) => {
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
    if (isRunning) return; // Prevent duplicate requests
    
    setIsRunning(true);
    setExecStatus('sending');
    addConsoleEntry('system', '▶ Compiling and running...');
    
    try {
      const result = await executeJavaCode(code, (status) => setExecStatus(status));

      if (result.success) {
        // Successful execution
        if (result.output) {
          addConsoleEntry('output', result.output);
        }
        addConsoleEntry('info', '✓ Execution completed successfully');
      } else {
        // Error occurred
        if (result.error) {
          addConsoleEntry('error', result.error);
        }
        
        // Add status description for non-compilation errors
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
    if (!activeProblem) {
      toast.error('No problem selected');
      return;
    }
    setIsSaving(true);
    try {
      if (activeProblem.title === 'New Problem' && aiEnabled) {
        try {
          const detectedTitle = await detectProblemTitle(code);
          if (detectedTitle && detectedTitle !== 'Unknown Problem') {
            updateProblem(activeProblem.id, { title: detectedTitle, code });
            setActiveProblem(prev => prev ? { ...prev, title: detectedTitle, code } : null);
            toast.success(`Saved as "${detectedTitle}"`);
          } else {
            updateProblem(activeProblem.id, { code });
            toast.success('Code saved');
          }
        } catch {
          updateProblem(activeProblem.id, { code });
          toast.success('Code saved');
        }
      } else {
        updateProblem(activeProblem.id, { code });
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
    // The AIChatPanel will handle this via a custom event
    window.dispatchEvent(new CustomEvent('trigger-explain', { detail: { code } }));
    // Reset after a short delay (the panel manages its own loading)
    setTimeout(() => setIsExplaining(false), 1000);
  };

  const handleAnalyze = async () => {
    if (!activeProblem) {
      toast.error('No problem selected');
      return;
    }
    if (!aiEnabled) {
      toast.error('AI Assistant is disabled. Enable it in the toolbar.');
      return;
    }
    toast.info('Use the AI chat panel to analyze your code.');
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <Toolbar
        onRun={handleRun}
        onSave={handleSave}
        onAnalyze={handleAnalyze}
        onSettings={() => setShowSettings(true)}
        onLogout={onLogout}
        username={username}
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
          {/* Code Editor */}
          <div className="flex-1 overflow-hidden">
            <CodeEditor code={code} onChange={setCode} />
          </div>

          {/* Action Buttons Bar */}
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

          {/* Bottom Split: Console + AI Panel */}
          <div className="flex h-72 shrink-0 border-t border-panel-border">
            {/* Console Panel - Left */}
            <div className="flex-1 overflow-hidden border-r border-panel-border">
              <ConsolePanel
                entries={consoleEntries}
                isRunning={isRunning}
                onClear={() => setConsoleEntries([])}
              />
            </div>

            {/* AI Explanation Panel - Right */}
            <div className="w-[420px] shrink-0 overflow-hidden">
              <AIChatPanel code={code} problemId={activeProblem?.id || null} aiEnabled={aiEnabled} />
            </div>
          </div>
        </div>
      </div>

      <SettingsDialog open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};

export default Dashboard;
