import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Sparkles, Loader2, CheckCircle2, AlertTriangle, Info, Copy } from 'lucide-react';
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
    } catch (e) {
      toast.error('Review failed. Try again.');
      console.error(e);
    }
    setReviewing(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-500';
    if (score >= 5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 8) return 'bg-green-500/10 border-green-500/30';
    if (score >= 5) return 'bg-yellow-500/10 border-yellow-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border bg-card px-5 py-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-8 gap-1.5 text-xs font-medium rounded-lg">
          <ArrowLeft className="h-3.5 w-3.5" /> Modules
        </Button>
        <div className="h-4 w-px bg-border" />
        <Sparkles className="h-4 w-4 text-foreground" />
        <span className="text-sm font-semibold tracking-tight">AI Code Review</span>
        <Badge variant="secondary" className="text-[10px] gap-1"><Sparkles className="h-3 w-3" /> AI-Powered</Badge>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Paste your Java code for AI-powered quality review:</p>
            <Textarea
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="// Paste your Java code here..."
              className="min-h-[200px] font-mono text-sm"
            />
            <Button className="mt-3 gap-1.5" onClick={handleReview} disabled={reviewing || !code.trim()}>
              {reviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {reviewing ? 'Reviewing...' : 'Review Code'}
            </Button>
          </div>

          {result && (
            <div className="space-y-4">
              {/* Overall Score */}
              <Card className={`border ${getScoreBg(result.overallScore)}`}>
                <CardContent className="p-6 text-center">
                  <p className={`text-5xl font-bold ${getScoreColor(result.overallScore)}`}>{result.overallScore}/10</p>
                  <p className="text-sm text-muted-foreground mt-1">Overall Quality Score</p>
                </CardContent>
              </Card>

              {/* Categories */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.categories.map(cat => (
                  <Card key={cat.name} className="border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-semibold flex items-center justify-between">
                        {cat.name}
                        <Badge variant="outline" className={`text-[10px] ${getScoreColor(cat.score)}`}>{cat.score}/10</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">{cat.feedback}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Suggestions */}
              {result.suggestions.length > 0 && (
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Suggestions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.suggestions.map((s, i) => (
                        <li key={i} className="text-xs text-foreground flex items-start gap-2">
                          <Info className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Summary */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-foreground prose prose-sm max-w-none dark:prose-invert">
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
