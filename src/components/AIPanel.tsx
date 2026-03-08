import { useState, useEffect } from 'react';
import { Brain, Lightbulb, Code2, Zap, ChevronRight, Loader2, AlertCircle, BookOpen, Bug, FlaskConical, FileInput, GraduationCap, MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  analyzeCode, getHints as getAIHints, getSolution, checkBackendStatus, getExtraInsights
} from '@/lib/ai-backend';
import { Analysis, saveAnalysis, getAnalysisForProblem, saveHint, getHints as getStoredHints, saveSolution, getSolutions, saveTestCases, getTestCases } from '@/lib/store';
import ReactMarkdown from 'react-markdown';

interface AIPanelProps {
  code: string;
  problemId: string | null;
}

const AIPanel = ({ code, problemId }: AIPanelProps) => {
  const [backendOnline, setBackendOnline] = useState(false);
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
  const [activeExtraTab, setActiveExtraTab] = useState<string>('');

  useEffect(() => {
    const check = async () => {
      setChecking(true);
      const online = await checkBackendStatus();
      setBackendOnline(online);
      setChecking(false);
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (problemId) {
      const existing = getAnalysisForProblem(problemId);
      setAnalysis(existing);
      const storedHints = getStoredHints(problemId);
      setHints(storedHints.map(h => h.hintText));
      setHintLevel(storedHints.length);
    } else {
      setAnalysis(null);
      setHints([]);
      setHintLevel(0);
    }
    setSolution(null);
    setSolutionType(null);
    setExtraContent('');
    setActiveExtraTab('');
  }, [problemId]);

  const handleAnalyze = async () => {
    if (!backendOnline || !problemId) return;
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
    if (!backendOnline || hintLevel >= 4) return;
    const nextLevel = hintLevel + 1;
    setLoadingHint(true);
    try {
      const hint = await getAIHints(code, nextLevel);
      setHints(prev => [...prev, hint]);
      setHintLevel(nextLevel);
      if (problemId) saveHint(problemId, nextLevel, hint);
    } catch (err) {
      console.error('Hint failed:', err);
    }
    setLoadingHint(false);
  };

  const handleSolution = async (type: 'brute' | 'better' | 'optimal') => {
    if (!backendOnline) return;
    setLoadingSolution(true);
    setSolutionType(type);
    try {
      const sol = await getSolution(code, type);
      setSolution(sol);
      if (problemId) {
        saveSolution({
          problemId,
          solutionType: type,
          solutionCode: sol.code,
          explanation: sol.explanation,
          timeComplexity: sol.timeComplexity,
          spaceComplexity: sol.spaceComplexity,
        });
      }
    } catch (err) {
      console.error('Solution failed:', err);
    }
    setLoadingSolution(false);
  };

  const handleExtra = async (type: 'algorithm' | 'edgecases' | 'testcases' | 'examples' | 'explain' | 'learning') => {
    if (!backendOnline) return;
    setLoadingExtra(true);
    setActiveExtraTab(type);
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
      backendOnline ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${
        checking ? 'animate-pulse-dot bg-muted-foreground' :
        backendOnline ? 'bg-success' : 'bg-destructive'
      }`} />
      {checking ? 'Checking...' : backendOnline ? 'Groq Cloud (Online)' : 'AI Offline'}
    </div>
  );

  if (!backendOnline && !checking) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-ide-sidebar p-4">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">AI Service Unavailable</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Server may be waking up. Please try again in a moment.
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
        <TabsList className="mx-2 mt-2 h-auto w-auto flex-wrap gap-0.5">
          <TabsTrigger value="analysis" className="text-[11px] px-2 py-1">Analysis</TabsTrigger>
          <TabsTrigger value="hints" className="text-[11px] px-2 py-1">Hints</TabsTrigger>
          <TabsTrigger value="solutions" className="text-[11px] px-2 py-1">Solutions</TabsTrigger>
          <TabsTrigger value="optimize" className="text-[11px] px-2 py-1">Optimize</TabsTrigger>
          <TabsTrigger value="edgecases" className="text-[11px] px-2 py-1">Edge Cases</TabsTrigger>
          <TabsTrigger value="testcases" className="text-[11px] px-2 py-1">Test Cases</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto p-3">
          <TabsContent value="analysis" className="mt-0">
            <Button onClick={handleAnalyze} disabled={analyzing || !problemId} size="sm" className="mb-3 w-full text-xs">
              {analyzing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Zap className="mr-1 h-3 w-3" />}
              {analyzing ? 'Analyzing...' : 'Analyze Code'}
            </Button>

            <div className="mb-3 flex gap-1">
              <Button onClick={() => handleExtra('explain')} disabled={loadingExtra} size="sm" variant="outline" className="flex-1 text-[10px] px-1">
                <MessageSquareText className="mr-0.5 h-3 w-3" /> Explain
              </Button>
              <Button onClick={() => handleExtra('learning')} disabled={loadingExtra} size="sm" variant="outline" className="flex-1 text-[10px] px-1">
                <GraduationCap className="mr-0.5 h-3 w-3" /> Learn
              </Button>
              <Button onClick={() => handleExtra('algorithm')} disabled={loadingExtra} size="sm" variant="outline" className="flex-1 text-[10px] px-1">
                <BookOpen className="mr-0.5 h-3 w-3" /> Algo
              </Button>
            </div>

            {analysis && (
              <div className="animate-fade-in space-y-3 text-xs">
                {analysis.algorithmUsed && analysis.algorithmUsed !== 'Unknown' && (
                  <div className="rounded-md bg-accent px-3 py-1.5 text-center">
                    <span className="text-[10px] text-muted-foreground">Detected Algorithm</span>
                    <div className="font-semibold text-accent-foreground">{analysis.algorithmUsed}</div>
                  </div>
                )}
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

            {loadingExtra && activeExtraTab && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
            {extraContent && !loadingExtra && ['explain', 'learning', 'algorithm'].includes(activeExtraTab) && (
              <div className="mt-3 animate-fade-in rounded-md bg-card p-3">
                <div className="prose prose-sm max-w-none text-xs text-muted-foreground">
                  <ReactMarkdown>{extraContent}</ReactMarkdown>
                </div>
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
            {hintLevel >= 4 && (
              <p className="text-center text-[10px] text-muted-foreground">All hints revealed.</p>
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

          <TabsContent value="optimize" className="mt-0">
            <Button onClick={() => handleExtra('algorithm')} disabled={loadingExtra} size="sm" className="mb-3 w-full text-xs">
              {loadingExtra && activeExtraTab === 'algorithm' ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Zap className="mr-1 h-3 w-3" />}
              Get Optimization Tips
            </Button>
            {extraContent && activeExtraTab === 'algorithm' && !loadingExtra && (
              <div className="animate-fade-in rounded-md bg-card p-3">
                <div className="prose prose-sm max-w-none text-xs text-muted-foreground">
                  <ReactMarkdown>{extraContent}</ReactMarkdown>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="edgecases" className="mt-0">
            <Button onClick={() => handleExtra('edgecases')} disabled={loadingExtra} size="sm" className="mb-3 w-full text-xs">
              {loadingExtra && activeExtraTab === 'edgecases' ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Bug className="mr-1 h-3 w-3" />}
              Detect Edge Cases
            </Button>
            {extraContent && activeExtraTab === 'edgecases' && !loadingExtra && (
              <div className="animate-fade-in rounded-md bg-card p-3">
                <div className="prose prose-sm max-w-none text-xs text-muted-foreground">
                  <ReactMarkdown>{extraContent}</ReactMarkdown>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="testcases" className="mt-0">
            <Button onClick={() => handleExtra('testcases')} disabled={loadingExtra} size="sm" className="mb-3 w-full text-xs">
              {loadingExtra && activeExtraTab === 'testcases' ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <FlaskConical className="mr-1 h-3 w-3" />}
              Generate Test Cases
            </Button>
            {extraContent && activeExtraTab === 'testcases' && !loadingExtra && (
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
