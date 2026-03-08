import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, RotateCcw, Coffee, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

type Phase = 'focus' | 'short-break' | 'long-break';

const DURATIONS: Record<Phase, number> = { 'focus': 25 * 60, 'short-break': 5 * 60, 'long-break': 15 * 60 };
const PHASE_LABELS: Record<Phase, string> = { 'focus': '🎯 Focus', 'short-break': '☕ Short Break', 'long-break': '🌿 Long Break' };

const PomodoroTimer = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('focus');
  const [timeLeft, setTimeLeft] = useState(DURATIONS.focus);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [totalFocusTime, setTotalFocusTime] = useState(0);
  const intervalRef = useRef<any>(null);

  const totalTime = DURATIONS[phase];
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  useEffect(() => {
    if (!running) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          handlePhaseComplete();
          return 0;
        }
        if (phase === 'focus') setTotalFocusTime(t => t + 1);
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, phase]);

  const handlePhaseComplete = useCallback(() => {
    if (phase === 'focus') {
      const newSessions = sessions + 1;
      setSessions(newSessions);
      toast.success(`Focus session #${newSessions} complete! Take a break.`);
      const nextPhase = newSessions % 4 === 0 ? 'long-break' : 'short-break';
      setPhase(nextPhase);
      setTimeLeft(DURATIONS[nextPhase]);
    } else {
      toast.success('Break over! Time to focus.');
      setPhase('focus');
      setTimeLeft(DURATIONS.focus);
    }
  }, [phase, sessions]);

  const toggleRunning = () => setRunning(!running);
  const reset = () => { setRunning(false); setTimeLeft(DURATIONS[phase]); };
  const switchPhase = (p: Phase) => { setRunning(false); setPhase(p); setTimeLeft(DURATIONS[p]); };

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const phaseColors: Record<Phase, string> = {
    'focus': 'text-primary',
    'short-break': 'text-emerald-500',
    'long-break': 'text-purple-500',
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-panel-border bg-ide-toolbar px-4 py-2 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-7 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back
        </Button>
        <span className="font-bold text-foreground">🍅 Pomodoro Timer</span>
      </div>

      <div className="max-w-md mx-auto p-6 space-y-6 flex flex-col items-center">
        {/* Phase Tabs */}
        <div className="flex gap-2">
          {(['focus', 'short-break', 'long-break'] as Phase[]).map(p => (
            <Button key={p} variant={phase === p ? 'default' : 'outline'} size="sm" onClick={() => switchPhase(p)} className="text-xs">
              {PHASE_LABELS[p]}
            </Button>
          ))}
        </div>

        {/* Timer Display */}
        <Card className="w-full">
          <CardContent className="pt-8 pb-8 flex flex-col items-center">
            <p className="text-xs text-muted-foreground mb-2">{PHASE_LABELS[phase]}</p>
            <p className={`text-7xl font-mono font-bold ${phaseColors[phase]} tracking-wider`}>
              {fmt(timeLeft)}
            </p>
            <Progress value={progress} className="h-2 mt-6 w-full max-w-xs" />
          </CardContent>
        </Card>

        {/* Controls */}
        <div className="flex gap-3">
          <Button size="lg" onClick={toggleRunning} className="gap-2 px-8">
            {running ? <><Pause className="h-4 w-4" /> Pause</> : <><Play className="h-4 w-4" /> {timeLeft < DURATIONS[phase] ? 'Resume' : 'Start'}</>}
          </Button>
          <Button size="lg" variant="outline" onClick={reset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 w-full">
          <Card><CardContent className="pt-4 text-center">
            <p className="text-xl font-bold text-foreground">{sessions}</p>
            <p className="text-[10px] text-muted-foreground">Sessions</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-xl font-bold text-foreground">{Math.round(totalFocusTime / 60)}</p>
            <p className="text-[10px] text-muted-foreground">Focus min</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-xl font-bold text-foreground">{sessions * 25}</p>
            <p className="text-[10px] text-muted-foreground">Est. min</p>
          </CardContent></Card>
        </div>

        <p className="text-xs text-muted-foreground text-center max-w-xs">
          Focus for 25 min, then take a 5 min break. Every 4 sessions, take a 15 min long break.
        </p>
      </div>
    </div>
  );
};

export default PomodoroTimer;
