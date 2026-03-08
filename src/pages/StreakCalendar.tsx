import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Flame, Calendar, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const StreakCalendar = () => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState<any[]>([]);

  useEffect(() => {
    if (!authUser) { setLoading(false); return; }
    supabase.from('user_problem_progress').select('problem_key, solved, last_attempted, solved_at')
      .eq('user_id', authUser.id).eq('solved', true)
      .then(({ data }) => { setProgressData(data || []); setLoading(false); });
  }, [authUser]);

  const { heatmap, currentStreak, longestStreak, totalDays, mostActive } = useMemo(() => {
    const map = new Map<string, number>();
    progressData.forEach(p => {
      const dateStr = p.solved_at || p.last_attempted;
      if (!dateStr) return;
      const day = new Date(dateStr).toISOString().split('T')[0];
      map.set(day, (map.get(day) || 0) + 1);
    });

    // Build 365-day heatmap
    const today = new Date();
    const heatmap: { date: string; count: number; dayOfWeek: number }[] = [];
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      heatmap.push({ date: key, count: map.get(key) || 0, dayOfWeek: d.getDay() });
    }

    // Streak calc
    let currentStreak = 0;
    for (let i = heatmap.length - 1; i >= 0; i--) {
      if (heatmap[i].count > 0) currentStreak++;
      else break;
    }
    // If today has 0, check if yesterday had activity (streak might not include today yet)
    if (currentStreak === 0 && heatmap.length >= 2 && heatmap[heatmap.length - 2].count > 0) {
      for (let i = heatmap.length - 2; i >= 0; i--) {
        if (heatmap[i].count > 0) currentStreak++;
        else break;
      }
    }

    let longestStreak = 0, tempStreak = 0;
    heatmap.forEach(d => {
      if (d.count > 0) { tempStreak++; longestStreak = Math.max(longestStreak, tempStreak); }
      else tempStreak = 0;
    });

    const totalDays = heatmap.filter(d => d.count > 0).length;
    const mostActive = Math.max(...heatmap.map(d => d.count), 0);

    return { heatmap, currentStreak, longestStreak, totalDays, mostActive };
  }, [progressData]);

  const getColor = (count: number) => {
    if (count === 0) return 'bg-muted';
    if (count === 1) return 'bg-primary/30';
    if (count <= 3) return 'bg-primary/50';
    if (count <= 5) return 'bg-primary/70';
    return 'bg-primary';
  };

  // Group heatmap by weeks (columns)
  const weeks = useMemo(() => {
    const w: typeof heatmap[] = [];
    let current: typeof heatmap = [];
    // Pad first week
    const firstDow = heatmap[0]?.dayOfWeek || 0;
    for (let i = 0; i < firstDow; i++) current.push({ date: '', count: 0, dayOfWeek: i });
    heatmap.forEach(d => {
      current.push(d);
      if (d.dayOfWeek === 6) { w.push(current); current = []; }
    });
    if (current.length > 0) w.push(current);
    return w;
  }, [heatmap]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-background"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex items-center gap-2 sm:gap-3 border-b border-border bg-card px-3 sm:px-5 py-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-8 gap-1.5 text-xs font-medium rounded-lg shrink-0">
          <ArrowLeft className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Modules</span>
        </Button>
        <div className="h-4 w-px bg-border" />
        <Calendar className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold tracking-tight">Activity Calendar</span>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {[
              { label: 'Current Streak', value: `${currentStreak}d`, icon: <Flame className="h-4 w-4" />, color: 'text-destructive' },
              { label: 'Longest Streak', value: `${longestStreak}d`, icon: <Trophy className="h-4 w-4" />, color: 'text-primary' },
              { label: 'Active Days', value: totalDays, icon: <Calendar className="h-4 w-4" />, color: 'text-foreground' },
              { label: 'Best Day', value: `${mostActive} solved`, icon: <Flame className="h-4 w-4" />, color: 'text-warning' },
            ].map(s => (
              <Card key={s.label} className="border-border">
                <CardContent className="p-3 sm:p-4 text-center">
                  <div className={`${s.color} mx-auto mb-1`}>{s.icon}</div>
                  <p className="text-xl font-bold tabular-nums text-foreground">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Heatmap */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Last 365 Days
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="overflow-x-auto">
                <div className="flex gap-[3px] min-w-[700px]">
                  {/* Day labels */}
                  <div className="flex flex-col gap-[3px] mr-1 shrink-0">
                    {DAYS.map((d, i) => (
                      <div key={d} className="h-[13px] flex items-center">
                        {i % 2 === 1 && <span className="text-[9px] text-muted-foreground w-6">{d}</span>}
                      </div>
                    ))}
                  </div>
                  {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-[3px]">
                      {week.map((day, di) => (
                        <Tooltip key={di}>
                          <TooltipTrigger asChild>
                            <div className={`w-[13px] h-[13px] rounded-[2px] ${day.date ? getColor(day.count) : 'bg-transparent'} transition-colors`} />
                          </TooltipTrigger>
                          {day.date && (
                            <TooltipContent className="text-xs">
                              <p className="font-medium">{day.count} problem{day.count !== 1 ? 's' : ''}</p>
                              <p className="text-muted-foreground">{day.date}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-1.5 mt-3 justify-end">
                <span className="text-[10px] text-muted-foreground">Less</span>
                {[0, 1, 2, 4, 6].map(n => (
                  <div key={n} className={`w-[13px] h-[13px] rounded-[2px] ${getColor(n)}`} />
                ))}
                <span className="text-[10px] text-muted-foreground">More</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StreakCalendar;
