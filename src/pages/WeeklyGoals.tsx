import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, CheckCircle2, Circle, Plus, Trash2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';

interface Goal {
  id: string;
  text: string;
  target: number;
  current: number;
  type: 'problems' | 'minutes' | 'custom';
  done: boolean;
}

const PRESET_GOALS = [
  { text: 'Solve 5 problems', target: 5, type: 'problems' as const },
  { text: 'Solve 10 problems', target: 10, type: 'problems' as const },
  { text: 'Solve 3 hard problems', target: 3, type: 'custom' as const },
  { text: 'Complete 2 contest sessions', target: 2, type: 'custom' as const },
  { text: 'Review 5 spaced repetition items', target: 5, type: 'custom' as const },
  { text: 'Study 30 minutes', target: 30, type: 'minutes' as const },
];

const WeeklyGoals = () => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoal, setNewGoal] = useState('');
  const [newTarget, setNewTarget] = useState(5);
  const [stats, setStats] = useState({ solvedThisWeek: 0 });
  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`weekly-goals-${authUser?.id}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        // Weekly reset check
        const savedWeek = data.week;
        const currentWeek = getWeekNumber();
        if (savedWeek === currentWeek) {
          setGoals(data.goals || []);
        }
      } catch {}
    }

    if (!authUser) return;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    supabase.from('user_problem_progress').select('*').eq('user_id', authUser.id)
      .gte('last_attempted', weekAgo.toISOString())
      .then(({ data }) => {
        const solved = (data || []).filter((p: any) => p.solved).length;
        setStats({ solvedThisWeek: solved });
        setGoals(prev => prev.map(g => g.type === 'problems' ? { ...g, current: solved } : g));
      });
  }, [authUser]);

  useEffect(() => {
    if (authUser) {
      localStorage.setItem(`weekly-goals-${authUser.id}`, JSON.stringify({ week: getWeekNumber(), goals }));
    }
  }, [goals, authUser]);

  const getWeekNumber = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    return Math.ceil((((now.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7);
  };

  const addGoal = (text?: string, target?: number, type?: Goal['type']) => {
    const goalText = text || newGoal;
    const goalTarget = target || newTarget;
    if (!goalText.trim()) return;
    setGoals(prev => [...prev, {
      id: Date.now().toString(),
      text: goalText,
      target: goalTarget,
      current: type === 'problems' ? stats.solvedThisWeek : 0,
      type: type || (goalText.toLowerCase().includes('problem') ? 'problems' : goalText.toLowerCase().includes('minute') ? 'minutes' : 'custom'),
      done: false,
    }]);
    setNewGoal('');
    setNewTarget(5);
    setShowPresets(false);
  };

  const toggleDone = (id: string) => setGoals(prev => prev.map(g => g.id === id ? { ...g, done: !g.done } : g));
  const removeGoal = (id: string) => setGoals(prev => prev.filter(g => g.id !== id));
  const incrementGoal = (id: string) => setGoals(prev => prev.map(g => g.id === id ? { ...g, current: Math.min(g.current + 1, g.target) } : g));

  const completedCount = goals.filter(g => g.done || g.current >= g.target).length;
  const completionPct = goals.length > 0 ? Math.round((completedCount / goals.length) * 100) : 0;

  if (!authUser) return <div className="flex h-screen items-center justify-center bg-background"><p className="text-foreground">Please log in</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-panel-border bg-ide-toolbar px-4 py-2 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-7 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back
        </Button>
        <Target className="h-4 w-4 text-primary" />
        <span className="font-bold text-foreground">Weekly Goals</span>
        <Badge variant="outline" className="text-[10px]">Week {getWeekNumber()}</Badge>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.solvedThisWeek}</p>
            <p className="text-xs text-muted-foreground">Solved this week</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-foreground">{completedCount}/{goals.length}</p>
            <p className="text-xs text-muted-foreground">Goals completed</p>
          </CardContent></Card>
          <Card className={completionPct === 100 && goals.length > 0 ? 'border-primary/30 bg-primary/5' : ''}>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-foreground">{completionPct}%</p>
              <p className="text-xs text-muted-foreground">Completion</p>
            </CardContent>
          </Card>
        </div>

        {/* Add Goal */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex gap-2">
              <Input placeholder="e.g. Solve 5 medium problems" value={newGoal} onChange={e => setNewGoal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addGoal()} className="flex-1" />
              <Input type="number" min={1} max={100} value={newTarget} onChange={e => setNewTarget(Number(e.target.value))} className="w-20" />
              <Button onClick={() => addGoal()} size="sm" className="gap-1"><Plus className="h-3 w-3" /> Add</Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground" onClick={() => setShowPresets(!showPresets)}>
                <Sparkles className="h-3 w-3" /> {showPresets ? 'Hide' : 'Quick add presets'}
              </Button>
            </div>
            {showPresets && (
              <div className="flex flex-wrap gap-1.5">
                {PRESET_GOALS.map((p, i) => (
                  <Button key={i} variant="outline" size="sm" className="h-7 text-xs" onClick={() => addGoal(p.text, p.target, p.type)}>
                    {p.text}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goals List */}
        <div className="space-y-2">
          {goals.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">No goals set. Add your first weekly goal above!</p>
          ) : goals.map(g => {
            const progress = Math.min(100, Math.round((g.current / g.target) * 100));
            const isComplete = g.done || g.current >= g.target;
            return (
              <Card key={g.id} className={`transition-all ${isComplete ? 'border-primary/30 bg-primary/5' : ''}`}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleDone(g.id)} className="shrink-0">
                      {isComplete ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-sm font-medium truncate ${isComplete ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{g.text}</p>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <Badge variant="outline" className="text-[10px]">{g.current}/{g.target}</Badge>
                          {g.type === 'custom' && !isComplete && (
                            <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => incrementGoal(g.id)}>+1</Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeGoal(g.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WeeklyGoals;
