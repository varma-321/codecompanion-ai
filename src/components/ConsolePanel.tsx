import { useEffect, useRef, useState } from 'react';
import { Terminal, X, Loader2, Maximize2, Minimize2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface ConsoleEntry {
  type: 'output' | 'error' | 'info' | 'system';
  text: string;
  timestamp: string;
}

interface ConsolePanelProps {
  entries: ConsoleEntry[];
  isRunning: boolean;
  onClear: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

const ConsolePanel = ({ entries, isRunning, onClear, isCollapsed, onToggleCollapse, isFullscreen, onToggleFullscreen }: ConsolePanelProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  const typeStyles: Record<string, string> = {
    output: 'text-foreground',
    error: 'text-destructive',
    info: 'text-primary',
    system: 'text-muted-foreground italic',
  };

  const typeIcons: Record<string, string> = {
    output: '→',
    error: '✗',
    info: '●',
    system: '◆',
  };

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-panel-border px-3 py-1.5">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Console
          </span>
          {isRunning && (
            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span className="text-[10px] font-medium text-primary">Running...</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand console' : 'Collapse console'}
          >
            {isCollapsed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-destructive/10 hover:text-destructive"
            onClick={onClear}
            title="Clear console"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Console Output */}
      {!isCollapsed && (
        <ScrollArea className="flex-1">
          <div className="console-output space-y-1 p-3 font-mono text-xs">
            {entries.length === 0 && !isRunning && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Terminal className="h-3.5 w-3.5" />
                <span>Ready. Click "Run Code" to execute your program.</span>
              </div>
            )}

            {entries.map((entry, i) => (
              <div
                key={i}
                className={`animate-fade-in flex gap-2 rounded px-2 py-1 transition-all duration-200 ${
                  entry.type === 'error' ? 'bg-destructive/5' :
                  entry.type === 'info' ? 'bg-primary/5' :
                  entry.type === 'system' ? 'bg-secondary/50' : ''
                }`}
                style={{ animationDelay: `${i * 30}ms`, animationDuration: '0.3s' }}
              >
                <span className="shrink-0 select-none text-muted-foreground/60">
                  [{entry.timestamp}]
                </span>
                <span className={`shrink-0 ${typeStyles[entry.type]}`}>
                  {typeIcons[entry.type]}
                </span>
                <pre className={`flex-1 whitespace-pre-wrap break-words ${typeStyles[entry.type]}`}>
                  {entry.text}
                </pre>
              </div>
            ))}

            {isRunning && entries.length > 0 && (
              <div className="flex items-center gap-2 animate-pulse text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Waiting for output...</span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default ConsolePanel;
