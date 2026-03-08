import { useState, useEffect } from 'react';
import { History, ChevronDown, ChevronRight, CheckCircle2, XCircle, Copy, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';

interface HistoryEntry {
  id: string;
  code_snapshot: string;
  test_results: any[];
  passed: boolean;
  execution_time_ms: number | null;
  created_at: string;
}

interface ExecutionHistoryPanelProps {
  userId: string;
  problemId: string;
  onRestoreCode?: (code: string) => void;
}

const ExecutionHistoryPanel = ({ userId, problemId, onRestoreCode }: ExecutionHistoryPanelProps) => {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !problemId) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('execution_history')
        .select('*')
        .eq('user_id', userId)
        .eq('problem_id', problemId)
        .order('created_at', { ascending: false })
        .limit(50);
      setEntries((data || []) as HistoryEntry[]);
      setLoading(false);
    };
    load();
  }, [userId, problemId]);

  const handleCopy = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('execution_history').delete().eq('id', id);
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  if (loading) {
    return <div className="p-4 text-xs text-muted-foreground text-center">Loading history...</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <History className="h-6 w-6 mb-2 opacity-50" />
        <p className="text-xs">No execution history yet</p>
        <p className="text-[10px]">Run your code to start tracking attempts</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {entries.length} attempt{entries.length !== 1 ? 's' : ''}
          </span>
        </div>

        {entries.map((entry, idx) => {
          const isExpanded = expandedId === entry.id;
          const testsPassed = Array.isArray(entry.test_results)
            ? entry.test_results.filter((r: any) => r.status === 'PASSED').length
            : 0;
          const testsTotal = Array.isArray(entry.test_results) ? entry.test_results.length : 0;

          return (
            <Collapsible key={entry.id} open={isExpanded} onOpenChange={() => setExpandedId(isExpanded ? null : entry.id)}>
              <CollapsibleTrigger asChild>
                <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs cursor-pointer transition-all ${
                  entry.passed ? 'hover:bg-success/5' : 'hover:bg-muted/50'
                } ${isExpanded ? 'bg-muted/30' : ''}`}>
                  {entry.passed ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                  )}

                  <span className="text-[10px] text-muted-foreground font-mono w-6">#{entries.length - idx}</span>

                  <span className="flex-1 font-medium text-foreground">
                    {entry.passed ? 'All tests passed' : `${testsPassed}/${testsTotal} passed`}
                  </span>

                  {entry.execution_time_ms && (
                    <Badge variant="outline" className="text-[9px] font-mono">{entry.execution_time_ms}ms</Badge>
                  )}

                  <span className="text-[10px] text-muted-foreground">{formatTime(entry.created_at)}</span>

                  {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="ml-4 mt-1 mb-2 space-y-2">
                  {/* Test results summary */}
                  {testsTotal > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(entry.test_results as any[]).map((r: any, i: number) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className={`text-[9px] ${r.status === 'PASSED' ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}
                        >
                          Test {i + 1}: {r.status}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Code snapshot */}
                  <div className="relative">
                    <pre className="text-[10px] bg-background rounded-md p-2 border border-panel-border font-mono max-h-40 overflow-auto leading-relaxed">
                      {entry.code_snapshot.slice(0, 500)}{entry.code_snapshot.length > 500 ? '...' : ''}
                    </pre>
                    <div className="absolute top-1 right-1 flex gap-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={(e) => { e.stopPropagation(); handleCopy(entry.id, entry.code_snapshot); }}
                        title="Copy code"
                      >
                        {copied === entry.id ? <Check className="h-2.5 w-2.5 text-success" /> : <Copy className="h-2.5 w-2.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                        title="Delete"
                      >
                        <Trash2 className="h-2.5 w-2.5 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {onRestoreCode && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] gap-1"
                      onClick={() => onRestoreCode(entry.code_snapshot)}
                    >
                      Restore this code
                    </Button>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </ScrollArea>
  );
};

export default ExecutionHistoryPanel;

// Utility: save an execution to history
export async function saveExecutionHistory(
  userId: string,
  problemId: string,
  codeSnapshot: string,
  testResults: any[],
  passed: boolean,
  executionTimeMs?: number
) {
  await supabase.from('execution_history').insert({
    user_id: userId,
    problem_id: problemId,
    code_snapshot: codeSnapshot,
    test_results: testResults,
    passed,
    execution_time_ms: executionTimeMs || null,
  } as any);
}
