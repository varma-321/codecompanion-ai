import { Play, Save, Zap, Settings, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ToolbarProps {
  onRun: () => void;
  onSave: () => void;
  onAnalyze: () => void;
  onSettings: () => void;
  onLogout: () => void;
  username: string;
  isRunning: boolean;
  isSaving: boolean;
}

const Toolbar = ({ onRun, onSave, onAnalyze, onSettings, onLogout, username, isRunning, isSaving }: ToolbarProps) => {
  return (
    <div className="flex items-center justify-between border-b border-panel-border bg-ide-toolbar px-3 py-1.5">
      <div className="flex items-center gap-1">
        <Button onClick={onRun} disabled={isRunning} size="sm" className="h-7 gap-1 text-xs">
          {isRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
          Run
        </Button>
        <Button onClick={onSave} disabled={isSaving} size="sm" variant="outline" className="h-7 gap-1 text-xs">
          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Save
        </Button>
        <Button onClick={onAnalyze} size="sm" variant="outline" className="h-7 gap-1 text-xs">
          <Zap className="h-3 w-3" />
          Analyze
        </Button>
      </div>

      <div className="flex items-center gap-2">
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
