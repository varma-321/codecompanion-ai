import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileSpreadsheet, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';
import { STRIVER_ROADMAP } from '@/lib/striver-roadmap-data';
import { NEETCODE_ROADMAP } from '@/lib/neetcode-roadmap-data';
import { LEETCODE_TOP150_ROADMAP } from '@/lib/leetcode-top150-data';

const ALL_PROBLEMS = [...STRIVER_ROADMAP, ...NEETCODE_ROADMAP, ...LEETCODE_TOP150_ROADMAP].flatMap(t => t.problems);
const PROBLEM_MAP = new Map(ALL_PROBLEMS.map(p => [p.key, p]));

const ProgressExport = () => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUser) return;
    supabase.from('user_problem_progress').select('*').eq('user_id', authUser.id)
      .then(({ data }) => { setProgress(data || []); setLoading(false); });
  }, [authUser]);

  const solved = progress.filter(p => p.solved);
  const attempted = progress.filter(p => p.attempts > 0);
  const totalAttempts = progress.reduce((s, p) => s + (p.attempts || 0), 0);

  const byDifficulty = { Easy: 0, Medium: 0, Hard: 0 };
  solved.forEach(p => {
    const prob = PROBLEM_MAP.get(p.problem_key);
    if (prob) byDifficulty[prob.difficulty as keyof typeof byDifficulty]++;
  });

  const handleExportCSV = () => {
    const headers = ['Problem', 'Difficulty', 'Status', 'Attempts', 'Last Attempted', 'Solved At'];
    const rows = progress.map(p => {
      const prob = PROBLEM_MAP.get(p.problem_key);
      return [
        prob?.title || p.problem_key,
        prob?.difficulty || '',
        p.solved ? 'Solved' : p.attempts > 0 ? 'Attempted' : 'Not Started',
        p.attempts,
        p.last_attempted || '',
        p.solved_at || '',
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dsa-progress-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const data = progress.map(p => {
      const prob = PROBLEM_MAP.get(p.problem_key);
      return { problem: prob?.title || p.problem_key, difficulty: prob?.difficulty, status: p.status, attempts: p.attempts, solved: p.solved, solvedAt: p.solved_at, lastAttempted: p.last_attempted };
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dsa-progress-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!authUser) return <div className="flex h-screen items-center justify-center bg-background"><p className="text-foreground">Please log in</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-panel-border bg-ide-toolbar px-4 py-2 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-7 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back
        </Button>
        <FileSpreadsheet className="h-4 w-4 text-primary" />
        <span className="font-bold text-foreground">Progress & Export</span>
      </div>

      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {loading ? (
          <p className="text-muted-foreground text-center py-10">Loading progress...</p>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-foreground">{solved.length}</p>
                <p className="text-xs text-muted-foreground">Solved</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-foreground">{attempted.length}</p>
                <p className="text-xs text-muted-foreground">Attempted</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-foreground">{totalAttempts}</p>
                <p className="text-xs text-muted-foreground">Total Runs</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-foreground">{ALL_PROBLEMS.length}</p>
                <p className="text-xs text-muted-foreground">Total Problems</p>
              </CardContent></Card>
            </div>

            {/* Overall Progress */}
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Overall Progress</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Completion</span>
                    <span className="text-foreground font-medium">{solved.length}/{ALL_PROBLEMS.length} ({Math.round((solved.length / ALL_PROBLEMS.length) * 100)}%)</span>
                  </div>
                  <Progress value={(solved.length / ALL_PROBLEMS.length) * 100} className="h-2" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {(['Easy', 'Medium', 'Hard'] as const).map(d => (
                    <div key={d} className="text-center">
                      <p className="text-lg font-bold text-foreground">{byDifficulty[d]}</p>
                      <p className="text-[10px] text-muted-foreground">{d}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Activity */}
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" /> Recent Activity</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {solved.sort((a, b) => new Date(b.solved_at || b.last_attempted).getTime() - new Date(a.solved_at || a.last_attempted).getTime()).slice(0, 20).map(p => {
                    const prob = PROBLEM_MAP.get(p.problem_key);
                    return (
                      <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-panel-border last:border-0">
                        <span className="text-foreground">{prob?.title || p.problem_key}</span>
                        <div className="flex items-center gap-2">
                          {prob && <Badge variant="outline" className="text-[9px]">{prob.difficulty}</Badge>}
                          <span className="text-muted-foreground">{new Date(p.solved_at || p.last_attempted).toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  })}
                  {solved.length === 0 && <p className="text-muted-foreground text-center py-4">No solved problems yet</p>}
                </div>
              </CardContent>
            </Card>

            {/* Export Buttons */}
            <div className="flex gap-3">
              <Button onClick={handleExportCSV} className="gap-2 flex-1">
                <Download className="h-4 w-4" /> Export as CSV
              </Button>
              <Button onClick={handleExportJSON} variant="outline" className="gap-2 flex-1">
                <Download className="h-4 w-4" /> Export as JSON
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProgressExport;
