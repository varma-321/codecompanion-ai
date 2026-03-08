import { useState, useEffect } from 'react';
import { Flame, Trophy, Star, Target, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';

interface DayActivity {
  date: string;
  count: number;
}

const StreakPanel = () => {
  const { authUser } = useUser();
  const [streak, setStreak] = useState(0);
  const [totalSolved, setTotalSolved] = useState(0);
  const [weekActivity, setWeekActivity] = useState<DayActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUser) return;
    const load = async () => {
      setLoading(true);
      const { data: problems } = await supabase
        .from('problems')
        .select('created_at, solved, updated_at')
        .eq('user_id', authUser.id)
        .eq('solved', true)
        .order('updated_at', { ascending: false });

      const solved = problems || [];
      setTotalSolved(solved.length);

      // Calculate streak
      const days = new Set(solved.map(p => new Date(p.updated_at).toISOString().slice(0, 10)));
      let currentStreak = 0;
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        if (days.has(key)) {
          currentStreak++;
        } else if (i > 0) {
          break;
        }
      }
      setStreak(currentStreak);

      // Week activity
      const week: DayActivity[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const count = solved.filter(p => new Date(p.updated_at).toISOString().slice(0, 10) === key).length;
        week.push({ date: key, count });
      }
      setWeekActivity(week);
      setLoading(false);
    };
    load();
  }, [authUser]);

  const badges = [
    { name: 'First Solve', icon: Star, earned: totalSolved >= 1 },
    { name: '10 Problems', icon: Target, earned: totalSolved >= 10 },
    { name: '3-Day Streak', icon: Flame, earned: streak >= 3 },
    { name: '7-Day Streak', icon: Trophy, earned: streak >= 7 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const maxCount = Math.max(1, ...weekActivity.map(d => d.count));

  return (
    <div className="space-y-4 p-3">
      {/* Streak header */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Flame className={`h-6 w-6 ${streak > 0 ? 'text-warning' : 'text-muted-foreground'}`} />
          <div>
            <div className="text-2xl font-bold text-foreground">{streak}</div>
            <div className="text-[10px] text-muted-foreground">day streak</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <div>
            <div className="text-lg font-bold text-foreground">{totalSolved}</div>
            <div className="text-[10px] text-muted-foreground">solved</div>
          </div>
        </div>
      </div>

      {/* Week activity chart */}
      <div>
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">This Week</div>
        <div className="flex items-end gap-1.5">
          {weekActivity.map((day, i) => (
            <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`w-full rounded-sm transition-all ${day.count > 0 ? 'bg-primary' : 'bg-secondary'}`}
                style={{ height: `${Math.max(4, (day.count / maxCount) * 48)}px` }}
              />
              <span className="text-[9px] text-muted-foreground">
                {dayNames[new Date(day.date).getDay()]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Badges */}
      <div>
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Badges</div>
        <div className="flex flex-wrap gap-1.5">
          {badges.map(b => (
            <Badge
              key={b.name}
              variant={b.earned ? 'default' : 'secondary'}
              className={`gap-1 text-[10px] ${b.earned ? '' : 'opacity-40'}`}
            >
              <b.icon className="h-3 w-3" />
              {b.name}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StreakPanel;
