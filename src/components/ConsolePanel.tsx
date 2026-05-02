import { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { Terminal, X, Loader2, Maximize2, Minimize2, ChevronDown, ChevronUp, Send, CornerDownLeft, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface ConsoleEntry {
  type: 'output' | 'error' | 'info' | 'system' | 'stdin';
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
  /** Called when user submits stdin input; only shown when waitingForInput=true */
  onStdinSubmit?: (input: string) => void;
  /** When true, shows the stdin input bar at the bottom of the console */
  waitingForInput?: boolean;
}

const ConsolePanel = ({
  entries,
  isRunning,
  onClear,
  isCollapsed,
  onToggleCollapse,
  isFullscreen,
  onToggleFullscreen,
  onStdinSubmit,
  waitingForInput = false,
}: ConsolePanelProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [stdinValue, setStdinValue] = useState('');
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries, waitingForInput]);

  // Auto-focus the input when waiting for input
  useEffect(() => {
    if (waitingForInput) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [waitingForInput]);

  const submitStdin = (source: string = 'enter') => {
    if (!onStdinSubmit) return;
    const val = stdinValue;
    if (val.trim() === '' && source === 'enter') {
      console.log('Ignoring empty Enter key to prevent accidental submission');
      return; 
    }
    console.log(`Submitting stdin via ${source}: [${val}]`);
    setInputHistory(h => [val, ...h.slice(0, 49)]);
    setHistoryIdx(-1);
    setStdinValue('');
    onStdinSubmit(val);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitStdin('enter');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(historyIdx + 1, inputHistory.length - 1);
      setHistoryIdx(next);
      if (inputHistory[next] !== undefined) setStdinValue(inputHistory[next]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.max(historyIdx - 1, -1);
      setHistoryIdx(next);
      setStdinValue(next === -1 ? '' : inputHistory[next] ?? '');
    }
  };

  const typeStyles: Record<string, string> = {
    output:  'text-foreground',
    error:   'text-destructive',
    info:    'text-primary',
    system:  'text-muted-foreground italic',
    stdin:   'text-yellow-400',
  };

  const typeIcons: Record<string, string> = {
    output:  '→',
    error:   '✗',
    info:    '●',
    system:  '◆',
    stdin:   '›',
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
          {isRunning && !waitingForInput && (
            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span className="text-[10px] font-medium text-primary">Running...</span>
            </div>
          )}
          {waitingForInput && (
            <div className="flex items-center gap-1.5 rounded-full bg-yellow-500/10 px-2 py-0.5 border border-yellow-500/20">
              <CornerDownLeft className="h-3 w-3 text-yellow-400" />
              <span className="text-[10px] font-medium text-yellow-400">Waiting for input...</span>
            </div>
          )}
          {waitingForInput && onStdinSubmit && (
            <button
              onClick={() => onStdinSubmit('')}
              className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors"
              title="Done entering inputs — run the code now"
            >
              <Play className="h-2.5 w-2.5" />
              Run Now
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand console' : 'Collapse console'}>
            {isCollapsed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onToggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-destructive/10 hover:text-destructive"
            onClick={onClear} title="Clear console">
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Console Output */}
      {!isCollapsed && (
        <>
          <ScrollArea className="flex-1">
            <div className="console-output space-y-1 p-3 font-mono text-xs">
              {entries.length === 0 && !isRunning && !waitingForInput && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Terminal className="h-3.5 w-3.5" />
                  <span>Ready. Click "Run Code" to execute your program.</span>
                </div>
              )}

              {entries.map((entry, i) => (
                <div
                  key={i}
                  className={`animate-fade-in flex gap-2 rounded px-2 py-1 transition-all duration-200 ${
                    entry.type === 'error'  ? 'bg-destructive/5' :
                    entry.type === 'info'   ? 'bg-primary/5' :
                    entry.type === 'system' ? 'bg-secondary/50' :
                    entry.type === 'stdin'  ? 'bg-yellow-500/5 border-l-2 border-yellow-500/30' : ''
                  }`}
                  style={{ animationDelay: `${Math.min(i * 20, 300)}ms`, animationDuration: '0.25s' }}
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

              {isRunning && !waitingForInput && entries.length > 0 && (
                <div className="flex items-center gap-2 animate-pulse text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Waiting for output...</span>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          {/* Interactive stdin input bar */}
          {waitingForInput && (
            <div className="border-t border-yellow-500/20 bg-yellow-500/5 px-3 py-2 flex items-center gap-2">
              <span className="text-yellow-400 font-mono text-xs shrink-0 select-none">›</span>
              <input
                ref={inputRef}
                type="text"
                value={stdinValue}
                onChange={e => setStdinValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter value then 'Add Line' (or Enter)  |  Click 'Run Now' only when ALL lines are added"
                className="flex-1 bg-transparent font-mono text-xs text-foreground placeholder:text-muted-foreground/40 outline-none border-none focus:ring-0"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                onClick={() => submitStdin('button')}
                className="shrink-0 flex items-center gap-1 text-[10px] text-yellow-400 hover:text-yellow-300 transition-colors px-1.5 py-0.5 rounded border border-yellow-500/30 hover:border-yellow-400/50"
              >
                <Send className="h-3 w-3" />
                Add Line
              </button>
              <button
                onClick={() => {
                  if (stdinValue.trim() !== '') {
                    submitStdin('run-now-auto');
                  }
                  setTimeout(() => onStdinSubmit?.(''), 50);
                }}
                className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors px-2 py-0.5 rounded border border-emerald-500/30 hover:border-emerald-400/50 bg-emerald-500/10"
                title="Finish input and run code (will include current text)"
              >
                <Play className="h-3 w-3" />
                Run Now
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ConsolePanel;
