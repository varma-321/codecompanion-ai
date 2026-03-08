import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Target, Calendar, Flame, CheckCircle2, Circle, Plus, Trash2,
  TrendingUp, Clock, Award, BarChart3, Sparkles, Sun, Moon, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';

interface DailyGoal {
  id: string;
  text: string;
  target: number;
  current: number;
  type: 'problems' | 'minutes' | 'easy' | 'medium' | 'hard' | 'revision' | 'custom';
  done: boolean;
}

interface DayLog {
  date: string;
  solved: number;
  minutes: number;
  topics: string[];
}

const PRESET_DAILY = [
  { text: 'Solve 3 problems', target: 3, type: 'problems' as const },
  { text: 'Solve 5 problems', target: 5, type: 'problems' as const },
  { text: 'Solve 2 Easy problems', target: 2, type: 'easy' as const },
  { text: 'Solve 2 Medium problems', target: 2, type: 'medium' as const },
  { text: 'Solve 1 Hard problem', target: 1, type: 'hard' as const },
  { text: 'Revise 5 problems', target: 5, type: 'revision' as const },
  { text: 'Study for 60 minutes', target: 60, type: 'minutes' as const },
];

const getDateKey = () => new Date().toISOString().split('T')[0];
const getWeekKey = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil((((now.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${week}`;
};

const StudyPlanner = () => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>([]);
  const [newGoalText, setNewGoalText] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState(3);
  const [showPresets, setShowPresets] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [weekHistory, setWeekHistory] = useState<DayLog[]>([]);
  const [todayStats, setTodayStats] = useState({ solved: 0, easy: 0, medium: 0, hard: 0, minutes: 0 });

  // Load daily goals from localStorage (reset daily)
  useEffect(() => {
    const storageKey = `daily-planner-${authUser?.id}-${getDateKey()}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try { setDailyGoals(JSON.parse(saved)); } catch {}
    }
  }, [authUser?.id]);

  // Save goals on change
  useEffect(() => {
    if (!authUser) return;
    const storageKey = `daily-planner-${authUser.id}-${getDateKey()}`;
    localStorage.setItem(storageKey, JSON.stringify(dailyGoals));
  }, [dailyGoals, authUser]);

  // Load stats from DB
  useEffect(() => {
    if (!authUser) return;
    const today = getDateKey();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const loadStats = async () => {
      const { data: progress } = await supabase
        .from('user_problem_progress')
        .select('*')
        .eq('user_id', authUser.id);
      const allProgress = (progress || []) as any[];

      // Today stats
      const todaySolved = allProgress.filter(p => p.solved && p.solved_at?.startsWith(today));
      const easy = todaySolved.filter(p => p.problem_key).length; // simplified
      setTodayStats({
        solved: todaySolved.length,
        easy: 0, medium: 0, hard: 0,
        minutes: todaySolved.length * 15, // estimate
      });

      // Update goal progress
      setDailyGoals(prev => prev.map(g => {
        if (g.type === 'problems') return { ...g, current: todaySolved.length, done: todaySolved.length >= g.target };
        return g;
      }));

      // Calculate streak
      const solvedDates = new Set(allProgress.filter(p => p.solved && p.solved_at).map(p => p.solved_at.split('T')[0]));
      let s = 0;
      let best = 0;
      let d = new Date();
      while (solvedDates.has(d.toISOString().split('T')[0])) {
        s++;
        d.setDate(d.getDate() - 1);
      }
      // If today has no solves but yesterday does, check yesterday streak
      if (s === 0) {
        d = new Date();
        d.setDate(d.getDate() - 1);
        while (solvedDates.has(d.toISOString().split('T')[0])) {
          s++;
          d.setDate(d.getDate() - 1);
        }
      }
      setStreak(s);

      // Week history
      const days: DayLog[] = [];
      for (let i = 6; i >= 0; i--) {
        const dt = new Date();
        dt.setDate(dt.getDate() - i);
        const dateStr = dt.toISOString().split('T')[0];
        const daySolved = allProgress.filter(p => p.solved && p.solved_at?.startsWith(dateStr));
        days.push({ date: dateStr, solved: daySolved.length, minutes: daySolved.length * 15, topics: [] });
      }
      setWeekHistory(days);

      // Best streak
      const sortedDates = Array.from(solvedDates).sort();
      let cs = 1; best = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const prev = new Date(sortedDates[i - 1]);
        const curr = new Date(sortedDates[i]);
        const diff = (curr.getTime() - prev.getTime()) / 86400000;
        if (diff === 1) { cs++; best = Math.max(best, cs); }
        else cs = 1;
      }
      setBestStreak(best || s);
    };
    loadStats();
  }, [authUser]);

  const addGoal = (text?: string, target?: number, type?: DailyGoal['type']) => {
    const goalText = text || newGoalText;
    const goalTarget = target || newGoalTarget;
    if (!goalText.trim()) return;
    setDailyGoals(prev => [...prev, {
      id: Date.now().toString(),
      text: goalText,
      target: goalTarget,
      current: 0,
      type: type || 'custom',
      done: false,
    }]);
    setNewGoalText('');
    setShowPresets(false);
  };

  const toggleGoal = (id: string) => {
    setDailyGoals(prev => prev.map(g => g.id === id ? { ...g, done: !g.done } : g));
  };

  const removeGoal = (id: string) => {
    setDailyGoals(prev => prev.filter(g => g.id !== id));
  };

  const completionRate = dailyGoals.length > 0
    ? Math.round((dailyGoals.filter(g => g.done).length / dailyGoals.length) * 100)
    : 0;

  const maxWeekSolves = Math.max(...weekHistory.map(d => d.solved), 1);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-panel-border bg-ide-toolbar px-4 py-2 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-7 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back
        </Button>
        <Calendar className="h-4 w-4 text-primary" />
        <span className="font-bold text-foreground">Study Planner</span>
        <Badge variant="outline" className="text-[10px]">{getDateKey()}</Badge>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-4">
        {/* Top Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-card border-panel-border">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Flame className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{streak}</p>
                <p className="text-[10px] text-muted-foreground">Day Streak</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-panel-border">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{todayStats.solved}</p>
                <p className="text-[10px] text-muted-foreground">Solved Today</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-panel-border">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Award className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{bestStreak}</p>
                <p className="text-[10px] text-muted-foreground">Best Streak</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-panel-border">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{completionRate}%</p>
                <p className="text-[10px] text-muted-foreground">Goals Done</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Daily Goals */}
          <div className="lg:col-span-2 space-y-3">
            <Card className="bg-card border-panel-border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" /> Today's Goals
                  </CardTitle>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowPresets(!showPresets)}>
                    <Sparkles className="h-3 w-3 mr-1" /> Quick Add
                  </Button>
                </div>
                {dailyGoals.length > 0 && (
                  <Progress value={completionRate} className="h-1.5 mt-2" />
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {showPresets && (
                  <div className="flex flex-wrap gap-1.5 pb-2 border-b border-panel-border">
                    {PRESET_DAILY.map((p, i) => (
                      <Button key={i} size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => addGoal(p.text, p.target, p.type)}>
                        + {p.text}
                      </Button>
                    ))}
                  </div>
                )}

                {dailyGoals.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <Target className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No goals set for today</p>
                    <p className="text-xs mt-1">Add goals to track your daily progress!</p>
                  </div>
                )}

                {dailyGoals.map(goal => (
                  <div key={goal.id} className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${goal.done ? 'bg-emerald-500/5 border-emerald-500/20' : 'border-panel-border bg-secondary/20'}`}>
                    <button onClick={() => toggleGoal(goal.id)} className="shrink-0">
                      {goal.done
                        ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        : <Circle className="h-5 w-5 text-muted-foreground" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${goal.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{goal.text}</p>
                      {goal.type !== 'custom' && (
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={Math.min((goal.current / goal.target) * 100, 100)} className="h-1 flex-1" />
                          <span className="text-[10px] text-muted-foreground">{goal.current}/{goal.target}</span>
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[9px] shrink-0">{goal.type}</Badge>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => removeGoal(goal.id)}>
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                ))}

                <div className="flex gap-2 pt-2">
                  <Input
                    value={newGoalText}
                    onChange={e => setNewGoalText(e.target.value)}
                    placeholder="Add a custom goal..."
                    className="h-8 text-xs"
                    onKeyDown={e => e.key === 'Enter' && addGoal()}
                  />
                  <Input
                    type="number"
                    value={newGoalTarget}
                    onChange={e => setNewGoalTarget(+e.target.value)}
                    className="h-8 w-16 text-xs"
                    min={1}
                  />
                  <Button size="sm" className="h-8" onClick={() => addGoal()}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Week Activity Chart */}
            <Card className="bg-card border-panel-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 h-32">
                  {weekHistory.map((day, i) => {
                    const height = Math.max((day.solved / maxWeekSolves) * 100, 4);
                    const isToday = day.date === getDateKey();
                    const dayOfWeek = dayNames[new Date(day.date).getDay()];
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[9px] text-muted-foreground font-mono">{day.solved}</span>
                        <div
                          className={`w-full rounded-t-sm transition-all ${isToday ? 'bg-primary' : 'bg-primary/30'}`}
                          style={{ height: `${height}%` }}
                        />
                        <span className={`text-[9px] font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                          {dayOfWeek}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                  <span>Total: {weekHistory.reduce((a, b) => a + b.solved, 0)} problems</span>
                  <span>Avg: {(weekHistory.reduce((a, b) => a + b.solved, 0) / 7).toFixed(1)}/day</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar: Schedule & Motivation */}
          <div className="space-y-3">
            <Card className="bg-card border-panel-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" /> Streak Calendar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 28 }, (_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - 27 + i);
                    const dateStr = d.toISOString().split('T')[0];
                    const day = weekHistory.find(w => w.date === dateStr);
                    const hasSolves = day ? day.solved > 0 : false;
                    const isToday = dateStr === getDateKey();
                    return (
                      <div
                        key={i}
                        title={`${dateStr}: ${day?.solved || 0} solved`}
                        className={`h-5 w-full rounded-sm border transition-colors ${
                          isToday
                            ? 'border-primary ring-1 ring-primary/30'
                            : 'border-transparent'
                        } ${
                          hasSolves
                            ? 'bg-emerald-500/60'
                            : 'bg-secondary/40'
                        }`}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                  <span>4 weeks ago</span>
                  <span>Today</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-panel-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" /> Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full h-9 text-xs justify-start" onClick={() => navigate('/striver')}>
                  📚 Continue Striver Sheet
                </Button>
                <Button variant="outline" className="w-full h-9 text-xs justify-start" onClick={() => navigate('/spaced-repetition')}>
                  🔄 Review Due Problems
                </Button>
                <Button variant="outline" className="w-full h-9 text-xs justify-start" onClick={() => navigate('/contest')}>
                  ⏱️ Start Contest Mode
                </Button>
                <Button variant="outline" className="w-full h-9 text-xs justify-start" onClick={() => navigate('/interview')}>
                  💼 Mock Interview
                </Button>
                <Button variant="outline" className="w-full h-9 text-xs justify-start" onClick={() => navigate('/pomodoro')}>
                  🍅 Pomodoro Timer
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card border-panel-border bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-4 text-center">
                <p className="text-2xl mb-1">💪</p>
                <p className="text-sm font-semibold text-foreground">
                  {streak > 0
                    ? `${streak} day streak! Keep going!`
                    : "Start your streak today!"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Consistency beats intensity. Solve at least 1 problem daily.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyPlanner;
