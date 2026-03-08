import { useNavigate } from 'react-router-dom';
import { Play, Save, Zap, Settings, LogOut, Loader2, BookOpen, Moon, Sun, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/lib/theme-context';

interface ToolbarProps {
  onRun: () => void;
  onSave: () => void;
  onAnalyze: () => void;
  onSettings: () => void;
  onLogout: () => void;
  username: string;
  isRunning: boolean;
  isSaving: boolean;
  runDisabled?: boolean;
  aiEnabled: boolean;
  onAIToggle: (enabled: boolean) => void;
  isAutoSaving?: boolean;
  codeIsDirty?: boolean;
}

const Toolbar = ({ onRun, onSave, onAnalyze, onSettings, onLogout, username, isRunning, isSaving, runDisabled, aiEnabled, onAIToggle, isAutoSaving, codeIsDirty }: ToolbarProps) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex items-center justify-between border-b border-panel-border bg-ide-toolbar px-3 py-1.5">
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/modules')}
          className="h-7 gap-1 text-xs shrink-0 mr-2"
        >
          <BookOpen className="h-3 w-3" />
          Modules
        </Button>

        <Button onClick={onRun} disabled={isRunning || runDisabled} size="sm" className="h-7 gap-1 text-xs shrink-0">
          {isRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
          Run
        </Button>
        <Button onClick={onSave} disabled={isSaving} size="sm" variant="outline" className="h-7 gap-1 text-xs shrink-0">
          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Save
        </Button>

        <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-1 shrink-0">
          {isAutoSaving ? (
            <><Loader2 className="h-3 w-3 animate-spin" /> Saving...</>
          ) : codeIsDirty ? (
            <span className="text-yellow-500">● Unsaved</span>
          ) : (
            <><Cloud className="h-3 w-3 text-green-500" /> Saved</>
          )}
        </span>

        <Button onClick={onAnalyze} disabled={!aiEnabled} size="sm" variant="outline" className="h-7 gap-1 text-xs shrink-0">
          <Zap className="h-3 w-3" />
          AI
        </Button>

        <div className="ml-2 flex items-center gap-1.5 rounded-md border border-input bg-background px-2 py-0.5 shrink-0">
          <Label htmlFor="ai-toggle" className="text-[10px] font-medium text-muted-foreground cursor-pointer select-none">
            AI
          </Label>
          <Switch
            id="ai-toggle"
            checked={aiEnabled}
            onCheckedChange={onAIToggle}
            className="h-4 w-8 [&>span]:h-3 [&>span]:w-3 data-[state=checked]:[&>span]:translate-x-4"
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button onClick={toggleTheme} size="icon" variant="ghost" className="h-7 w-7" title="Toggle theme">
          {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </Button>
        <span className="text-xs text-muted-foreground font-mono">{username}</span>
        <Button onClick={onSettings} size="icon" variant="ghost" className="h-7 w-7">
          <Settings className="h-3.5 w-3.5" />
        </Button>
        <Button onClick={onLogout} size="icon" variant="ghost" className="h-7 w-7">
          <LogOut className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default Toolbar;
