import { Clock, Zap, MemoryStick, TrendingUp, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ExecutionAnalyticsProps {
  executionTimeMs: number | null;
  timeComplexity: string | null;
  spaceComplexity: string | null;
  suggestion: string | null;
  optimizationPossible: boolean;
  isAnalyzing: boolean;
}

const ExecutionAnalyticsPanel = ({
  executionTimeMs, timeComplexity, spaceComplexity, suggestion, optimizationPossible, isAnalyzing
}: ExecutionAnalyticsProps) => {
  if (!executionTimeMs && !isAnalyzing) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-1.5 border-t border-panel-border bg-card text-xs">
      {isAnalyzing && (
        <span className="flex items-center gap-1 text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Analyzing complexity...
        </span>
      )}

      {executionTimeMs !== null && (
        <Badge variant="outline" className="gap-1 text-[10px]">
          <Clock className="h-3 w-3" /> {executionTimeMs}ms
        </Badge>
      )}

      {timeComplexity && (
        <Badge variant={optimizationPossible ? 'destructive' : 'secondary'} className="gap-1 text-[10px]">
          <Zap className="h-3 w-3" /> Time: {timeComplexity}
        </Badge>
      )}

      {spaceComplexity && (
        <Badge variant="secondary" className="gap-1 text-[10px]">
          <MemoryStick className="h-3 w-3" /> Space: {spaceComplexity}
        </Badge>
      )}

      {suggestion && (
        <span className="flex items-center gap-1 text-muted-foreground">
          <TrendingUp className="h-3 w-3 text-primary" /> {suggestion}
        </span>
      )}
    </div>
  );
};

export default ExecutionAnalyticsPanel;
