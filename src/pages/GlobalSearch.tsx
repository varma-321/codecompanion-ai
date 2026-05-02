import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';
import { STRIVER_ROADMAP } from '@/lib/striver-roadmap-data';
import { NEETCODE_ROADMAP } from '@/lib/neetcode-roadmap-data';
import { LEETCODE_TOP150_ROADMAP } from '@/lib/leetcode-top150-data';

const STRIVER_PROBLEMS   = STRIVER_ROADMAP.flatMap(t => t.problems.map(p => ({ ...p, topic: t.name, module: 'Striver' as const })));
const NEETCODE_PROBLEMS  = NEETCODE_ROADMAP.flatMap(t => t.problems.map(p => ({ ...p, topic: t.name, module: 'NeetCode' as const })));
const LEETCODE_PROBLEMS  = LEETCODE_TOP150_ROADMAP.flatMap(t => t.problems.map(p => ({ ...p, topic: t.name, module: 'LeetCode 150' as const })));
const ALL_PROBLEMS = [...STRIVER_PROBLEMS, ...NEETCODE_PROBLEMS, ...LEETCODE_PROBLEMS];
const ALL_TOPICS = [...new Set(ALL_PROBLEMS.map(p => p.topic))].sort();

const MODULE_COLORS: Record<string, string> = {
  'Striver':      'bg-orange-500/15 text-orange-400 border-orange-500/30',
  'NeetCode':     'bg-blue-500/15  text-blue-400  border-blue-500/30',
  'LeetCode 150': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
};

const GlobalSearch = () => {
  const navigate = useNavigate();
  const { authUser } = useUser();
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState<string>('all');
  const [module, setModule] = useState<string>('all');
  const [topic, setTopic] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [solvedKeys, setSolvedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authUser) return;
    supabase.from('user_problem_progress').select('problem_key, solved').eq('user_id', authUser.id).eq('solved', true)
      .then(({ data }) => {
        setSolvedKeys(new Set((data || []).map(d => d.problem_key)));
      });
  }, [authUser]);

  const availableTopics = useMemo(() => {
    const base = module === 'all' ? ALL_PROBLEMS : ALL_PROBLEMS.filter(p => p.module === module);
    return [...new Set(base.map(p => p.topic))].sort();
  }, [module]);

  const results = useMemo(() => {
    let filtered = ALL_PROBLEMS;
    if (query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.topic.toLowerCase().includes(q) ||
        p.module.toLowerCase().includes(q) ||
        p.key.toLowerCase().includes(q)
      );
    }
    if (module !== 'all') filtered = filtered.filter(p => p.module === module);
    if (difficulty !== 'all') filtered = filtered.filter(p => p.difficulty === difficulty);
    if (topic !== 'all') filtered = filtered.filter(p => p.topic === topic);
    if (status === 'solved') filtered = filtered.filter(p => solvedKeys.has(p.key));
    if (status === 'unsolved') filtered = filtered.filter(p => !solvedKeys.has(p.key));
    return filtered.slice(0, 100);
  }, [query, module, difficulty, topic, status, solvedKeys]);

  const clearFilters = () => { setQuery(''); setDifficulty('all'); setModule('all'); setTopic('all'); setStatus('all'); };
  const hasFilters = query || difficulty !== 'all' || module !== 'all' || topic !== 'all' || status !== 'all';

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex items-center gap-2 sm:gap-3 border-b border-border bg-card px-3 sm:px-5 py-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-8 gap-1.5 text-xs font-medium rounded-lg shrink-0">
          <ArrowLeft className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Modules</span>
        </Button>
        <div className="h-4 w-px bg-border" />
        <Search className="h-4 w-4 text-foreground" />
        <span className="text-sm font-semibold tracking-tight">Problem Search</span>
        <Badge variant="secondary" className="ml-auto text-xs">{ALL_PROBLEMS.length} problems</Badge>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
          {/* Search + Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search problems by title or topic..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-10 h-10"
                autoFocus
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
              <Select value={module} onValueChange={(v) => { setModule(v); setTopic('all'); }}>
                <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All Modules" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  <SelectItem value="Striver">Striver</SelectItem>
                  <SelectItem value="NeetCode">NeetCode</SelectItem>
                  <SelectItem value="LeetCode 150">LeetCode 150</SelectItem>
                </SelectContent>
              </Select>
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="All Topics" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Topics</SelectItem>
                  {availableTopics.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="solved">Solved</SelectItem>
                  <SelectItem value="unsolved">Unsolved</SelectItem>
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={clearFilters}>
                  <X className="h-3 w-3" /> Clear
                </Button>
              )}
            </div>
          </div>

          {/* Results count */}
          <p className="text-xs text-muted-foreground">{results.length} result{results.length !== 1 ? 's' : ''}{results.length === 100 ? ' (showing first 100)' : ''}</p>

          {/* Results */}
          <div className="space-y-1.5">
            {results.map(p => {
              const solved = solvedKeys.has(p.key);
              return (
                <Card key={`${p.module}-${p.key}`} className="border-border hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/problem/${p.key}`)}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${solved ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-wider shrink-0 ${MODULE_COLORS[p.module] ?? 'bg-secondary text-foreground border-border'}`}>
                          {p.module}
                        </span>
                        <span className="text-sm font-medium text-foreground truncate">{p.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="truncate">{p.topic}</span>
                        <span className="shrink-0 opacity-40">·</span>
                        <span className="shrink-0 font-mono opacity-60">{p.key}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${
                      p.difficulty === 'Easy' ? 'text-green-500' :
                      p.difficulty === 'Medium' ? 'text-yellow-500' : 'text-red-500'
                    }`}>{p.difficulty}</Badge>
                    {solved && <Badge variant="secondary" className="text-[10px] shrink-0">✓</Badge>}
                  </CardContent>
                </Card>
              );
            })}
            {results.length === 0 && (
              <div className="text-center py-12 text-sm text-muted-foreground">No problems match your search.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
