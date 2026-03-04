import { Terminal, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ConsoleEntry {
  type: 'output' | 'error' | 'info' | 'system';
  text: string;
  timestamp: string;
}

interface ConsolePanelProps {
  entries: ConsoleEntry[];
  isRunning: boolean;
  onClear: () => void;
}

const ConsolePanel = ({ entries, isRunning, onClear }: ConsolePanelProps) => {
  const typeColors: Record<string, string> = {
    output: 'text-foreground',
    error: 'text-destructive',
    info: 'text-primary',
    system: 'text-muted-foreground',
  };

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b border-panel-border px-3 py-1.5">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Console
          </span>
          {isRunning && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
        </div>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onClear}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      <div className="console-output flex-1 overflow-y-auto p-3">
        {entries.length === 0 && (
          <span className="text-xs text-muted-foreground">Ready. Click "Run" to execute your code.</span>
        )}
        {entries.map((entry, i) => (
          <div key={i} className={`${typeColors[entry.type]} whitespace-pre-wrap`}>
            <span className="mr-2 text-muted-foreground">[{entry.timestamp}]</span>
            {entry.text}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConsolePanel;
