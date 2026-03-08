import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Clock, Zap, BarChart3, Activity, Target, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';

interface ExecutionRecord {
  id: string;
  problem_id: string;
  passed: boolean;
  execution_time_ms: number | null;
  code_snapshot: string;
  created_at: string;
  test_results: any;
}

interface ComplexityEntry {
  problemKey: string;
  date: string;
  executionTime: number;
  passed: boolean;
  codeLength: number;
  testsPassed: number;
  testsTotal: number;
}

const ComplexityTracker = () => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [execHistory, setExecHistory] = useState<ExecutionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d');
  const [selectedProblem, setSelectedProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!authUser) return;
    setLoading(true);
    supabase.from('execution_history').select('*').eq('user_id', authUser.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setExecHistory((data || []) as ExecutionRecord[]);
        setLoading(false);
      });
  }, [authUser]);

  const filteredHistory = useMemo(() => {
    let data = execHistory;
    if (timeRange !== 'all') {
      const days = timeRange === '7d' ? 7 : 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      data = data.filter(e => new Date(e.created_at) >= cutoff);
    }
    return data;
  }, [execHistory, timeRange]);

  const entries: ComplexityEntry[] = useMemo(() => {
    return filteredHistory.map(e => {
      const tests = Array.isArray(e.test_results) ? e.test_results : [];
      return {
        problemKey: e.problem_id,
        date: e.created_at.split('T')[0],
        executionTime: e.execution_time_ms || 0,
        passed: e.passed,
        codeLength: e.code_snapshot.length,
        testsPassed: tests.filter((t: any) => t.status === 'PASSED').length,
        testsTotal: tests.length,
      };
    });
  }, [filteredHistory]);

  // Problem-wise stats
  const problemStats = useMemo(() => {
    const map = new Map<string, ComplexityEntry[]>();
    entries.forEach(e => {
      if (!map.has(e.problemKey)) map.set(e.problemKey, []);
      map.get(e.problemKey)!.push(e);
    });
    return Array.from(map.entries()).map(([key, runs]) => {
      const times = runs.map(r => r.executionTime).filter(t => t > 0);
      const codeLengths = runs.map(r => r.codeLength);
      const firstRun = runs[0];
      const lastRun = runs[runs.length - 1];
      const improvement = firstRun && lastRun && firstRun.executionTime > 0
        ? ((firstRun.executionTime - lastRun.executionTime) / firstRun.executionTime * 100)
        : 0;
      return {
        key,
        runs: runs.length,
        avgTime: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
        bestTime: times.length > 0 ? Math.min(...times) : 0,
        worstTime: times.length > 0 ? Math.max(...times) : 0,
        improvement,
        firstCodeLength: codeLengths[0] || 0,
        lastCodeLength: codeLengths[codeLengths.length - 1] || 0,
        passRate: runs.filter(r => r.passed).length / runs.length * 100,
        lastPassed: lastRun?.passed || false,
      };
    }).sort((a, b) => b.runs - a.runs);
  }, [entries]);

  // Overall trends
  const overallStats = useMemo(() => {
    const totalRuns = entries.length;
    const passedRuns = entries.filter(e => e.passed).length;
    const avgTime = entries.length > 0
      ? entries.filter(e => e.executionTime > 0).reduce((a, b) => a + b.executionTime, 0) / entries.filter(e => e.executionTime > 0).length
      : 0;
    const uniqueProblems = new Set(entries.map(e => e.problemKey)).size;
    const avgCodeLength = entries.length > 0
      ? entries.reduce((a, b) => a + b.codeLength, 0) / entries.length
      : 0;

    // Daily execution trend
    const byDate = new Map<string, { runs: number; passed: number; avgTime: number }>();
    entries.forEach(e => {
      if (!byDate.has(e.date)) byDate.set(e.date, { runs: 0, passed: 0, avgTime: 0 });
      const d = byDate.get(e.date)!;
      d.runs++;
      if (e.passed) d.passed++;
      d.avgTime = (d.avgTime * (d.runs - 1) + e.executionTime) / d.runs;
    });

    return { totalRuns, passedRuns, avgTime, uniqueProblems, avgCodeLength, dailyTrend: Array.from(byDate.entries()).map(([date, stats]) => ({ date, ...stats })) };
  }, [entries]);

  const selectedProblemRuns = selectedProblem
    ? entries.filter(e => e.problemKey === selectedProblem)
    : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-panel-border bg-ide-toolbar px-4 py-2 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-7 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back
        </Button>
        <Activity className="h-4 w-4 text-primary" />
        <span className="font-bold text-foreground">Code Complexity Tracker</span>
        <div className="ml-auto">
          <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
            <SelectTrigger className="h-7 w-24 text-[10px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d" className="text-xs">7 Days</SelectItem>
              <SelectItem value="30d" className="text-xs">30 Days</SelectItem>
              <SelectItem value="all" className="text-xs">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-4">
        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Analyzing your execution history...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No execution data yet. Run some code to track your progress!</p>
            <Button variant="outline" className="mt-3" onClick={() => navigate('/modules')}>Start Solving</Button>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card className="bg-card border-panel-border">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{overallStats.totalRuns}</p>
                  <p className="text-[10px] text-muted-foreground">Total Runs</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-panel-border">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-500">
                    {overallStats.totalRuns > 0 ? (overallStats.passedRuns / overallStats.totalRuns * 100).toFixed(0) : 0}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">Pass Rate</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-panel-border">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{overallStats.avgTime.toFixed(0)}<span className="text-xs">ms</span></p>
                  <p className="text-[10px] text-muted-foreground">Avg Exec Time</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-panel-border">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{overallStats.uniqueProblems}</p>
                  <p className="text-[10px] text-muted-foreground">Problems Tried</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-panel-border">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-amber-500">{(overallStats.avgCodeLength / 1000).toFixed(1)}<span className="text-xs">KB</span></p>
                  <p className="text-[10px] text-muted-foreground">Avg Code Size</p>
                </CardContent>
              </Card>
            </div>

            {/* Daily Trend */}
            <Card className="bg-card border-panel-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Execution Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1 h-24">
                  {overallStats.dailyTrend.slice(-30).map((day, i) => {
                    const maxRuns = Math.max(...overallStats.dailyTrend.map(d => d.runs), 1);
                    const height = Math.max((day.runs / maxRuns) * 100, 3);
                    const passPercent = day.runs > 0 ? day.passed / day.runs : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center" title={`${day.date}: ${day.runs} runs, ${day.passed} passed`}>
                        <div
                          className={`w-full rounded-t-sm ${passPercent > 0.7 ? 'bg-emerald-500/60' : passPercent > 0.3 ? 'bg-amber-500/60' : 'bg-destructive/40'}`}
                          style={{ height: `${height}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between mt-1 text-[9px] text-muted-foreground">
                  <span>{overallStats.dailyTrend[0]?.date || ''}</span>
                  <div className="flex gap-3">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500/60" /> &gt;70% pass</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-500/60" /> 30-70%</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-destructive/40" /> &lt;30%</span>
                  </div>
                  <span>{overallStats.dailyTrend[overallStats.dailyTrend.length - 1]?.date || ''}</span>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Problem Performance Table */}
              <Card className="bg-card border-panel-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" /> Problem Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-1.5 pr-2">
                      {problemStats.map(ps => (
                        <button
                          key={ps.key}
                          onClick={() => setSelectedProblem(selectedProblem === ps.key ? null : ps.key)}
                          className={`w-full text-left rounded-lg border p-2.5 transition-all hover:bg-secondary/30 ${
                            selectedProblem === ps.key ? 'border-primary bg-primary/5' : 'border-panel-border'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-foreground truncate max-w-[180px]">{ps.key}</span>
                            <div className="flex items-center gap-2">
                              {ps.lastPassed ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Clock className="h-3 w-3 text-amber-500" />}
                              <Badge variant="outline" className="text-[9px]">{ps.runs} runs</Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                            <span>Avg: {ps.avgTime.toFixed(0)}ms</span>
                            <span>Best: {ps.bestTime.toFixed(0)}ms</span>
                            <span>Pass: {ps.passRate.toFixed(0)}%</span>
                            {ps.improvement > 0 && (
                              <span className="text-emerald-500 flex items-center gap-0.5">
                                <TrendingUp className="h-2.5 w-2.5" /> {ps.improvement.toFixed(0)}% faster
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Run Detail / Improvement Chart */}
              <Card className="bg-card border-panel-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    {selectedProblem ? `Runs: ${selectedProblem}` : 'Select a problem to see runs'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedProblemRuns.length > 0 ? (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2 pr-2">
                        {/* Mini chart */}
                        <div className="flex items-end gap-1 h-16 mb-3 border-b border-panel-border pb-2">
                          {selectedProblemRuns.map((run, i) => {
                            const maxTime = Math.max(...selectedProblemRuns.map(r => r.executionTime), 1);
                            const height = Math.max((run.executionTime / maxTime) * 100, 5);
                            return (
                              <div
                                key={i}
                                className={`flex-1 rounded-t-sm ${run.passed ? 'bg-emerald-500/60' : 'bg-destructive/40'}`}
                                style={{ height: `${height}%` }}
                                title={`${run.executionTime}ms - ${run.passed ? 'Passed' : 'Failed'}`}
                              />
                            );
                          })}
                        </div>

                        {selectedProblemRuns.map((run, i) => (
                          <div key={i} className={`rounded-lg border p-2 text-xs ${run.passed ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-panel-border'}`}>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Run #{i + 1}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant={run.passed ? 'default' : 'destructive'} className="text-[9px]">
                                  {run.passed ? 'PASS' : 'FAIL'}
                                </Badge>
                                <span className="font-mono text-foreground">{run.executionTime}ms</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                              <span>{run.date}</span>
                              <span>{(run.codeLength / 1000).toFixed(1)}KB</span>
                              <span>{run.testsPassed}/{run.testsTotal} tests</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="h-[400px] flex items-center justify-center text-xs text-muted-foreground">
                      <div className="text-center">
                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p>Click a problem to see execution details</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ComplexityTracker;
