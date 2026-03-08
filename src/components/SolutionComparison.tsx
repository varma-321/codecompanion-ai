import { useState } from 'react';
import { Loader2, Lightbulb, Zap, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';

interface SolutionData {
  approach: string;
  code: string;
  timeComplexity: string;
  spaceComplexity: string;
  explanation: string;
}

interface SolutionComparisonProps {
  code: string;
  problemTitle?: string;
}

const SolutionComparison = ({ code, problemTitle }: SolutionComparisonProps) => {
  const [solutions, setSolutions] = useState<SolutionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const handleGenerate = async () => {
    setLoading(true);
    setSolutions([]);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-complexity', {
        body: {
          code,
          mode: 'solution-comparison',
          problemTitle: problemTitle || 'Unknown Problem',
        },
      });
      if (error) throw error;
      const sols = data?.solutions || [];
      if (sols.length > 0) {
        setSolutions(sols);
      } else {
        // Fallback: use the analysis data to build a single solution
        setSolutions([{
          approach: 'Current Solution',
          code: code,
          timeComplexity: data?.timeComplexity || 'Unknown',
          spaceComplexity: data?.spaceComplexity || 'Unknown',
          explanation: data?.suggestion || 'No analysis available.',
        }]);
      }
    } catch (err: any) {
      setSolutions([{
        approach: 'Error',
        code: '',
        timeComplexity: '-',
        spaceComplexity: '-',
        explanation: err?.message || 'Failed to generate solutions. Try again.',
      }]);
    }
    setLoading(false);
  };

  const icons = [Lightbulb, Zap, Trophy];
  const labels = ['Brute Force', 'Better', 'Optimal'];
  const colors = ['text-warning', 'text-primary', 'text-success'];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-panel-border bg-ide-toolbar px-3 py-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Solution Comparison</span>
        <Button size="sm" className="h-6 text-[10px] gap-1" onClick={handleGenerate} disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
          {loading ? 'Analyzing...' : 'Compare Solutions'}
        </Button>
      </div>

      {solutions.length === 0 && !loading && (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center gap-2">
              {icons.map((Icon, i) => (
                <div key={i} className={`rounded-full bg-secondary p-2 ${colors[i]}`}>
                  <Icon className="h-4 w-4" />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Click "Compare Solutions" to see brute, better, and optimal approaches
            </p>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
            <p className="text-xs text-muted-foreground">Generating solution approaches...</p>
          </div>
        </div>
      )}

      {solutions.length > 0 && !loading && (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-panel-border bg-ide-toolbar">
            {solutions.map((sol, i) => {
              const Icon = icons[i] || Zap;
              return (
                <button
                  key={i}
                  onClick={() => setActiveTab(i)}
                  className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                    activeTab === i
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {sol.approach || labels[i] || `Solution ${i + 1}`}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              {/* Complexity badges */}
              <div className="flex gap-2">
                <Badge variant="outline" className="text-[10px] gap-1">
                  ⏱️ Time: {solutions[activeTab].timeComplexity}
                </Badge>
                <Badge variant="outline" className="text-[10px] gap-1">
                  💾 Space: {solutions[activeTab].spaceComplexity}
                </Badge>
              </div>

              {/* Explanation */}
              <div className="prose prose-sm max-w-none dark:prose-invert text-xs">
                <ReactMarkdown>{solutions[activeTab].explanation}</ReactMarkdown>
              </div>

              {/* Code */}
              {solutions[activeTab].code && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Code</p>
                  <pre className="rounded-lg border border-panel-border bg-background p-3 font-mono text-[11px] leading-relaxed overflow-x-auto text-foreground">
                    {solutions[activeTab].code}
                  </pre>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default SolutionComparison;
