import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/lib/user-context';
import { createProblem } from '@/lib/supabase';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const TOPICS = ['Arrays', 'Strings', 'Linked Lists', 'Trees', 'Graphs', 'Dynamic Programming', 'Sorting', 'Searching', 'Hash Maps', 'Stacks & Queues', 'Recursion', 'Greedy', 'Bit Manipulation', 'Math'];

interface GeneratedProblem {
  title: string;
  description: string;
  examples: { input: string; output: string; explanation?: string }[];
  constraints: string[];
  starterCode: string;
  difficulty: string;
  topic: string;
}

const ProblemGenerator = () => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [difficulty, setDifficulty] = useState<typeof DIFFICULTIES[number]>('medium');
  const [topic, setTopic] = useState('Arrays');
  const [problem, setProblem] = useState<GeneratedProblem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProblem(null);
    try {
      const { data, error } = await supabase.functions.invoke('generate-problem', {
        body: { difficulty, topic },
      });
      if (error) throw error;
      if (data?.problem) setProblem(data.problem);
      else throw new Error('No problem generated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate problem');
    }
    setIsGenerating(false);
  };

  const handleSaveAndPractice = async () => {
    if (!problem || !authUser) return;
    setIsSaving(true);
    try {
      const code = problem.starterCode || `// ${problem.title}\n// TODO: Implement your solution\n`;
      await createProblem(authUser.id, problem.title, code);
      toast.success('Problem saved! Redirecting to IDE...');
      setTimeout(() => navigate('/'), 500);
    } catch {
      toast.error('Failed to save problem');
    }
    setIsSaving(false);
  };

  const difficultyColor = (d: string) => d === 'easy' ? 'text-success border-success/30' : d === 'medium' ? 'text-warning border-warning/30' : 'text-destructive border-destructive/30';

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-panel-border bg-ide-toolbar px-4 py-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="h-7 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back to IDE
        </Button>
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold">Problem Generator</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Controls sidebar */}
        <div className="w-72 shrink-0 border-r border-panel-border overflow-auto bg-ide-sidebar p-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Difficulty</h3>
          <div className="flex gap-2 mb-6">
            {DIFFICULTIES.map(d => (
              <Button
                key={d}
                variant={difficulty === d ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDifficulty(d)}
                className={`text-xs capitalize ${difficulty !== d ? difficultyColor(d) : ''}`}
              >
                {d}
              </Button>
            ))}
          </div>

          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Topic</h3>
          <div className="flex flex-wrap gap-1.5 mb-6">
            {TOPICS.map(t => (
              <Badge
                key={t}
                variant={topic === t ? 'default' : 'outline'}
                className={`cursor-pointer text-[10px] ${topic === t ? '' : 'hover:bg-muted'}`}
                onClick={() => setTopic(t)}
              >
                {t}
              </Badge>
            ))}
          </div>

          <Button onClick={handleGenerate} disabled={isGenerating} className="w-full gap-2">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isGenerating ? 'Generating...' : 'Generate Problem'}
          </Button>
        </div>

        {/* Problem display */}
        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-3xl p-6">
            {!problem && !isGenerating && (
              <div className="flex flex-col items-center justify-center gap-4 py-20">
                <Wand2 className="h-16 w-16 text-muted-foreground/20" />
                <h2 className="text-xl font-bold">AI Problem Generator</h2>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Select a difficulty and topic, then click Generate to create a unique practice problem.
                </p>
              </div>
            )}

            {isGenerating && !problem && (
              <div className="flex items-center justify-center gap-3 py-20">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Generating {difficulty} {topic} problem...</span>
              </div>
            )}

            {problem && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-xl font-bold text-foreground">{problem.title}</h1>
                    <div className="mt-1 flex gap-2">
                      <Badge variant="outline" className={`text-xs capitalize ${difficultyColor(problem.difficulty)}`}>
                        {problem.difficulty}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">{problem.topic}</Badge>
                    </div>
                  </div>
                  <Button onClick={handleSaveAndPractice} disabled={isSaving} className="gap-1.5">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save & Practice
                  </Button>
                </div>

                <Card>
                  <CardHeader><CardTitle className="text-sm">Description</CardTitle></CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none text-foreground [&_code]:bg-secondary [&_code]:px-1 [&_code]:rounded">
                      <ReactMarkdown>{problem.description}</ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>

                {problem.examples.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Examples</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {problem.examples.map((ex, i) => (
                        <div key={i} className="rounded-md border border-panel-border bg-secondary/50 p-3 font-mono text-xs space-y-1">
                          <div><span className="text-muted-foreground">Input: </span>{ex.input}</div>
                          <div><span className="text-muted-foreground">Output: </span>{ex.output}</div>
                          {ex.explanation && <div className="text-muted-foreground mt-1">{ex.explanation}</div>}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {problem.constraints.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Constraints</CardTitle></CardHeader>
                    <CardContent>
                      <ul className="list-disc pl-4 space-y-1 text-xs text-foreground">
                        {problem.constraints.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {problem.starterCode && (
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Starter Code</CardTitle></CardHeader>
                    <CardContent>
                      <pre className="overflow-x-auto rounded-md bg-secondary p-3 font-mono text-xs">{problem.starterCode}</pre>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default ProblemGenerator;
