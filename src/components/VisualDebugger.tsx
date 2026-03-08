import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Loader2, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';

interface DebugStep {
  line: number;
  code: string;
  variables: Record<string, string>;
  explanation: string;
  highlight?: string;
}

interface VisualDebuggerProps {
  code: string;
  isVisible: boolean;
}

const VisualDebugger = ({ code, isVisible }: VisualDebuggerProps) => {
  const [steps, setSteps] = useState<DebugStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [traceContent, setTraceContent] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleTrace = async () => {
    setIsLoading(true);
    setSteps([]);
    setCurrentStep(0);
    setTraceContent('');

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/debug-trace`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ code }),
      });

      if (!resp.ok || !resp.body) throw new Error('Failed to trace');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let content = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              content += delta;
              setTraceContent(content);
            }
          } catch {}
        }
      }

      // Parse the trace into steps
      const parsedSteps = parseTraceSteps(content);
      setSteps(parsedSteps);
    } catch (err: any) {
      setTraceContent(`⚠️ Error: ${err.message}`);
    }
    setIsLoading(false);
  };

  const parseTraceSteps = (content: string): DebugStep[] => {
    const steps: DebugStep[] = [];
    const stepRegex = /(?:step|line)\s*(\d+)[:\s]*(?:```[^\n]*\n)?([^\n]+)(?:\n```)?/gi;
    const lines = content.split('\n');
    let currentVars: Record<string, string> = {};
    let stepNum = 0;

    for (const line of lines) {
      if (line.match(/^#{1,3}\s*(step|line)/i) || line.match(/^\*\*step/i) || line.match(/^\d+\.\s/)) {
        stepNum++;
        steps.push({
          line: stepNum,
          code: line.replace(/^[#*\d.\s]+/g, '').trim(),
          variables: { ...currentVars },
          explanation: '',
        });
      } else if (steps.length > 0) {
        // Check for variable assignments
        const varMatch = line.match(/`?(\w+)`?\s*[=:→]\s*`?(.+?)`?\s*$/);
        if (varMatch) {
          currentVars[varMatch[1]] = varMatch[2];
          steps[steps.length - 1].variables = { ...currentVars };
        }
        steps[steps.length - 1].explanation += line + '\n';
      }
    }

    return steps.length > 0 ? steps : [{
      line: 1,
      code: 'Full trace',
      variables: {},
      explanation: content,
    }];
  };

  const handlePlay = () => {
    if (steps.length === 0) return;
    setIsPlaying(true);
    intervalRef.current = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= steps.length - 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);
  };

  const handlePause = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsPlaying(false);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep(prev => prev + 1);
  };

  const handleReset = () => {
    handlePause();
    setCurrentStep(0);
  };

  if (!isVisible) return null;

  const currentStepData = steps[currentStep];

  return (
    <div className="flex h-full flex-col bg-ide-sidebar">
      <div className="flex items-center justify-between border-b border-panel-border px-3 py-1.5">
        <div className="flex items-center gap-2">
          <Bug className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Visual Debugger</span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 gap-1 text-[10px]" onClick={handleTrace} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bug className="h-3 w-3" />}
          Trace Code
        </Button>
      </div>

      {steps.length > 0 && (
        <div className="flex items-center gap-1 border-b border-panel-border px-3 py-1.5">
          {isPlaying ? (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handlePause}><Pause className="h-3 w-3" /></Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handlePlay}><Play className="h-3 w-3" /></Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleNext} disabled={currentStep >= steps.length - 1}>
            <SkipForward className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleReset}><RotateCcw className="h-3 w-3" /></Button>
          <span className="ml-2 text-[10px] text-muted-foreground">
            Step {currentStep + 1} / {steps.length}
          </span>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {steps.length === 0 && !isLoading && !traceContent && (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Click "Trace Code" to step through your code line by line and see how variables change.
            </div>
          )}

          {isLoading && (
            <div className="flex items-center gap-2 py-4 justify-center text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              AI is analyzing your code...
            </div>
          )}

          {/* Variable watch panel */}
          {currentStepData && Object.keys(currentStepData.variables).length > 0 && (
            <div className="rounded-md border border-panel-border bg-card p-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Variables</div>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(currentStepData.variables).map(([name, value]) => (
                  <div key={name} className="flex items-center gap-1.5 rounded bg-secondary px-2 py-1">
                    <span className="text-[11px] font-mono font-bold text-primary">{name}</span>
                    <span className="text-[10px] text-muted-foreground">=</span>
                    <span className="text-[11px] font-mono text-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Steps list */}
          {steps.map((step, idx) => (
            <div
              key={idx}
              onClick={() => { handlePause(); setCurrentStep(idx); }}
              className={`cursor-pointer rounded-md border p-2 text-xs transition-all ${
                idx === currentStep
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : idx < currentStep
                  ? 'border-success/20 bg-success/5'
                  : 'border-panel-border bg-card opacity-60'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={idx === currentStep ? 'default' : 'secondary'} className="text-[9px] h-4 px-1.5">
                  {idx + 1}
                </Badge>
                <span className="font-mono text-[11px] font-medium">{step.code.slice(0, 60)}</span>
              </div>
              {idx === currentStep && step.explanation && (
                <div className="mt-1 text-[11px] text-muted-foreground prose prose-sm max-w-none [&_code]:bg-secondary [&_code]:rounded [&_code]:px-1 [&_code]:text-[10px]">
                  <ReactMarkdown>{step.explanation.slice(0, 200)}</ReactMarkdown>
                </div>
              )}
            </div>
          ))}

          {/* Raw trace fallback */}
          {traceContent && steps.length <= 1 && (
            <div className="prose prose-sm max-w-none text-xs [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-secondary [&_pre]:p-2 [&_pre]:text-[11px] [&_code]:bg-secondary [&_code]:px-1 [&_code]:rounded [&_code]:text-[10px]">
              <ReactMarkdown>{traceContent}</ReactMarkdown>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default VisualDebugger;
