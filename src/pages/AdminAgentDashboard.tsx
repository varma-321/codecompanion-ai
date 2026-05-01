import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Bot, Play, Square, Shuffle, CheckSquare, Square as EmptySquare, Loader2,
  CheckCircle2, XCircle, ChevronDown, ChevronRight, Filter, ArrowLeft, RotateCcw,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/lib/user-context';
import { STRIVER_ROADMAP } from '@/lib/striver-roadmap-data';
import { NEETCODE_ROADMAP } from '@/lib/neetcode-roadmap-data';
import { LEETCODE_TOP150_ROADMAP } from '@/lib/leetcode-top150-data';
import { runAgentBatch, type AgentQuestion, type AgentResult, type AgentPhase } from '@/lib/agent-runner';

interface FlatProblem {
  problem_key: string;
  title: string;
  difficulty: string;
  topic: string;
  module: 'Striver' | 'NeetCode' | 'LeetCode 150';
}

function flatten(): FlatProblem[] {
  const out: FlatProblem[] = [];
  for (const t of STRIVER_ROADMAP) for (const p of t.problems) {
    out.push({ problem_key: p.key, title: p.title, difficulty: p.difficulty, topic: t.name, module: 'Striver' });
  }
  for (const t of NEETCODE_ROADMAP) for (const p of t.problems) {
    out.push({ problem_key: p.key, title: p.title, difficulty: p.difficulty, topic: t.name, module: 'NeetCode' });
  }
  for (const t of LEETCODE_TOP150_ROADMAP) for (const p of t.problems) {
    out.push({ problem_key: p.key, title: p.title, difficulty: p.difficulty, topic: t.name, module: 'LeetCode 150' });
  }
  return out;
}

const PHASE_LABEL: Record<AgentPhase, string> = {
  queued: 'Queued',
  'fetching-tests': 'Loading tests',
  'generating-code': 'Writing code',
  running: 'Running',
  fixing: 'Fixing',
  passed: 'Passed',
  failed: 'Failed',
};

const PHASE_TONE: Record<AgentPhase, string> = {
  queued: 'bg-secondary text-muted-foreground',
  'fetching-tests': 'bg-secondary text-foreground',
  'generating-code': 'bg-secondary text-foreground',
  running: 'bg-secondary text-foreground',
  fixing: 'bg-secondary text-foreground',
  passed: 'bg-foreground text-background',
  failed: 'bg-destructive text-destructive-foreground',
};

