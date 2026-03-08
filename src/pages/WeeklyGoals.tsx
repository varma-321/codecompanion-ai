import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react';
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

const WeeklyGoals = () => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoal, setNewGoal] = useState('');
  const [newTarget, setNewTarget] = useState(5);
  const [stats, setStats] = useState({ solvedThisWeek: 0, minutesThisWeek: 0, streakDays: 0 });

  useEffect(() => {
    // Load goals from localStorage
    const saved = localStorage.getItem(`weekly-goals-${authUser?.id}`);
    if (saved) {
      try { setGoals(JSON.parse(saved)); } catch {}
    }

    // Load weekly stats
    if (!authUser) return;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    supabase.from('user_problem_progress').select('*').eq('user_id', authUser.id)
      .gte('last_attempted', weekAgo.toISOString())
      .then(({ data }) => {
        const solved = (data || []).filter((p: any) => p.solved).length;
        setStats(prev => ({ ...prev, solvedThisWeek: solved }));
        // Auto-update problems goals
        setGoals(prev => prev.map(g => g.type === 'problems' ? { ...g, current: solved } : g));
      });
  }, [authUser]);

  useEffect(() => {
    if (authUser) localStorage.setItem(`weekly-goals-${authUser.id}`, JSON.stringify(goals));
  }, [goals, authUser]);

  const addGoal = () => {
    if (!newGoal.trim()) return;
    setGoals(prev => [...prev, {
      id: Date.now().toString(),
      text: newGoal,
      target: newTarget,
      current: 0,
      type: newGoal.toLowerCase().includes('problem') ? 'problems' : newGoal.toLowerCase().includes('minute') ? 'minutes' : 'custom',
      done: false,
    }]);
    setNewGoal('');
    setNewTarget(5);
  };

  const toggleDone = (id: string) => setGoals(prev => prev.map(g => g.id === id ? { ...g, done: !g.done } : g));
  const removeGoal = (id: string) => setGoals(prev => prev.filter(g => g.id !== id));
  const incrementGoal = (id: string) => setGoals(prev => prev.map(g => g.id === id ? { ...g, current: Math.min(g.current + 1, g.target) } : g));

  const completedCount = goals.filter(g => g.done || g.current >= g.target).length;

  if (!authUser) return <div className="flex h-screen items-center justify-center bg-background"><p className="text-foreground">Please log in</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-panel-border bg-ide-toolbar px-4 py-2 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-7 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back
        </Button>
        <Target className="h-4 w-4 text-primary" />
        <span className="font-bold text-foreground">Weekly Goals</span>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Weekly Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.solvedThisWeek}</p>
            <p className="text-xs text-muted-foreground">Solved this week</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-foreground">{completedCount}/{goals.length}</p>
            <p className="text-xs text-muted-foreground">Goals completed</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-foreground">{goals.length > 0 ? Math.round((completedCount / goals.length) * 100) : 0}%</p>
            <p className="text-xs text-muted-foreground">Completion rate</p>
          </CardContent></Card>
        </div>

        {/* Add Goal */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <Input placeholder="e.g. Solve 5 medium problems" value={newGoal} onChange={e => setNewGoal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addGoal()} className="flex-1" />
              <Input type="number" min={1} max={100} value={newTarget} onChange={e => setNewTarget(Number(e.target.value))} className="w-20" />
              <Button onClick={addGoal} size="sm" className="gap-1"><Plus className="h-3 w-3" /> Add</Button>
            </div>
          </CardContent>
        </Card>

        {/* Goals List */}
        <div className="space-y-3">
          {goals.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">No goals set. Add your first weekly goal above!</p>
          ) : goals.map(g => {
            const progress = Math.min(100, Math.round((g.current / g.target) * 100));
            const isComplete = g.done || g.current >= g.target;
            return (
              <Card key={g.id} className={`transition-all ${isComplete ? 'border-primary/30 bg-primary/5' : ''}`}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleDone(g.id)} className="shrink-0">
                      {isComplete ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-sm font-medium ${isComplete ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{g.text}</p>
                        <div className="flex items-center gap-2">
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
