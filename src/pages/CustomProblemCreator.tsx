import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Eye, EyeOff, Loader2, Users, User, Play, Globe, Code2, FileText, Settings2 } from 'lucide-react';
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
    <div className="h-screen bg-background flex flex-col">
      <div className="flex items-center gap-1 sm:gap-3 border-b border-panel-border bg-ide-toolbar px-3 sm:px-4 py-2 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-7 gap-1.5 text-xs font-medium rounded-lg">
          <ArrowLeft className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Back</span>
        </Button>
        <div className="h-4 w-px bg-border shrink-0" />
        <Plus className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-bold truncate">Problem Creator</span>
        <Badge variant="outline" className="ml-auto text-[10px] hidden xs:inline-flex">BETA</Badge>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* Sidebar: list */}
        <div className="w-full lg:w-[350px] border-b lg:border-b-0 lg:border-r border-panel-border bg-ide-sidebar/40 flex flex-col max-h-[300px] lg:max-h-none">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full flex flex-col h-full">
            <div className="p-3 border-b border-panel-border bg-ide-toolbar/30">
              <TabsList className="grid w-full grid-cols-2 rounded-xl bg-secondary/50 p-1">
                <TabsTrigger value="mine" className="text-[10px] gap-2 font-bold rounded-lg data-[state=active]:bg-background"><User className="h-3.5 w-3.5" /> My Problems</TabsTrigger>
                <TabsTrigger value="community" className="text-[10px] gap-2 font-bold rounded-lg data-[state=active]:bg-background"><Globe className="h-3.5 w-3.5" /> Community</TabsTrigger>
              </TabsList>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3">
                <TabsContent value="mine" className="mt-0 space-y-2">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-primary/40" />
                      <p className="text-[10px] text-muted-foreground uppercase font-black">Loading...</p>
                    </div>
                  ) : problems.length === 0 ? (
                    <div className="text-center py-10 px-6 border-2 border-dashed border-panel-border rounded-2xl bg-secondary/10">
                       <Plus className="h-8 w-8 mx-auto text-muted-foreground/20 mb-3" />
                       <p className="text-[11px] font-bold text-muted-foreground">Create your first custom challenge to see it here.</p>
                    </div>
                  ) : (
                    problems.map((p: any) => (
                      <div key={p.id} className={`group relative p-3 rounded-2xl border-2 transition-all cursor-pointer ${editingId === p.id ? 'border-primary bg-primary/5' : 'border-transparent bg-card/40 hover:border-primary/20'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0" onClick={() => handleEdit(p)}>
                            <h4 className="text-[13px] font-black text-foreground truncate group-hover:text-primary transition-colors">{p.title}</h4>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <Badge variant="outline" className={`text-[9px] h-4 font-black ${p.difficulty === 'Easy' ? 'text-emerald-500' : p.difficulty === 'Medium' ? 'text-amber-500' : 'text-rose-500'}`}>{p.difficulty}</Badge>
                              {p.is_public && <Badge className="text-[9px] h-4 bg-primary/10 text-primary border-0 font-black">Public</Badge>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10" onClick={() => handlePractice(p)}>
                              <Play className="h-4 w-4 fill-current" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10" onClick={() => handleDelete(p.id)}>
                              <Trash2 className="h-4 w-4" />
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
                      <Loader2 className="h-5 w-5 animate-spin text-primary/40" />
                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Searching...</p>
                    </div>
                  ) : communityProblems.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground text-center py-10 font-bold">No public problems available yet</p>
                  ) : (
                    communityProblems.map((p: any) => (
                      <div key={p.id} className="group p-3 rounded-2xl border-2 border-transparent bg-card/40 hover:border-primary/20 transition-all cursor-pointer">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[13px] font-black text-foreground truncate group-hover:text-primary transition-colors">{p.title}</h4>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <Badge variant="outline" className="text-[9px] h-4 font-black">{p.difficulty}</Badge>
                              <span className="text-[9px] text-muted-foreground font-mono">By {p.user_id.slice(0, 5)}</span>
                            </div>
                          </div>
                          <Button size="icon" variant="outline" className="h-9 w-9 rounded-xl text-primary border-primary/20 hover:bg-primary/10 shrink-0" onClick={() => handlePractice(p)}>
                            <Play className="h-4 w-4 fill-current" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-auto bg-panel-sidebar/20">
          <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                 <h2 className="text-2xl font-black tracking-tight">{editingId ? 'Refine Challenge' : 'New Challenge'}</h2>
                 <p className="text-xs text-muted-foreground">Design a custom Java problem with automated test validation.</p>
              </div>
              <div className="flex gap-2">
                 {editingId && (
                    <Button variant="ghost" onClick={() => { setCurrent({ ...EMPTY_PROBLEM }); setEditingId(null); }} className="h-10 px-4 text-xs font-black rounded-xl">Cancel</Button>
                 )}
                 <Button onClick={handleSave} disabled={saving} className="h-10 px-6 gap-2 font-black rounded-xl shadow-lg shadow-primary/20">
                   {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                   {editingId ? 'Update' : 'Save'} Challenge
                 </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <Card className="rounded-3xl border-2 border-primary/5 bg-card/50 overflow-hidden">
                <CardHeader className="border-b border-white/5 bg-white/5 py-3">
                   <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                     <FileText className="h-4 w-4 text-primary" /> Core Details
                   </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Title</Label>
                     <Input placeholder="Enter a descriptive title..." className="h-12 rounded-xl bg-secondary/30 border-transparent text-sm font-bold" value={current.title} onChange={e => setCurrent(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Description</Label>
                     <Textarea placeholder="Explain the problem constraints and objective (Markdown supported)..." className="min-h-[150px] rounded-2xl bg-secondary/30 border-transparent text-sm leading-relaxed" value={current.description} onChange={e => setCurrent(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Difficulty</Label>
                      <Select value={current.difficulty} onValueChange={v => setCurrent(p => ({ ...p, difficulty: v }))}>
                        <SelectTrigger className="h-11 rounded-xl bg-secondary/30 border-transparent"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Easy">Easy</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end gap-3 pb-1">
                      <div className="flex-1 flex items-center justify-between h-11 rounded-xl bg-secondary/30 px-4 border border-white/5">
                        <Label htmlFor="public-toggle" className="text-[10px] font-black uppercase flex items-center gap-2">
                           {current.is_public ? <Globe className="h-3.5 w-3.5 text-primary" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                           {current.is_public ? 'Public Challenge' : 'Private Save'}
                        </Label>
                        <Switch checked={current.is_public} onCheckedChange={v => setCurrent(p => ({ ...p, is_public: v }))} id="public-toggle" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-2 border-primary/5 bg-card/50 overflow-hidden">
                <CardHeader className="border-b border-white/5 bg-white/5 py-3">
                   <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                     <Code2 className="h-4 w-4 text-primary" /> Java Starter Template
                   </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <Textarea className="font-mono text-xs min-h-[250px] rounded-2xl bg-secondary/30 border-transparent" value={current.starter_code} onChange={e => setCurrent(p => ({ ...p, starter_code: e.target.value }))} />
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-2 border-primary/5 bg-card/50 overflow-hidden">
                <CardHeader className="border-b border-white/5 bg-white/5 py-3 flex flex-row items-center justify-between">
                   <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                     <Settings2 className="h-4 w-4 text-primary" /> Automated Test Cases
                   </CardTitle>
                   <Button size="sm" variant="outline" onClick={addTestCase} className="h-7 text-[10px] gap-1.5 font-black border-primary/20 text-primary rounded-lg"><Plus className="h-3.5 w-3.5" /> Add New</Button>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {current.test_cases.map((tc, i) => (
                    <div key={i} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center p-4 rounded-2xl bg-secondary/20 border border-white/5">
                      <div className="flex-1 space-y-1.5 w-full">
                         <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Input</Label>
                         <Input placeholder="Method arguments..." className="h-10 rounded-xl bg-secondary/50 border-transparent text-xs font-mono" value={tc.input} onChange={e => updateTestCase(i, 'input', e.target.value)} />
                      </div>
                      <div className="flex-1 space-y-1.5 w-full">
                         <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Expected Output</Label>
                         <Input placeholder="Return value..." className="h-10 rounded-xl bg-secondary/50 border-transparent text-xs font-mono" value={tc.expected} onChange={e => updateTestCase(i, 'expected', e.target.value)} />
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => removeTestCase(i)} className="h-10 w-10 shrink-0 self-end sm:self-center hover:bg-destructive/10 rounded-xl">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomProblemCreator;