const AdminAgentDashboard = () => {
  const navigate = useNavigate();
  const { authUser, isAdmin, loading: authLoading } = useUser();
  const allProblems = useMemo(() => flatten(), []);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [diffFilter, setDiffFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Record<string, AgentResult>>({});
  const [running, setRunning] = useState(false);
  const [concurrency, setConcurrency] = useState(5);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const stopRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!authUser || !isAdmin) navigate('/admin-login');
  }, [authUser, isAdmin, authLoading, navigate]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allProblems.filter((p) => {
      if (moduleFilter !== 'all' && p.module !== moduleFilter) return false;
      if (diffFilter !== 'all' && p.difficulty !== diffFilter) return false;
      if (q && !p.title.toLowerCase().includes(q) && !p.problem_key.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allProblems, search, moduleFilter, diffFilter]);

  const toggle = (key: string) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const selectAllVisible = () => {
    setSelected((s) => {
      const n = new Set(s);
      filtered.forEach((p) => n.add(p.problem_key));
      return n;
    });
  };

  const clearAll = () => setSelected(new Set());

  const randomSelect = () => {
    const n = Math.min(10, filtered.length);
    if (n === 0) return;
    const pool = [...filtered];
    const picked = new Set<string>();
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      picked.add(pool[idx].problem_key);
      pool.splice(idx, 1);
    }
    setSelected(picked);
    toast.success(`Randomly selected ${n} problems.`);
  };

  const runTest = async () => {
    if (selected.size === 0) { toast.error('Select at least one question.'); return; }
    setRunning(true);
    stopRef.current = false;

    // Initialize result rows
    const init: Record<string, AgentResult> = {};
    const queue: AgentQuestion[] = [];
    for (const p of allProblems) {
      if (!selected.has(p.problem_key)) continue;
      init[p.problem_key] = {
        problem_key: p.problem_key, title: p.title,
        phase: 'queued', attempt: 0, maxRetries: 5,
        passedCount: 0, totalCount: 0, finalCode: '', logs: [],
      };
      queue.push({
        problem_key: p.problem_key, title: p.title,
        difficulty: p.difficulty, topic: p.topic,
      });
    }
    setResults(init);

    await runAgentBatch(
      queue,
      concurrency,
      (state) => setResults((prev) => ({ ...prev, [state.problem_key]: state })),
      () => stopRef.current,
    );

    setRunning(false);
    const finalResults = Object.values(init);
    toast.success(`Run complete. Check results table.`);
  };

  const stop = () => { stopRef.current = true; toast.info('Stopping after current questions finish…'); };

  const resetResults = () => { setResults({}); setExpanded(new Set()); };

  const toggleExpand = (k: string) => {
    setExpanded((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  };

  const stats = useMemo(() => {
    const v = Object.values(results);
    return {
      total: v.length,
      passed: v.filter((r) => r.phase === 'passed').length,
      failed: v.filter((r) => r.phase === 'failed').length,
      running: v.filter((r) => !['passed', 'failed'].includes(r.phase)).length,
    };
  }, [results]);

  if (authLoading || !authUser || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <AppShell title="AI Testing Agent" subtitle={`${allProblems.length} problems · autonomous Java agent`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-in-up">
        {/* Header bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-foreground text-background flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold">Autonomous Agent</div>
                <div className="text-[11px] text-muted-foreground">Generates · Runs · Fixes · Retries</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {Object.keys(results).length > 0 && (
              <Button onClick={resetResults} variant="outline" size="sm" className="gap-1.5" disabled={running}>
                <RotateCcw className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
            {running ? (
              <Button onClick={stop} variant="destructive" size="sm" className="gap-1.5">
                <Square className="h-3.5 w-3.5" /> Stop
              </Button>
            ) : (
              <Button onClick={runTest} size="sm" className="gap-1.5" disabled={selected.size === 0}>
                <Play className="h-3.5 w-3.5" /> Run Test ({selected.size})
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        {Object.keys(results).length > 0 && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total', value: stats.total },
              { label: 'Passed', value: stats.passed },
              { label: 'Failed', value: stats.failed },
              { label: 'Running', value: stats.running },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-4">
                <div className="text-2xl font-semibold tabular-nums">{s.value}</div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              placeholder="Search problems by title or key…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 max-w-sm"
            />
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="all">All modules</option>
              <option value="Striver">Striver</option>
              <option value="NeetCode">NeetCode</option>
              <option value="LeetCode 150">LeetCode 150</option>
            </select>
            <select
              value={diffFilter}
              onChange={(e) => setDiffFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="all">All difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[11px] text-muted-foreground">Parallel:</span>
              <Input
                type="number"
                min={1}
                max={10}
                value={concurrency}
                onChange={(e) => setConcurrency(Math.max(1, Math.min(10, Number(e.target.value) || 5)))}
                className="h-9 w-16"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={selectAllVisible} variant="outline" size="sm" className="gap-1.5" disabled={running}>
              <CheckSquare className="h-3.5 w-3.5" /> Select All ({filtered.length})
            </Button>
            <Button onClick={clearAll} variant="outline" size="sm" className="gap-1.5" disabled={running}>
              <EmptySquare className="h-3.5 w-3.5" /> Clear
            </Button>
            <Button onClick={randomSelect} variant="outline" size="sm" className="gap-1.5" disabled={running}>
              <Shuffle className="h-3.5 w-3.5" /> Random 10
            </Button>
            <span className="text-[11px] text-muted-foreground ml-auto tabular-nums">
              {selected.size} selected · {filtered.length} visible
            </span>
          </div>
        </div>

        {/* Two column: problem list + results */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Problem list */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="text-sm font-medium">Problems</div>
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="max-h-[600px] overflow-y-auto divide-y divide-border">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No problems match your filters.</div>
              ) : filtered.slice(0, 500).map((p) => (
                <label
                  key={p.problem_key}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selected.has(p.problem_key)}
                    onCheckedChange={() => toggle(p.problem_key)}
                    disabled={running}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate">{p.title}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {p.module} · {p.topic} · {p.problem_key}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">{p.difficulty}</Badge>
                </label>
              ))}
              {filtered.length > 500 && (
                <div className="p-3 text-center text-[11px] text-muted-foreground">
                  Showing 500 of {filtered.length} — refine filters to narrow.
                </div>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="text-sm font-medium">Live Results</div>
              {running && <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground" />}
            </div>
            <div className="max-h-[600px] overflow-y-auto divide-y divide-border">
              {Object.keys(results).length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No runs yet. Select problems and click Run Test.
                </div>
              ) : Object.values(results).map((r) => {
                const isOpen = expanded.has(r.problem_key);
                const elapsed = r.startedAt ? ((r.finishedAt || Date.now()) - r.startedAt) / 1000 : 0;
                return (
                  <div key={r.problem_key} className="text-[13px]">
                    <button
                      onClick={() => toggleExpand(r.problem_key)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-secondary/50 text-left"
                    >
                      {isOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{r.title}</div>
                        <div className="text-[11px] text-muted-foreground tabular-nums">
                          attempt {r.attempt}/{r.maxRetries} · {r.passedCount}/{r.totalCount} tests · {elapsed.toFixed(1)}s
                        </div>
                      </div>
                      {r.phase === 'passed' && <CheckCircle2 className="h-4 w-4 text-foreground shrink-0" />}
                      {r.phase === 'failed' && <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                      {!['passed', 'failed'].includes(r.phase) && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-medium shrink-0 ${PHASE_TONE[r.phase]}`}>
                        {PHASE_LABEL[r.phase]}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-3 space-y-2 bg-secondary/30">
                        <div className="rounded-md border border-border bg-background max-h-48 overflow-y-auto">
                          <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                            Logs
                          </div>
                          <div className="divide-y divide-border font-mono text-[11px]">
                            {r.logs.length === 0 ? (
                              <div className="p-3 text-muted-foreground">No logs yet…</div>
                            ) : r.logs.map((l, i) => (
                              <div key={i} className="px-3 py-1.5 flex gap-2">
                                <span className="text-muted-foreground tabular-nums shrink-0">
                                  {new Date(l.ts).toLocaleTimeString('en-US', { hour12: false })}
                                </span>
                                <span className={
                                  l.level === 'error' ? 'text-destructive'
                                  : l.level === 'warn' ? 'text-foreground/80'
                                  : l.level === 'success' ? 'text-foreground font-medium'
                                  : 'text-foreground/70'
                                }>{l.message}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {r.finalCode && (
                          <details className="rounded-md border border-border bg-background">
                            <summary className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground cursor-pointer">
                              Final Java Code
                            </summary>
                            <pre className="p-3 text-[11px] font-mono whitespace-pre-wrap break-all max-h-72 overflow-auto">{r.finalCode}</pre>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default AdminAgentDashboard;
