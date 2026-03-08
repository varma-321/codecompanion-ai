import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import ProblemExplorer from '@/components/ProblemExplorer';
import CodeEditor from '@/components/CodeEditor';
import AIChatPanel from '@/components/AIChatPanel';
import ConsolePanel, { ConsoleEntry } from '@/components/ConsolePanel';
import Toolbar from '@/components/Toolbar';
import ExecutionStatus from '@/components/ExecutionStatus';
import SettingsDialog from '@/components/SettingsDialog';
import { Problem, getProblems, updateProblem, DEFAULT_CODE } from '@/lib/store';
import { executeJavaCode, type ExecutionStatus as ExecStatusType } from '@/lib/executor';
import { detectProblemTitle } from '@/lib/ollama';

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
  const [showSettings, setShowSettings] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [execStatus, setExecStatus] = useState<ExecStatusType>('ready');
  const [runDisabled, setRunDisabled] = useState(false);

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
    setIsRunning(true);
    setExecStatus('sending');
    addConsoleEntry('system', '▶ Compiling and running...');
    try {
      const result = await executeJavaCode(code, (status) => setExecStatus(status));

      if (result.stderr) {
        addConsoleEntry('error', result.stderr);
      }
      if (result.stdout) {
        addConsoleEntry('output', result.stdout);
      }
      if (result.status.id === 3) {
        addConsoleEntry('info', '✓ Execution complete');
      } else if (result.status.description !== 'Compilation Error') {
        addConsoleEntry('error', `Status: ${result.status.description}`);
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
        runDisabled={runDisabled}
        aiEnabled={aiEnabled}
        onAIToggle={setAiEnabled}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="w-56 shrink-0 border-r border-panel-border">
          <ProblemExplorer
            problems={problems}
            activeProblemId={activeProblem?.id || null}
            onSelect={handleSelectProblem}
            onRefresh={refreshProblems}
          />
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <CodeEditor code={code} onChange={setCode} />
          </div>
          <ExecutionStatus status={execStatus} />
          <div className="h-48 shrink-0 border-t border-panel-border">
            <ConsolePanel
              entries={consoleEntries}
              isRunning={isRunning}
              onClear={() => setConsoleEntries([])}
            />
          </div>
        </div>

        <div className="w-80 shrink-0 border-l border-panel-border">
          <AIChatPanel code={code} problemId={activeProblem?.id || null} aiEnabled={aiEnabled} />
        </div>
      </div>

      <SettingsDialog open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};

export default Dashboard;
