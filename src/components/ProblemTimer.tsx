import { useState, useEffect, useRef, useCallback } from 'react';
import { Timer, Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ProblemTimerProps {
  problemId: string | null;
  onTimeUpdate?: (seconds: number) => void;
  autoStart?: boolean;
}

const formatTime = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const ProblemTimer = ({ problemId, onTimeUpdate, autoStart = true }: ProblemTimerProps) => {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(autoStart);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastProblemId = useRef(problemId);

  // Reset when problem changes
  useEffect(() => {
    if (problemId !== lastProblemId.current) {
      setSeconds(0);
      setIsRunning(autoStart);
      lastProblemId.current = problemId;
    }
  }, [problemId, autoStart]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => {
          const next = prev + 1;
          onTimeUpdate?.(next);
          return next;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, onTimeUpdate]);

  const toggle = useCallback(() => setIsRunning(r => !r), []);
  const reset = useCallback(() => { setSeconds(0); setIsRunning(false); }, []);

  const color = seconds < 300 ? 'text-success' : seconds < 900 ? 'text-warning' : 'text-destructive';

  return (
    <div className="flex items-center gap-1.5">
      <Timer className={`h-3.5 w-3.5 ${color}`} />
      <Badge variant="outline" className={`font-mono text-[11px] tabular-nums ${color} border-current/20`}>
        {formatTime(seconds)}
      </Badge>
      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={toggle}>
        {isRunning ? <Pause className="h-2.5 w-2.5" /> : <Play className="h-2.5 w-2.5" />}
      </Button>
      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={reset}>
        <RotateCcw className="h-2.5 w-2.5" />
      </Button>
    </div>
  );
};

export default ProblemTimer;
