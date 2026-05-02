import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Eye, EyeOff, Loader2, Users, User, Play, Globe } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';

interface TestCase {
  input: string;
  expected: string;
}

interface CustomProblem {
  id?: string;
  title: string;
  description: string;
  difficulty: string;
  starter_code: string;
  test_cases: TestCase[];
  is_public: boolean;
}

const EMPTY_PROBLEM: CustomProblem = {
  title: '', description: '', difficulty: 'Medium',
  starter_code: `import java.util.*;\n\npublic class Solution {\n    public int solve() {\n        // Your code here\n        return 0;\n    }\n}`,
  test_cases: [{ input: '', expected: '' }],
  is_public: false,
};

const CustomProblemCreator = () => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [problems, setProblems] = useState<any[]>([]);
  const [communityProblems, setCommunityProblems] = useState<any[]>([]);
  const [current, setCurrent] = useState<CustomProblem>({ ...EMPTY_PROBLEM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingCommunity, setLoadingCommunity] = useState(false);
  const [activeTab, setActiveTab] = useState<'mine' | 'community'>('mine');

  useEffect(() => {
    if (!authUser) return;
    fetchMyProblems();
    fetchCommunityProblems();
  }, [authUser]);

  const fetchMyProblems = async () => {
    if (!authUser) return;
    const { data } = await supabase.from('custom_problems').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false });
    setProblems(data || []);
    setLoading(false);
  };

  const fetchCommunityProblems = async () => {
    setLoadingCommunity(true);
    const { data } = await supabase.from('custom_problems').select('*').eq('is_public', true).order('created_at', { ascending: false });
    setCommunityProblems(data || []);
    setLoadingCommunity(false);
  };

  const handleSave = async () => {
    if (!authUser || !current.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      if (editingId) {
        await supabase.from('custom_problems').update({
          title: current.title, description: current.description, difficulty: current.difficulty,
          starter_code: current.starter_code, test_cases: current.test_cases as any,
          is_public: current.is_public, updated_at: new Date().toISOString(),
        } as any).eq('id', editingId);
        toast.success('Problem updated');
      } else {
        await supabase.from('custom_problems').insert({
          user_id: authUser.id, title: current.title, description: current.description,
          difficulty: current.difficulty, starter_code: current.starter_code,
          test_cases: current.test_cases as any, is_public: current.is_public,
        } as any);
        toast.success('Problem created');
      }
      fetchMyProblems();
      fetchCommunityProblems();
      setCurrent({ ...EMPTY_PROBLEM });
      setEditingId(null);
    } catch { toast.error('Save failed'); }
    setSaving(false);
  };

  const handleEdit = (p: any) => {
    setCurrent({
      title: p.title, description: p.description, difficulty: p.difficulty,
      starter_code: p.starter_code, test_cases: p.test_cases || [],
      is_public: p.is_public,
    });
    setEditingId(p.id);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('custom_problems').delete().eq('id', id);
    setProblems(prev => prev.filter(p => p.id !== id));
    if (editingId === id) { setCurrent({ ...EMPTY_PROBLEM }); setEditingId(null); }
    toast.success('Deleted');
  };

  const handlePractice = (p: any) => {
    // Navigate to workspace with customMode=true
    const params = new URLSearchParams({
      title: p.title,
      difficulty: p.difficulty,
      customMode: 'true',
      customId: p.id
    });
    navigate(`/problem/${p.id}?${params.toString()}`);
  };

  const addTestCase = () => setCurrent(prev => ({ ...prev, test_cases: [...prev.test_cases, { input: '', expected: '' }] }));
  const removeTestCase = (i: number) => setCurrent(prev => ({ ...prev, test_cases: prev.test_cases.filter((_, idx) => idx !== i) }));
  const updateTestCase = (i: number, field: keyof TestCase, val: string) =>
    setCurrent(prev => ({ ...prev, test_cases: prev.test_cases.map((tc, idx) => idx === i ? { ...tc, [field]: val } : tc) }));

  if (!authUser) return <div className="flex h-screen items-center justify-center bg-background"><p className="text-foreground">Please log in</p></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-panel-border bg-ide-toolbar px-4 py-2 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-7 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back
        </Button>
        <Plus className="h-4 w-4 text-primary" />
        <span className="font-bold text-foreground">Custom Problem Creator</span>
      </div>

      <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">{editingId ? 'Edit Problem' : 'Create New Problem'}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Problem title" value={current.title} onChange={e => setCurrent(p => ({ ...p, title: e.target.value }))} />
              <Textarea placeholder="Problem description (markdown supported)" rows={6} value={current.description} onChange={e => setCurrent(p => ({ ...p, description: e.target.value }))} />
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground">Difficulty</label>
                  <Select value={current.difficulty} onValueChange={v => setCurrent(p => ({ ...p, difficulty: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <Switch checked={current.is_public} onCheckedChange={v => setCurrent(p => ({ ...p, is_public: v }))} id="public-toggle" />
                  <Label htmlFor="public-toggle" className="text-xs">{current.is_public ? <><Eye className="h-3 w-3 inline" /> Public</> : <><EyeOff className="h-3 w-3 inline" /> Private</>}</Label>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Starter Code</label>
                <Textarea className="font-mono text-xs" rows={8} value={current.starter_code} onChange={e => setCurrent(p => ({ ...p, starter_code: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Test Cases</label>
                  <Button size="sm" variant="outline" onClick={addTestCase} className="h-6 text-xs gap-1"><Plus className="h-3 w-3" /> Add</Button>
                </div>
                {current.test_cases.map((tc, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <Input placeholder="Input" className="text-xs font-mono" value={tc.input} onChange={e => updateTestCase(i, 'input', e.target.value)} />
                    <Input placeholder="Expected output" className="text-xs font-mono" value={tc.expected} onChange={e => updateTestCase(i, 'expected', e.target.value)} />
                    <Button size="icon" variant="ghost" onClick={() => removeTestCase(i)} className="h-8 w-8 shrink-0">
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving} className="gap-1">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  {editingId ? 'Update' : 'Create'} Problem
                </Button>
                {editingId && (
                  <Button variant="outline" onClick={() => { setCurrent({ ...EMPTY_PROBLEM }); setEditingId(null); }}>Cancel</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: list */}
        <div className="space-y-4">
          <Card className="h-[640px] flex flex-col">
            <CardHeader className="pb-0">
              <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="mine" className="text-[10px] gap-1.5"><User className="h-3 w-3" /> My List</TabsTrigger>
                  <TabsTrigger value="community" className="text-[10px] gap-1.5"><Globe className="h-3 w-3" /> Public</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden pt-4">
              <ScrollArea className="h-full pr-4">
                <Tabs value={activeTab}>
                  <TabsContent value="mine" className="mt-0 space-y-2">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        <p className="text-[10px] text-muted-foreground">Loading your problems...</p>
                      </div>
                    ) : problems.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-10">No custom problems yet</p>
                    ) : (
                      problems.map((p: any) => (
                        <div key={p.id} className={`group relative p-3 rounded-xl border border-panel-border hover:border-primary/40 bg-card/50 transition-all ${editingId === p.id ? 'border-primary bg-primary/5 shadow-sm' : ''}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0" onClick={() => handleEdit(p)}>
                              <h4 className="text-[13px] font-bold text-foreground truncate group-hover:text-primary transition-colors cursor-pointer">{p.title}</h4>
                              <div className="flex items-center gap-1.5 mt-1">
                                <Badge variant="outline" className="text-[9px] h-4">{p.difficulty}</Badge>
                                {p.is_public && <Badge variant="secondary" className="text-[9px] h-4 text-primary">Public</Badge>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-primary hover:bg-primary/10" onClick={() => handlePractice(p)} title="Practice">
                                <Play className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(p.id)} title="Delete">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>
                  
                  <TabsContent value="community" className="mt-0 space-y-2">
                    {loadingCommunity ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        <p className="text-[10px] text-muted-foreground">Loading community...</p>
                      </div>
                    ) : communityProblems.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-10">No public problems found</p>
                    ) : (
                      communityProblems.map((p: any) => (
                        <div key={p.id} className="group relative p-3 rounded-xl border border-panel-border hover:border-primary/40 bg-card/50 transition-all shadow-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[13px] font-bold text-foreground truncate">{p.title}</h4>
                              <div className="flex items-center gap-1.5 mt-1">
                                <Badge variant="outline" className="text-[9px] h-4">{p.difficulty}</Badge>
                                <span className="text-[9px] text-muted-foreground">By User {p.user_id.slice(0, 4)}</span>
                              </div>
                            </div>
                            <Button size="icon" variant="outline" className="h-8 w-8 text-primary border-primary/20 hover:bg-primary/10 shrink-0" onClick={() => handlePractice(p)} title="Practice">
                              <Play className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CustomProblemCreator;
