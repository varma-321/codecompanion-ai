import { useState, useEffect } from 'react';
import { Brain, Lightbulb, Code2, Zap, ChevronRight, Loader2, AlertCircle, BookOpen, Bug, FlaskConical, FileInput } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { analyzeCode, getHints, getSolution, checkOllamaStatus, getExtraInsights } from '@/lib/ollama';
import { Analysis, saveAnalysis, getAnalysisForProblem } from '@/lib/store';
import ReactMarkdown from 'react-markdown';

interface AIPanelProps {
  code: string;
  problemId: string | null;
}

const AIPanel = ({ code, problemId }: AIPanelProps) => {
  const [ollamaOnline, setOllamaOnline] = useState(false);
  const [checking, setChecking] = useState(true);

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [hints, setHints] = useState<string[]>([]);
  const [hintLevel, setHintLevel] = useState(0);
  const [loadingHint, setLoadingHint] = useState(false);

  const [solution, setSolution] = useState<{ code: string; timeComplexity: string; spaceComplexity: string; explanation: string } | null>(null);
  const [loadingSolution, setLoadingSolution] = useState(false);
  const [solutionType, setSolutionType] = useState<'brute' | 'better' | 'optimal' | null>(null);

  const [extraContent, setExtraContent] = useState('');
  const [loadingExtra, setLoadingExtra] = useState(false);

  // Check Ollama status periodically
  useEffect(() => {
    const check = async () => {
      setChecking(true);
      const online = await checkOllamaStatus();
      setOllamaOnline(online);
      setChecking(false);
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load existing analysis
  useEffect(() => {
    if (problemId) {
      const existing = getAnalysisForProblem(problemId);
      setAnalysis(existing);
    }
    setHints([]);
    setHintLevel(0);
    setSolution(null);
    setSolutionType(null);
    setExtraContent('');
  }, [problemId]);

  const handleAnalyze = async () => {
    if (!ollamaOnline || !problemId) return;
    setAnalyzing(true);
    try {
      const result = await analyzeCode(code);
      const saved = saveAnalysis({
        problemId,
        timeComplexity: result.timeComplexity,
        spaceComplexity: result.spaceComplexity,
        algorithmUsed: result.algorithmUsed,
        summary: result.summary,
        optimizations: result.optimizations,
      });
      setAnalysis(saved);
    } catch (err) {
      console.error('Analysis failed:', err);
    }
    setAnalyzing(false);
  };

  const handleNextHint = async () => {
    if (!ollamaOnline || hintLevel >= 4) return;
    const nextLevel = hintLevel + 1;
    setLoadingHint(true);
    try {
      const hint = await getHints(code, nextLevel);
      setHints(prev => [...prev, hint]);
      setHintLevel(nextLevel);
    } catch (err) {
      console.error('Hint failed:', err);
    }
    setLoadingHint(false);
  };

  const handleSolution = async (type: 'brute' | 'better' | 'optimal') => {
    if (!ollamaOnline) return;
    setLoadingSolution(true);
    setSolutionType(type);
    try {
      const sol = await getSolution(code, type);
      setSolution(sol);
    } catch (err) {
      console.error('Solution failed:', err);
    }
    setLoadingSolution(false);
  };

  const handleExtra = async (type: 'algorithm' | 'edgecases' | 'testcases' | 'examples') => {
    if (!ollamaOnline) return;
    setLoadingExtra(true);
    try {
      const result = await getExtraInsights(code, type);
      setExtraContent(result);
    } catch (err) {
      console.error('Extra insight failed:', err);
    }
    setLoadingExtra(false);
  };

  const StatusBadge = () => (
    <div className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${
      checking ? 'bg-secondary text-muted-foreground' :
      ollamaOnline ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${
        checking ? 'animate-pulse-dot bg-muted-foreground' :
        ollamaOnline ? 'bg-success' : 'bg-destructive'
      }`} />
      {checking ? 'Checking...' : ollamaOnline ? 'Ollama Online' : 'Ollama Offline'}
    </div>
  );

  if (!ollamaOnline && !checking) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-ide-sidebar p-4">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Ollama Not Connected</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Run <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[11px]">ollama serve</code> in your terminal to enable AI features.
          </p>
        </div>
        <StatusBadge />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-ide-sidebar">
      <div className="flex items-center justify-between border-b border-panel-border px-3 py-2">
        <div className="flex items-center gap-2">
          <Brain className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Assistant</span>
        </div>
        <StatusBadge />
      </div>

      <Tabs defaultValue="analysis" className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mx-2 mt-2 h-8 w-auto">
          <TabsTrigger value="analysis" className="text-xs">Analysis</TabsTrigger>
          <TabsTrigger value="hints" className="text-xs">Hints</TabsTrigger>
          <TabsTrigger value="solutions" className="text-xs">Solutions</TabsTrigger>
          <TabsTrigger value="extras" className="text-xs">More</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto p-3">
          <TabsContent value="analysis" className="mt-0">
            <Button onClick={handleAnalyze} disabled={analyzing || !problemId} size="sm" className="mb-3 w-full text-xs">
              {analyzing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Zap className="mr-1 h-3 w-3" />}
              {analyzing ? 'Analyzing...' : 'Analyze Code'}
            </Button>
            {analysis && (
              <div className="animate-fade-in space-y-3 text-xs">
                <div className="rounded-md bg-card p-3">
                  <div className="mb-2 font-semibold text-foreground">Summary</div>
                  <p className="text-muted-foreground">{analysis.summary}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md bg-card p-2">
                    <div className="text-[10px] text-muted-foreground">Time</div>
                    <div className="font-mono font-semibold text-foreground">{analysis.timeComplexity}</div>
                  </div>
                  <div className="rounded-md bg-card p-2">
                    <div className="text-[10px] text-muted-foreground">Space</div>
                    <div className="font-mono font-semibold text-foreground">{analysis.spaceComplexity}</div>
                  </div>
                </div>
                <div className="rounded-md bg-card p-3">
                  <div className="mb-1 font-semibold text-foreground">Algorithm</div>
                  <p className="text-muted-foreground">{analysis.algorithmUsed}</p>
                </div>
                {analysis.optimizations.length > 0 && (
                  <div className="rounded-md bg-card p-3">
                    <div className="mb-1 font-semibold text-foreground">Optimizations</div>
                    <ul className="list-inside list-disc text-muted-foreground">
                      {analysis.optimizations.map((o, i) => <li key={i}>{o}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="hints" className="mt-0">
            <div className="mb-3 text-xs text-muted-foreground">
              Get progressive hints without spoiling the solution.
            </div>
            {hints.map((hint, i) => (
              <div key={i} className="mb-2 animate-fade-in rounded-md bg-card p-3">
                <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-primary">
                  <Lightbulb className="h-3 w-3" /> Hint {i + 1}
                </div>
                <div className="prose prose-sm max-w-none text-xs text-muted-foreground">
                  <ReactMarkdown>{hint}</ReactMarkdown>
                </div>
              </div>
            ))}
            {hintLevel < 4 && (
              <Button onClick={handleNextHint} disabled={loadingHint} size="sm" variant="outline" className="w-full text-xs">
                {loadingHint ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <ChevronRight className="mr-1 h-3 w-3" />}
                {hints.length === 0 ? 'Get First Hint' : 'Next Hint'}
              </Button>
            )}
          </TabsContent>

          <TabsContent value="solutions" className="mt-0">
            <div className="mb-3 flex gap-1">
              {(['brute', 'better', 'optimal'] as const).map(type => (
                <Button
                  key={type}
                  onClick={() => handleSolution(type)}
                  disabled={loadingSolution}
                  size="sm"
                  variant={solutionType === type ? 'default' : 'outline'}
                  className="flex-1 text-xs capitalize"
                >
                  {type}
                </Button>
              ))}
            </div>
            {loadingSolution && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
            {solution && !loadingSolution && (
              <div className="animate-fade-in space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md bg-card p-2">
                    <div className="text-[10px] text-muted-foreground">Time</div>
                    <div className="font-mono font-semibold">{solution.timeComplexity}</div>
                  </div>
                  <div className="rounded-md bg-card p-2">
                    <div className="text-[10px] text-muted-foreground">Space</div>
                    <div className="font-mono font-semibold">{solution.spaceComplexity}</div>
                  </div>
                </div>
                <div className="rounded-md bg-card p-3">
                  <div className="mb-1 font-semibold">Explanation</div>
                  <p className="text-muted-foreground">{solution.explanation}</p>
                </div>
                <pre className="overflow-x-auto rounded-md bg-secondary p-3 font-mono text-[11px]">
                  {solution.code}
                </pre>
              </div>
            )}
          </TabsContent>

          <TabsContent value="extras" className="mt-0">
            <div className="mb-3 grid grid-cols-2 gap-1">
              <Button onClick={() => handleExtra('algorithm')} disabled={loadingExtra} size="sm" variant="outline" className="text-xs">
                <BookOpen className="mr-1 h-3 w-3" /> Algorithm
              </Button>
              <Button onClick={() => handleExtra('edgecases')} disabled={loadingExtra} size="sm" variant="outline" className="text-xs">
                <Bug className="mr-1 h-3 w-3" /> Edge Cases
              </Button>
              <Button onClick={() => handleExtra('testcases')} disabled={loadingExtra} size="sm" variant="outline" className="text-xs">
                <FlaskConical className="mr-1 h-3 w-3" /> Test Cases
              </Button>
              <Button onClick={() => handleExtra('examples')} disabled={loadingExtra} size="sm" variant="outline" className="text-xs">
                <FileInput className="mr-1 h-3 w-3" /> Examples
              </Button>
            </div>
            {loadingExtra && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
            {extraContent && !loadingExtra && (
              <div className="animate-fade-in rounded-md bg-card p-3">
                <div className="prose prose-sm max-w-none text-xs text-muted-foreground">
                  <ReactMarkdown>{extraContent}</ReactMarkdown>
                </div>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default AIPanel;
