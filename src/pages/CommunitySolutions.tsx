import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, ThumbsUp, Code2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';
import { STRIVER_ROADMAP } from '@/lib/striver-roadmap-data';
import { NEETCODE_ROADMAP } from '@/lib/neetcode-roadmap-data';
import { LEETCODE_TOP150_ROADMAP } from '@/lib/leetcode-top150-data';

const ALL_PROBLEMS = [...STRIVER_ROADMAP, ...NEETCODE_ROADMAP, ...LEETCODE_TOP150_ROADMAP].flatMap(t =>
  t.problems.map(p => ({ ...p, topic: t.name }))
);
const PROBLEM_MAP = new Map(ALL_PROBLEMS.map(p => [p.key, p]));

const CommunitySolutions = () => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [solutions, setSolutions] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareForm, setShareForm] = useState({ problem_key: '', code: '', approach: '' });

  useEffect(() => {
    supabase.from('shared_solutions').select('*').order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => { setSolutions(data || []); setLoading(false); });
  }, []);

  const handleShare = async () => {
    if (!authUser || !shareForm.problem_key || !shareForm.code.trim()) {
      toast.error('Fill all fields'); return;
    }
    const { data } = await supabase.from('shared_solutions').insert({
      user_id: authUser.id,
      problem_key: shareForm.problem_key,
      code: shareForm.code,
      approach: shareForm.approach,
    } as any).select().single();
    if (data) {
      setSolutions(prev => [data, ...prev]);
      toast.success('Solution shared!');
      setShareOpen(false);
      setShareForm({ problem_key: '', code: '', approach: '' });
    }
  };

  const handleLike = async (id: string, currentLikes: number) => {
    await supabase.from('shared_solutions').update({ likes: currentLikes + 1 } as any).eq('id', id);
    setSolutions(prev => prev.map(s => s.id === id ? { ...s, likes: currentLikes + 1 } : s));
  };

  const filtered = solutions.filter(s => {
    if (!search) return true;
    const prob = PROBLEM_MAP.get(s.problem_key);
    return prob?.title.toLowerCase().includes(search.toLowerCase()) || s.approach?.toLowerCase().includes(search.toLowerCase());
  });

  if (!authUser) return <div className="flex h-screen items-center justify-center bg-background"><p className="text-foreground">Please log in</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-panel-border bg-ide-toolbar px-4 py-2 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-7 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back
        </Button>
        <Share2 className="h-4 w-4 text-primary" />
        <span className="font-bold text-foreground">Community Solutions</span>
        <div className="ml-auto">
          <Dialog open={shareOpen} onOpenChange={setShareOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 gap-1 text-xs"><Share2 className="h-3 w-3" /> Share Solution</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Share Your Solution</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Problem</label>
                  <select className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground"
                    value={shareForm.problem_key} onChange={e => setShareForm(p => ({ ...p, problem_key: e.target.value }))}>
                    <option value="">Select a problem</option>
                    {ALL_PROBLEMS.slice(0, 100).map(p => (
                      <option key={p.key} value={p.key}>{p.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Approach</label>
                  <Input placeholder="e.g. Two Pointers, O(n)" value={shareForm.approach} onChange={e => setShareForm(p => ({ ...p, approach: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Code</label>
                  <Textarea className="font-mono text-xs" rows={10} value={shareForm.code} onChange={e => setShareForm(p => ({ ...p, code: e.target.value }))} />
                </div>
                <Button onClick={handleShare} className="w-full">Share</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search solutions by problem or approach..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <p className="text-muted-foreground text-center py-10">Loading solutions...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-10">No solutions shared yet. Be the first!</p>
        ) : (
          <div className="space-y-4">
            {filtered.map(s => {
              const prob = PROBLEM_MAP.get(s.problem_key);
              return (
                <Card key={s.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Code2 className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-sm text-foreground">{prob?.title || s.problem_key}</span>
                        {prob && <Badge variant="outline" className="text-[9px]">{prob.difficulty}</Badge>}
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => handleLike(s.id, s.likes || 0)}>
                        <ThumbsUp className="h-3 w-3" /> {s.likes || 0}
                      </Button>
                    </div>
                    {s.approach && <p className="text-xs text-muted-foreground mb-2">💡 {s.approach}</p>}
                    <pre className="bg-secondary/30 rounded p-3 text-xs font-mono overflow-x-auto text-foreground max-h-48 overflow-y-auto">
                      {s.code}
                    </pre>
                    <p className="text-[10px] text-muted-foreground mt-2">{new Date(s.created_at).toLocaleDateString()}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunitySolutions;
