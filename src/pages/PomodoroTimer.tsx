import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, RotateCcw, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type Phase = 'focus' | 'short-break' | 'long-break';
const PHASE_LABELS: Record<Phase, string> = { 'focus': '🎯 Focus', 'short-break': '☕ Short Break', 'long-break': '🌿 Long Break' };

const PomodoroTimer = () => {
  const navigate = useNavigate();
  const [durations, setDurations] = useState<Record<Phase, number>>({ focus: 25, 'short-break': 5, 'long-break': 15 });
  const [phase, setPhase] = useState<Phase>('focus');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [totalFocusTime, setTotalFocusTime] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [dailySessions, setDailySessions] = useState<number[]>([]);
  const intervalRef = useRef<any>(null);

  // Load saved stats
  useEffect(() => {
    const saved = localStorage.getItem('pomodoro-stats');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        const today = new Date().toDateString();
        if (data.date === today) {
          setSessions(data.sessions || 0);
          setTotalFocusTime(data.focusTime || 0);
        }
        setDailySessions(data.history || []);
      } catch {}
    }
    const savedDurations = localStorage.getItem('pomodoro-durations');
    if (savedDurations) {
      try { setDurations(JSON.parse(savedDurations)); } catch {}
    }
  }, []);

  // Save stats
  useEffect(() => {
    const today = new Date().toDateString();
    const history = [...dailySessions];
    if (sessions > 0) {
      localStorage.setItem('pomodoro-stats', JSON.stringify({ date: today, sessions, focusTime: totalFocusTime, history }));
    }
  }, [sessions, totalFocusTime, dailySessions]);

  const totalTime = durations[phase] * 60;
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
    if (soundEnabled) {
      try { new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==').play().catch(() => {}); } catch {}
    }
    if (phase === 'focus') {
      const newSessions = sessions + 1;
      setSessions(newSessions);
      setDailySessions(prev => [...prev, Date.now()]);
      toast.success(`Focus session #${newSessions} complete! Take a break.`);
      const nextPhase = newSessions % 4 === 0 ? 'long-break' : 'short-break';
      setPhase(nextPhase);
      setTimeLeft(durations[nextPhase] * 60);
    } else {
      toast.success('Break over! Time to focus.');
      setPhase('focus');
      setTimeLeft(durations.focus * 60);
    }
  }, [phase, sessions, durations, soundEnabled]);

  const toggleRunning = () => setRunning(!running);
  const reset = () => { setRunning(false); setTimeLeft(durations[phase] * 60); };
  const switchPhase = (p: Phase) => { setRunning(false); setPhase(p); setTimeLeft(durations[p] * 60); };

  const updateDuration = (p: Phase, val: number) => {
    const clamped = Math.max(1, Math.min(120, val));
    const next = { ...durations, [p]: clamped };
    setDurations(next);
    localStorage.setItem('pomodoro-durations', JSON.stringify(next));
    if (p === phase && !running) setTimeLeft(clamped * 60);
  };

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const phaseColors: Record<Phase, string> = {
    'focus': 'text-primary',
    'short-break': 'text-emerald-500',
    'long-break': 'text-purple-500',
  };

  const phaseBgColors: Record<Phase, string> = {
    'focus': 'from-primary/5 to-transparent',
    'short-break': 'from-emerald-500/5 to-transparent',
    'long-break': 'from-purple-500/5 to-transparent',
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-panel-border bg-ide-toolbar px-4 py-2 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-7 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back
        </Button>
        <span className="font-bold text-foreground">🍅 Pomodoro Timer</span>
        <div className="ml-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs"><Settings2 className="h-3 w-3" /> Settings</Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 space-y-3">
              <p className="text-xs font-bold text-foreground">Customize Durations (min)</p>
              {(['focus', 'short-break', 'long-break'] as Phase[]).map(p => (
                <div key={p} className="flex items-center justify-between">
                  <Label className="text-xs">{PHASE_LABELS[p]}</Label>
                  <Input type="number" min={1} max={120} value={durations[p]} onChange={e => updateDuration(p, Number(e.target.value))} className="w-16 h-7 text-xs" />
                </div>
              ))}
              <div className="flex items-center justify-between pt-1">
                <Label className="text-xs">🔔 Sound notification</Label>
                <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className={`max-w-md mx-auto p-6 space-y-6 flex flex-col items-center bg-gradient-to-b ${phaseBgColors[phase]}`}>
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
            <p className={`text-7xl font-mono font-bold ${phaseColors[phase]} tracking-wider tabular-nums`}>
              {fmt(timeLeft)}
            </p>
            <Progress value={progress} className="h-2 mt-6 w-full max-w-xs" />
            <p className="text-[10px] text-muted-foreground mt-2">
              {running ? 'Stay focused...' : timeLeft < totalTime ? 'Paused' : 'Ready to start'}
            </p>
          </CardContent>
        </Card>

        {/* Controls */}
        <div className="flex gap-3">
          <Button size="lg" onClick={toggleRunning} className="gap-2 px-8">
            {running ? <><Pause className="h-4 w-4" /> Pause</> : <><Play className="h-4 w-4" /> {timeLeft < totalTime ? 'Resume' : 'Start'}</>}
          </Button>
          <Button size="lg" variant="outline" onClick={reset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 w-full">
          <Card><CardContent className="pt-3 pb-3 text-center">
            <p className="text-xl font-bold text-foreground">{sessions}</p>
            <p className="text-[10px] text-muted-foreground">Sessions</p>
          </CardContent></Card>
          <Card><CardContent className="pt-3 pb-3 text-center">
            <p className="text-xl font-bold text-foreground">{Math.round(totalFocusTime / 60)}</p>
            <p className="text-[10px] text-muted-foreground">Focus min</p>
          </CardContent></Card>
          <Card><CardContent className="pt-3 pb-3 text-center">
            <p className="text-xl font-bold text-foreground">{sessions * durations.focus}</p>
            <p className="text-[10px] text-muted-foreground">Est. min</p>
          </CardContent></Card>
          <Card><CardContent className="pt-3 pb-3 text-center">
            <p className="text-xl font-bold text-foreground">{Math.floor(sessions / 4)}</p>
            <p className="text-[10px] text-muted-foreground">Cycles</p>
          </CardContent></Card>
        </div>

        {/* Pomodoro dots */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`h-3 w-3 rounded-full border-2 transition-colors ${
              i < (sessions % 4) ? 'bg-primary border-primary' : 'border-muted-foreground/30'
            }`} />
          ))}
          <span className="text-[10px] text-muted-foreground ml-2">
            {4 - (sessions % 4)} sessions until long break
          </span>
        </div>

        <p className="text-xs text-muted-foreground text-center max-w-xs">
          Focus for {durations.focus} min, take a {durations['short-break']} min break. Every 4 sessions, take a {durations['long-break']} min long break.
        </p>
      </div>
    </div>
  );
};

export default PomodoroTimer;
