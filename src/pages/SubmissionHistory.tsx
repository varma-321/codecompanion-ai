import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Filter, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';
import { STRIVER_ROADMAP } from '@/lib/striver-roadmap-data';
import { NEETCODE_ROADMAP } from '@/lib/neetcode-roadmap-data';
import { LEETCODE_TOP150_ROADMAP } from '@/lib/leetcode-top150-data';

const ALL_PROBLEMS = [...STRIVER_ROADMAP, ...NEETCODE_ROADMAP, ...LEETCODE_TOP150_ROADMAP]
  .flatMap(t => t.problems);
const PROBLEM_MAP = Object.fromEntries(ALL_PROBLEMS.map(p => [p.key, p]));

interface Submission {
  id: string;
  problem_id: string;
  code_snapshot: string;
  test_results: any[];
  passed: boolean;
  execution_time_ms: number | null;
  created_at: string;
  language: string;
}

const SubmissionHistory = () => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!authUser) return;
    const load = async () => {
      const { data } = await supabase
        .from('execution_history')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(200);
      setSubmissions((data || []) as Submission[]);
      setLoading(false);
    };
    load();
  }, [authUser]);

  const filtered = useMemo(() => {
    return submissions.filter(s => {
      if (statusFilter === 'accepted' && !s.passed) return false;
      if (statusFilter === 'rejected' && s.passed) return false;
      if (search) {
        const prob = PROBLEM_MAP[s.problem_id];
        const title = prob?.title || s.problem_id;
        if (!title.toLowerCase().includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [submissions, search, statusFilter]);

  const stats = useMemo(() => {
    const total = submissions.length;
    const accepted = submissions.filter(s => s.passed).length;
    const rate = total > 0 ? Math.round((accepted / total) * 100) : 0;
    return { total, accepted, rate };
  }, [submissions]);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString();
  };

  if (!authUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="p-8"><p className="text-muted-foreground">Please log in to view submissions.</p></Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/modules')}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-2xl font-bold text-foreground">Submission History</h1>
          <Badge variant="outline" className="ml-auto">{stats.total} submissions</Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-border"><CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-foreground">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </CardContent></Card>
          <Card className="border-border"><CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-emerald-500">{stats.accepted}</p>
            <p className="text-[10px] text-muted-foreground">Accepted</p>
          </CardContent></Card>
          <Card className="border-border"><CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-primary">{stats.rate}%</p>
            <p className="text-[10px] text-muted-foreground">Acceptance Rate</p>
          </CardContent></Card>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Input placeholder="Search by problem..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 h-9 text-sm" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Wrong Answer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Submissions List */}
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
        ) : filtered.length === 0 ? (
          <Card className="border-border"><CardContent className="p-8 text-center">
            <Code2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">No submissions found</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-1">
            {filtered.map(s => {
              const prob = PROBLEM_MAP[s.problem_id];
              const title = prob?.title || s.problem_id;
              const isExpanded = expandedId === s.id;
              const testsPassed = Array.isArray(s.test_results) ? s.test_results.filter((r: any) => r.status === 'PASSED').length : 0;
              const testsTotal = Array.isArray(s.test_results) ? s.test_results.length : 0;

              return (
                <Collapsible key={s.id} open={isExpanded} onOpenChange={() => setExpandedId(isExpanded ? null : s.id)}>
                  <CollapsibleTrigger asChild>
                    <div className={`flex items-center gap-3 rounded-lg px-4 py-3 cursor-pointer transition-colors border border-transparent hover:border-border hover:bg-muted/30 ${isExpanded ? 'bg-muted/20 border-border' : ''}`}>
                      {s.passed ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{title}</p>
                        <p className="text-[10px] text-muted-foreground">{testsPassed}/{testsTotal} tests passed</p>
                      </div>
                      <Badge variant={s.passed ? 'default' : 'destructive'} className="text-[10px] shrink-0">
                        {s.passed ? 'Accepted' : 'Wrong Answer'}
                      </Badge>
                      {s.execution_time_ms && <Badge variant="outline" className="text-[9px] font-mono shrink-0">{s.execution_time_ms}ms</Badge>}
                      <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(s.created_at)}</span>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-7 mr-4 mb-3 mt-1">
                      <pre className="text-[10px] bg-muted/30 rounded-md p-3 border border-border font-mono max-h-48 overflow-auto leading-relaxed text-foreground">
                        {s.code_snapshot.slice(0, 800)}{s.code_snapshot.length > 800 ? '...' : ''}
                      </pre>
                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => navigate(`/problem/${s.problem_id}`)}>
                          Go to Problem
                        </Button>
                        <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => navigator.clipboard.writeText(s.code_snapshot)}>
                          Copy Code
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubmissionHistory;
