import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Sparkles, Loader2, CheckCircle2, AlertTriangle, Info, Copy, Code2, Terminal, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface ReviewResult {
  overallScore: number;
  categories: { name: string; score: number; feedback: string }[];
  suggestions: string[];
  summary: string;
}

const CodeReview = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);

  const handleReview = async () => {
    if (!code.trim()) return;
    setReviewing(true);
    setResult(null);

    try {
      const resp = await supabase.functions.invoke('code-review', { body: { code } });
      if (resp.error) throw resp.error;
      setResult(resp.data);
      toast.success('Code analysis complete!');
    } catch (e) {
      toast.error('Review failed. Try again.');
      console.error(e);
    }
    setReviewing(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-emerald-500';
    if (score >= 5) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 8) return 'bg-emerald-500/10 border-emerald-500/20';
    if (score >= 5) return 'bg-amber-500/10 border-amber-500/20';
    return 'bg-rose-500/10 border-rose-500/20';
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      <div className="flex items-center gap-1 sm:gap-3 border-b border-panel-border bg-ide-toolbar px-3 sm:px-4 py-2 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-7 gap-1.5 text-xs font-medium rounded-lg">
          <ArrowLeft className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Modules</span>
        </Button>
        <div className="h-4 w-px bg-border shrink-0" />
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-bold truncate">AI Code Review</span>
        <Badge className="ml-auto bg-primary/10 text-primary border-0 text-[10px] hidden xs:inline-flex gap-1.5 font-black">
           <Terminal className="h-3 w-3" /> ANALYZER
        </Badge>
      </div>

      <div className="flex-1 overflow-auto bg-panel-sidebar/20">
        <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8 animate-in-up">
          <div className="text-center sm:text-left space-y-2">
             <h1 className="text-3xl font-black tracking-tight">Code Intelligence</h1>
             <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">Deep analysis of your Java code using AI to identify performance bottlenecks, anti-patterns, and readability improvements.</p>
          </div>

          <Card className="rounded-3xl border-2 border-primary/5 bg-card/50 shadow-2xl overflow-hidden">
            <CardHeader className="border-b border-white/5 bg-white/5 py-4">
               <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                 <Code2 className="h-4 w-4 text-primary" /> Source Input
               </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="// Paste your Java implementation here for analysis..."
                className="min-h-[250px] font-mono text-sm rounded-2xl bg-secondary/30 border-transparent p-6 focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <div className="mt-6 flex justify-end">
                <Button 
                  size="lg"
                  className="h-12 px-8 gap-2 font-black rounded-xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95" 
                  onClick={handleReview} 
                  disabled={reviewing || !code.trim()}
                >
                  {reviewing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5 fill-current" />}
                  {reviewing ? 'Analyzing Architecture...' : 'Analyze My Code'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {result && (
            <div className="space-y-8 pb-10">
              {/* Overall Score */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <Card className={`md:col-span-1 rounded-3xl border-2 flex flex-col items-center justify-center p-8 ${getScoreBg(result.overallScore)}`}>
                    <p className={`text-6xl font-black tracking-tighter ${getScoreColor(result.overallScore)}`}>{result.overallScore}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest mt-2 text-muted-foreground/60">Global Score</p>
                 </Card>
                 
                 <div className="md:col-span-2 grid grid-cols-2 gap-3">
                   {result.categories.map(cat => (
                     <div key={cat.name} className="p-4 rounded-2xl bg-card border border-panel-border flex flex-col justify-between">
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{cat.name}</span>
                        <div className="flex items-end justify-between mt-2">
                           <span className={`text-xl font-black ${getScoreColor(cat.score)}`}>{cat.score}/10</span>
                           <div className="h-1.5 w-12 bg-secondary rounded-full overflow-hidden">
                              <div className={`h-full ${getScoreColor(cat.score).replace('text', 'bg')}`} style={{ width: `${cat.score * 10}%` }} />
                           </div>
                        </div>
                     </div>
                   ))}
                 </div>
              </div>

              {/* Suggestions */}
              {result.suggestions.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 px-1">
                    <AlertTriangle className="h-4 w-4 text-warning" /> Critical Insights
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {result.suggestions.map((s, i) => (
                      <div key={i} className="p-5 rounded-2xl bg-secondary/30 border border-white/5 flex items-start gap-4 group hover:bg-secondary/50 transition-all">
                        <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                           <Info className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-xs text-foreground/90 leading-relaxed font-medium">{s}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <Card className="rounded-3xl border-2 border-primary/5 bg-card/40 overflow-hidden">
                <CardHeader className="border-b border-white/5 bg-white/5 py-4">
                   <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                     <BarChart3 className="h-4 w-4 text-primary" /> Executive Summary
                   </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="prose prose-sm prose-invert max-w-none text-foreground/80 leading-relaxed">
                    <ReactMarkdown>{result.summary}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeReview;
