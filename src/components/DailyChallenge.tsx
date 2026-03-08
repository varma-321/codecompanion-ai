import { useState } from 'react';
import { Loader2, Calendar, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/lib/user-context';
import { createProblem } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface DailyProblem {
  title: string;
  description: string;
  difficulty: string;
  topic: string;
  examples: { input: string; output: string }[];
  starterCode: string;
  hint?: string;
}

const DailyChallenge = () => {
  const { authUser } = useUser();
  const navigate = useNavigate();
  const [problem, setProblem] = useState<DailyProblem | null>(null);
  const [weakTopic, setWeakTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchDaily = async () => {
    if (!authUser) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('daily-challenge', {
        body: { userId: authUser.id },
      });
      if (error) throw error;
      setProblem(data.problem);
      setWeakTopic(data.weakestTopic || '');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate challenge');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!problem || !authUser) return;
    setSaving(true);
    try {
      await createProblem(authUser.id, problem.title, problem.starterCode || '');
      toast.success('Saved! Redirecting...');
      setTimeout(() => navigate('/'), 500);
    } catch { toast.error('Failed to save'); }
    setSaving(false);
  };

  const diffColor = (d: string) => d === 'easy' ? 'text-success' : d === 'medium' ? 'text-warning' : 'text-destructive';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold">Daily Challenge</span>
        </div>
        <Button onClick={fetchDaily} disabled={loading} size="sm" className="gap-1.5">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? 'Generating...' : problem ? 'New Challenge' : 'Get Today\'s Challenge'}
        </Button>
      </div>

      {weakTopic && (
        <p className="text-xs text-muted-foreground">
          📌 Based on your progress, we recommend practicing: <span className="font-semibold text-primary">{weakTopic}</span>
        </p>
      )}

      {problem && (
        <Card className="animate-fade-in">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <span>{problem.title}</span>
              <div className="flex gap-1.5">
                <Badge variant="outline" className={`text-[10px] capitalize ${diffColor(problem.difficulty)}`}>{problem.difficulty}</Badge>
                <Badge variant="secondary" className="text-[10px]">{problem.topic}</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="prose prose-sm max-w-none text-xs text-foreground [&_code]:bg-secondary [&_code]:px-1 [&_code]:rounded">
              <ReactMarkdown>{problem.description}</ReactMarkdown>
            </div>
            {problem.examples?.length > 0 && (
              <div className="space-y-2">
                {problem.examples.map((ex, i) => (
                  <div key={i} className="rounded border border-panel-border bg-secondary/50 p-2 font-mono text-[11px]">
                    <div><span className="text-muted-foreground">Input: </span>{ex.input}</div>
                    <div><span className="text-muted-foreground">Output: </span>{ex.output}</div>
                  </div>
                ))}
              </div>
            )}
            {problem.hint && (
              <p className="text-[11px] text-muted-foreground italic">💡 Hint: {problem.hint}</p>
            )}
            <Button onClick={handleSave} disabled={saving} size="sm" className="w-full">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Save & Practice
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DailyChallenge;
