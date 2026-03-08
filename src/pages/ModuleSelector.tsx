import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, Map, Code2, BookOpen, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';
import { STRIVER_ROADMAP, getTotalProblems } from '@/lib/striver-roadmap-data';
import { NEETCODE_ROADMAP, getNeetcodeTotalProblems } from '@/lib/neetcode-roadmap-data';
import { LEETCODE_TOP150_ROADMAP, getLeetcodeTop150TotalProblems } from '@/lib/leetcode-top150-data';

interface ModuleInfo {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  route: string;
  total: number;
  color: string;
  keys: string[];
}

const ModuleSelector = () => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [solvedCounts, setSolvedCounts] = useState<Record<string, number>>({});

  const modules: ModuleInfo[] = useMemo(() => [
    {
      id: 'striver',
      title: 'Striver SDE Sheet',
      subtitle: '454 curated problems by Raj Vikramaditya',
      icon: <Map className="h-6 w-6" />,
      route: '/striver',
      total: getTotalProblems(),
      color: 'hsl(var(--primary))',
      keys: STRIVER_ROADMAP.flatMap(t => t.problems.map(p => p.key)),
    },
    {
      id: 'neetcode',
      title: 'NeetCode 150',
      subtitle: '150 essential problems for coding interviews',
      icon: <Code2 className="h-6 w-6" />,
      route: '/neetcode',
      total: getNeetcodeTotalProblems(),
      color: 'hsl(150, 70%, 45%)',
      keys: NEETCODE_ROADMAP.flatMap(t => t.problems.map(p => p.key)),
    },
    {
      id: 'leetcode150',
      title: 'LeetCode Top Interview 150',
      subtitle: '150 must-do problems from LeetCode',
      icon: <BookOpen className="h-6 w-6" />,
      route: '/leetcode150',
      total: getLeetcodeTop150TotalProblems(),
      color: 'hsl(30, 80%, 55%)',
      keys: LEETCODE_TOP150_ROADMAP.flatMap(t => t.problems.map(p => p.key)),
    },
  ], []);

  useEffect(() => {
    if (!authUser) return;
    const load = async () => {
      const { data } = await supabase
        .from('user_problem_progress')
        .select('problem_key, solved')
        .eq('user_id', authUser.id)
        .eq('solved', true);

      const solvedKeys = new Set((data || []).map((d: any) => d.problem_key));
      const counts: Record<string, number> = {};
      for (const mod of modules) {
        counts[mod.id] = mod.keys.filter(k => solvedKeys.has(k)).length;
      }
      setSolvedCounts(counts);
    };
    load();
  }, [authUser, modules]);

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-panel-border bg-ide-toolbar px-4 py-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="h-7 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back to IDE
        </Button>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold">Problem Modules</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Choose a Module</h1>
            <p className="text-sm text-muted-foreground mt-1">Pick a curated problem set and start practicing</p>
          </div>

          <div className="grid gap-4">
            {modules.map(mod => {
              const solved = solvedCounts[mod.id] || 0;
              const pct = mod.total > 0 ? (solved / mod.total) * 100 : 0;

              return (
                <Card
                  key={mod.id}
                  className="cursor-pointer transition-all hover:border-primary/40 hover:shadow-md"
                  onClick={() => navigate(mod.route)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {mod.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-foreground">{mod.title}</span>
                          <Badge variant="secondary" className="text-[10px]">{mod.total} problems</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{mod.subtitle}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <Progress value={pct} className="h-1.5 flex-1" />
                          <span className="text-xs font-mono text-muted-foreground">{solved}/{mod.total}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleSelector;
