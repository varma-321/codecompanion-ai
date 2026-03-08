import { Play, Save, Zap, Settings, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

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
}

const Toolbar = ({ onRun, onSave, onAnalyze, onSettings, onLogout, username, isRunning, isSaving, runDisabled, aiEnabled, onAIToggle }: ToolbarProps) => {
  return (
    <div className="flex items-center justify-between border-b border-panel-border bg-ide-toolbar px-3 py-1.5">
      <div className="flex items-center gap-1">
        <Button onClick={onRun} disabled={isRunning || runDisabled} size="sm" className="h-7 gap-1 text-xs">
          {isRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
          Run
        </Button>
        <Button onClick={onSave} disabled={isSaving} size="sm" variant="outline" className="h-7 gap-1 text-xs">
          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Save
        </Button>
        <Button onClick={onAnalyze} disabled={!aiEnabled} size="sm" variant="outline" className="h-7 gap-1 text-xs">
          <Zap className="h-3 w-3" />
          Analyze
        </Button>

        <div className="ml-3 flex items-center gap-1.5 rounded-md border border-input bg-background px-2 py-0.5">
          <Label htmlFor="ai-toggle" className="text-[10px] font-medium text-muted-foreground cursor-pointer select-none">
            AI Assistant
          </Label>
          <Switch
            id="ai-toggle"
            checked={aiEnabled}
            onCheckedChange={onAIToggle}
            className="h-4 w-8 [&>span]:h-3 [&>span]:w-3 data-[state=checked]:[&>span]:translate-x-4"
          />
        </div>
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
