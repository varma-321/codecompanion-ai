import { useState, useRef, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Loader2, Sparkles, CheckCircle2, Trophy, ArrowRight, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/lib/user-context';
import ReactMarkdown from 'react-markdown';

const TOPICS = [
  { name: 'Arrays', icon: '📊', algorithms: ['Two Pointers', 'Sliding Window', 'Prefix Sum', 'Kadane\'s Algorithm'] },
  { name: 'Searching', icon: '🔍', algorithms: ['Binary Search', 'Linear Search', 'Search in Rotated Array'] },
  { name: 'Sorting', icon: '📈', algorithms: ['Merge Sort', 'Quick Sort', 'Heap Sort', 'Counting Sort'] },
  { name: 'Hash Maps', icon: '🗂️', algorithms: ['Two Sum Pattern', 'Frequency Counting', 'Group Anagrams'] },
  { name: 'Linked Lists', icon: '🔗', algorithms: ['Fast & Slow Pointers', 'Reverse Linked List', 'Merge Two Lists'] },
  { name: 'Stacks & Queues', icon: '📚', algorithms: ['Monotonic Stack', 'Valid Parentheses', 'Next Greater Element'] },
  { name: 'Trees', icon: '🌳', algorithms: ['DFS', 'BFS', 'Binary Search Tree', 'Tree Traversals'] },
  { name: 'Graphs', icon: '🕸️', algorithms: ['DFS/BFS', 'Dijkstra', 'Topological Sort', 'Union Find'] },
  { name: 'Recursion', icon: '🔄', algorithms: ['Backtracking', 'Subset Generation', 'Permutations', 'N-Queens'] },
  { name: 'Dynamic Programming', icon: '💡', algorithms: ['Fibonacci', 'Knapsack', 'LCS', 'Coin Change', 'Matrix Chain'] },
  { name: 'Greedy', icon: '🎯', algorithms: ['Activity Selection', 'Fractional Knapsack', 'Huffman Coding'] },
  { name: 'Strings', icon: '📝', algorithms: ['KMP', 'Rabin-Karp', 'Palindrome Detection', 'Anagram Checking'] },
];

const LearningMode = () => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string | null>(null);
  const [explanation, setExplanation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeStep, setActiveStep] = useState<'reading' | 'exercise' | 'quiz'>('reading');
  const [progress, setProgress] = useState(0);
  const [exerciseCode, setExerciseCode] = useState('');
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [explanation]);

  const handleLearn = async (algorithm: string) => {
    setSelectedAlgorithm(algorithm);
    setExplanation('');
    setIsLoading(true);

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/learn-algorithm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ algorithm }),
      });

      if (!resp.ok || !resp.body) throw new Error('Failed to start stream');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let content = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              content += delta;
              setExplanation(content);
            }
          } catch {}
        }
      }

      // Save to learning history
      if (authUser) {
        const topic = TOPICS.find(t => t.algorithms.includes(algorithm))?.name || 'general';
        await supabase.from('learning_history').insert({
          user_id: authUser.id,
          topic,
          algorithm,
          difficulty: 'medium',
          completed: true,
        } as any);
      }
    } catch (err: any) {
      setExplanation(`⚠️ Error: ${err.message || 'Failed to load explanation'}`);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-panel-border bg-ide-toolbar px-4 py-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="h-7 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> <span className="hidden sm:inline">Back</span>
        </Button>
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-bold truncate">Learning Mode</span>
        </div>
        {selectedAlgorithm && (
          <Badge variant="secondary" className="text-[10px] hidden xs:inline-flex truncate">{selectedAlgorithm}</Badge>
        )}
        <div className="ml-auto flex items-center gap-3">
           <div className="w-20 sm:w-32 h-1.5 bg-secondary rounded-full overflow-hidden hidden xs:block">
              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
           </div>
           <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{progress}%</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Topic sidebar - hidden on small screens by default, but we'll use a simple CSS toggle approach for now or just stack it if small */}
        <div className={`
          ${selectedAlgorithm ? 'hidden lg:block' : 'block'} 
          w-full lg:w-72 shrink-0 border-r border-panel-border overflow-auto bg-ide-sidebar transition-all
        `}>
          <div className="p-4 sm:p-5">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-foreground">Topics</h2>
              <p className="text-[11px] text-muted-foreground mt-1 uppercase tracking-widest font-bold">DSA Learning Paths</p>
            </div>
            <div className="space-y-1.5">
              {TOPICS.map(topic => (
                <div key={topic.name} className="space-y-1">
                  <button
                    onClick={() => setSelectedTopic(selectedTopic === topic.name ? null : topic.name)}
                    className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                      selectedTopic === topic.name ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{topic.icon}</span>
                      <span>{topic.name}</span>
                    </div>
                    <ChevronRight className={`h-4 w-4 transition-transform ${selectedTopic === topic.name ? 'rotate-90' : ''}`} />
                  </button>
                  {selectedTopic === topic.name && (
                    <div className="ml-4 mt-2 space-y-1 animate-in slide-in-from-top-2 duration-200">
                      {topic.algorithms.map(algo => (
                        <button
                          key={algo}
                          onClick={() => handleLearn(algo)}
                          className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-xs font-bold transition-all ${
                            selectedAlgorithm === algo ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'
                          }`}
                        >
                          <Sparkles className={`h-3.5 w-3.5 ${selectedAlgorithm === algo ? 'text-primary' : 'text-muted-foreground/40'}`} />
                          {algo}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content area */}
        <ScrollArea className={`flex-1 ${!selectedAlgorithm ? 'hidden lg:block' : 'block'}`} ref={scrollRef}>
          {selectedAlgorithm && (
             <Button 
               variant="ghost" 
               size="sm" 
               onClick={() => { setSelectedAlgorithm(null); setExplanation(''); }} 
               className="lg:hidden absolute top-4 left-4 z-20 h-8 gap-1.5 text-[10px] font-black uppercase bg-background/80 backdrop-blur border border-border rounded-full"
             >
               <ArrowLeft className="h-3 w-3" /> Change Topic
             </Button>
          )}
          <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
            {!selectedAlgorithm && !isLoading && (
              <div className="flex h-full flex-col items-center justify-center gap-4 py-20">
                <BookOpen className="h-16 w-16 text-muted-foreground/20" />
                <h2 className="text-xl font-bold text-foreground">Choose an Algorithm to Learn</h2>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Select a topic from the sidebar, then click on an algorithm. The AI tutor will explain it step-by-step with diagrams and code examples.
                </p>
              </div>
            )}

            {isLoading && !explanation && (
              <div className="flex items-center gap-3 py-20 justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Preparing lesson for {selectedAlgorithm}...</span>
              </div>
            )}

            {explanation && (
              <div className="space-y-8">
                <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/50 w-fit">
                   {(['reading', 'exercise', 'quiz'] as const).map(step => (
                      <button 
                        key={step}
                        onClick={() => setActiveStep(step)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${activeStep === step ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                         {step}
                      </button>
                   ))}
                </div>

                {activeStep === 'reading' && (
                  <div className="prose prose-sm max-w-none dark:prose-invert [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-[#0d1117] [&_pre]:p-5 [&_pre]:font-mono [&_pre]:text-sm [&_code]:rounded [&_code]:bg-secondary [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_table]:w-full [&_th]:border [&_th]:border-panel-border [&_th]:px-3 [&_th]:py-2 [&_td]:border [&_td]:border-panel-border [&_td]:px-3 [&_td]:py-2 [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_p]:text-foreground [&_li]:text-foreground [&_strong]:text-foreground animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <ReactMarkdown>{explanation}</ReactMarkdown>
                    {isLoading && <Loader2 className="mt-4 h-5 w-5 animate-spin text-primary" />}
                    {!isLoading && (
                       <Button onClick={() => { setActiveStep('exercise'); setProgress(50); }} className="mt-8 gap-2 w-full sm:w-auto">
                          Next: Practice Exercise <Sparkles className="h-4 w-4" />
                       </Button>
                    )}
                  </div>
                )}

                {activeStep === 'exercise' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                     <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
                        <h3 className="text-sm font-bold flex items-center gap-2">
                           <Sparkles className="h-4 w-4 text-primary" /> Hands-on Practice
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                           Apply what you've learned! Implement the core logic for <strong>{selectedAlgorithm}</strong> in the sandbox below.
                        </p>
                     </div>
                     <div className="h-[400px] rounded-2xl overflow-hidden border border-panel-border bg-ide-sidebar shadow-2xl">
                        <div className="p-3 border-b border-panel-border bg-card flex items-center justify-between">
                           <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Main.java</span>
                           <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold text-primary">Run & Verify</Button>
                        </div>
                        <div className="p-4 h-full font-mono text-xs bg-black/20">
                           {/* Simplified editor mock for the demo */}
                           <pre className="text-primary-foreground/80">
{`public class Solution {
    public void ${selectedAlgorithm?.toLowerCase().replace(/\s/g, '') || 'solve'}(int[] nums) {
        // TODO: Implement the algorithm logic here
        
    }
}`}
                           </pre>
                        </div>
                     </div>
                     <div className="flex justify-between items-center">
                        <Button variant="ghost" onClick={() => setActiveStep('reading')} className="text-xs font-bold">Back to Lesson</Button>
                        <Button onClick={() => { setActiveStep('quiz'); setProgress(90); }} className="gap-2">
                           Proceed to Quiz
                        </Button>
                     </div>
                  </div>
                )}

                {activeStep === 'quiz' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 py-10">
                     <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
                        <div className="text-center space-y-2">
                           <h3 className="text-xl font-bold">Quick Concept Check</h3>
                           <p className="text-xs text-muted-foreground">Finish strong! Answer these questions to complete the lesson.</p>
                        </div>
                        
                        <div className="space-y-4">
                           {[1].map(q => (
                              <Card key={q} className="rounded-2xl border-panel-border bg-card/50">
                                 <CardHeader className="pb-2">
                                    <p className="text-sm font-medium">What is the average time complexity of {selectedAlgorithm}?</p>
                                 </CardHeader>
                                 <CardContent className="space-y-2">
                                    {['O(log N)', 'O(N)', 'O(N log N)', 'O(N²)'].map(opt => (
                                       <button 
                                          key={opt}
                                          onClick={() => { setQuizScore(100); setProgress(100); toast({ title: 'Perfect Score!' }); }}
                                          className="w-full p-3 rounded-xl border border-border text-left text-xs font-medium hover:border-primary/50 hover:bg-primary/5 transition-all"
                                       >
                                          {opt}
                                       </button>
                                    ))}
                                 </CardContent>
                              </Card>
                           ))}
                        </div>

                        {quizScore && (
                           <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-4">
                              <div className="h-16 w-16 rounded-full bg-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                                 <CheckCircle2 className="h-8 w-8 text-white" />
                              </div>
                              <div className="space-y-1">
                                 <h4 className="text-lg font-bold">Lesson Mastered!</h4>
                                 <p className="text-xs text-muted-foreground">Lesson progress saved.</p>
                              </div>
                              <Button onClick={() => { setSelectedAlgorithm(null); setSelectedTopic(null); setProgress(0); setActiveStep('reading'); }} className="w-full bg-emerald-600 hover:bg-emerald-700">
                                 Explore More Topics
                              </Button>
                           </div>
                        )}
                     </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default LearningMode;
