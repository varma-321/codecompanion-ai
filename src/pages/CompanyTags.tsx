import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { STRIVER_ROADMAP, getDifficultyBg } from '@/lib/striver-roadmap-data';
import { NEETCODE_ROADMAP } from '@/lib/neetcode-roadmap-data';
import { LEETCODE_TOP150_ROADMAP } from '@/lib/leetcode-top150-data';

const ALL_PROBLEMS = [...STRIVER_ROADMAP, ...NEETCODE_ROADMAP, ...LEETCODE_TOP150_ROADMAP].flatMap(t =>
  t.problems.map(p => ({ ...p, topic: t.name }))
);

// Simulated company tags mapping common DSA problems to companies
const COMPANY_TAGS: Record<string, string[]> = {
  'Google': ['two-sum', 'median-two-sorted', 'merge-intervals', 'lru-cache', 'word-ladder', 'trapping-rain', 'longest-substring', 'serialize-deserialize-bt', 'course-schedule', 'number-of-islands'],
  'Amazon': ['two-sum', 'add-two-numbers', 'lru-cache', 'merge-intervals', 'number-of-islands', 'min-window-substring', 'word-break', 'product-except-self', 'merge-k-sorted', 'rotate-image'],
  'Meta': ['two-sum', 'add-two-numbers', 'longest-substring', 'valid-parentheses', 'merge-intervals', 'subarray-sum-k', 'binary-tree-right-side', 'random-pick-index', 'alien-dictionary', 'vertical-order-bt'],
  'Microsoft': ['two-sum', 'reverse-linked-list', 'lru-cache', 'merge-intervals', 'serialize-deserialize-bt', 'product-except-self', 'spiral-matrix', 'number-of-islands', 'word-search', 'group-anagrams'],
  'Apple': ['two-sum', 'valid-parentheses', 'merge-two-sorted', 'best-time-buy-sell', 'longest-common-prefix', 'roman-to-integer', 'three-sum', 'container-most-water', 'letter-combinations', 'number-of-islands'],
  'Netflix': ['lru-cache', 'merge-intervals', 'design-twitter', 'top-k-frequent', 'find-median-stream', 'word-ladder', 'course-schedule', 'clone-graph', 'graph-valid-tree', 'longest-substring'],
  'Uber': ['two-sum', 'merge-intervals', 'word-break', 'number-of-islands', 'course-schedule', 'alien-dictionary', 'serialize-deserialize-bt', 'design-hit-counter', 'lru-cache', 'longest-substring'],
  'Bloomberg': ['two-sum', 'valid-parentheses', 'merge-intervals', 'lru-cache', 'flatten-nested-list', 'decode-string', 'meeting-rooms', 'moving-average', 'max-stack', 'candy'],
  'Goldman Sachs': ['two-sum', 'trapping-rain', 'median-two-sorted', 'merge-k-sorted', 'lru-cache', 'number-of-islands', 'word-search', 'coin-change', 'edit-distance', 'longest-increasing'],
  'Adobe': ['two-sum', 'reverse-linked-list', 'merge-two-sorted', 'valid-parentheses', 'climbing-stairs', 'best-time-buy-sell', 'maximum-subarray', 'binary-search', 'search-rotated', 'min-path-sum'],
};

const Compan = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const companies = Object.keys(COMPANY_TAGS);

  const matchedProblems = useMemo(() => {
    if (!selected) return [];
    const keys = COMPANY_TAGS[selected] || [];
    return keys.map(k => ALL_PROBLEMS.find(p => p.key === k)).filter(Boolean);
  }, [selected]);

  const filteredCompanies = companies.filter(c => c.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-panel-border bg-ide-toolbar px-4 py-2 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-7 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back
        </Button>
        <Building2 className="h-4 w-4 text-primary" />
        <span className="font-bold text-foreground">Company-Wise Problems</span>
      </div>

      <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search company..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <ScrollArea className="h-[600px]">
            <div className="space-y-1">
              {filteredCompanies.map(c => (
                <button key={c} onClick={() => setSelected(c)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between transition-colors ${selected === c ? 'bg-primary/10 text-primary border border-primary/20' : 'hover:bg-secondary/50 text-foreground'}`}>
                  <span className="font-medium">{c}</span>
                  <Badge variant="outline" className="text-[10px]">{COMPANY_TAGS[c].length}</Badge>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="lg:col-span-2">
          {!selected ? (
            <div className="flex items-center justify-center h-[400px] text-muted-foreground">
              <p>Select a company to see frequently asked problems</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">{selected} — Top Problems</h2>
              <div className="space-y-2">
                {matchedProblems.map((p: any) => (
                  <Card key={p.key} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate(`/problem/${p.key}`)}>
                    <CardContent className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{p.title}</p>
                        <p className="text-xs text-muted-foreground">{p.topic}</p>
                      </div>
                      <Badge className={`text-[10px] ${getDifficultyBg(p.difficulty)}`}>{p.difficulty}</Badge>
                    </CardContent>
                  </Card>
                ))}
                {matchedProblems.length === 0 && <p className="text-muted-foreground text-sm">No matching problems found in current modules.</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Compan;
