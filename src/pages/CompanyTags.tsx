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

// Build a title-to-problem lookup (lowercase, deduped by first match)
const TITLE_LOOKUP = new Map<string, typeof ALL_PROBLEMS[0]>();
ALL_PROBLEMS.forEach(p => {
  const normalized = p.title.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!TITLE_LOOKUP.has(normalized)) TITLE_LOOKUP.set(normalized, p);
});

// Helper: convert a slug like 'two-sum' to a search-friendly form
function slugToSearchTerms(slug: string): string[] {
  return slug.split('-').filter(Boolean);
}

function findProblemBySlug(slug: string): typeof ALL_PROBLEMS[0] | null {
  // Try exact slug-to-normalized match
  const normalized = slug.replace(/-/g, '');
  if (TITLE_LOOKUP.has(normalized)) return TITLE_LOOKUP.get(normalized)!;

  // Try partial title matching
  const terms = slugToSearchTerms(slug);
  for (const [key, prob] of TITLE_LOOKUP) {
    if (terms.every(t => key.includes(t))) return prob;
  }
  return null;
}

// Simulated company tags mapping common DSA problems to companies
const COMPANY_TAGS: Record<string, string[]> = {
  'Google': ['two-sum', 'median-two-sorted', 'merge-intervals', 'lru-cache', 'word-ladder', 'trapping-rain', 'longest-substring', 'serialize-deserialize-bt', 'course-schedule', 'number-of-islands', 'valid-parentheses', 'container-most-water', 'three-sum', 'group-anagrams', 'product-except-self', 'top-k-frequent', 'coin-change', 'climbing-stairs', 'maximum-subarray', 'best-time-buy-sell', 'binary-search', 'search-rotated', 'min-window-substring', 'word-break', 'longest-increasing', 'edit-distance', 'kth-largest', 'rotate-image', 'spiral-matrix', 'set-matrix-zeroes'],
  'Amazon': ['two-sum', 'add-two-numbers', 'lru-cache', 'merge-intervals', 'number-of-islands', 'min-window-substring', 'word-break', 'product-except-self', 'merge-k-sorted', 'rotate-image', 'trapping-rain', 'longest-substring', 'valid-parentheses', 'three-sum', 'group-anagrams', 'top-k-frequent', 'coin-change', 'climbing-stairs', 'maximum-subarray', 'best-time-buy-sell', 'binary-search', 'search-rotated', 'container-most-water', 'course-schedule', 'serialize-deserialize-bt', 'kth-largest', 'spiral-matrix', 'set-matrix-zeroes', 'reverse-linked-list', 'merge-two-sorted'],
  'Meta': ['two-sum', 'add-two-numbers', 'longest-substring', 'valid-parentheses', 'merge-intervals', 'subarray-sum-k', 'binary-tree-right-side', 'random-pick-index', 'alien-dictionary', 'vertical-order-bt', 'product-except-self', 'three-sum', 'group-anagrams', 'top-k-frequent', 'coin-change', 'number-of-islands', 'word-break', 'container-most-water', 'trapping-rain', 'lru-cache', 'merge-k-sorted', 'best-time-buy-sell', 'maximum-subarray', 'reverse-linked-list', 'climbing-stairs', 'search-rotated', 'binary-search', 'serialize-deserialize-bt', 'course-schedule', 'min-window-substring'],
  'Microsoft': ['two-sum', 'reverse-linked-list', 'lru-cache', 'merge-intervals', 'serialize-deserialize-bt', 'product-except-self', 'spiral-matrix', 'number-of-islands', 'word-search', 'group-anagrams', 'three-sum', 'valid-parentheses', 'trapping-rain', 'longest-substring', 'top-k-frequent', 'coin-change', 'climbing-stairs', 'maximum-subarray', 'best-time-buy-sell', 'binary-search', 'search-rotated', 'container-most-water', 'course-schedule', 'merge-two-sorted', 'add-two-numbers', 'rotate-image', 'set-matrix-zeroes', 'min-window-substring', 'word-break', 'kth-largest'],
  'Apple': ['two-sum', 'valid-parentheses', 'merge-two-sorted', 'best-time-buy-sell', 'longest-common-prefix', 'roman-to-integer', 'three-sum', 'container-most-water', 'letter-combinations', 'number-of-islands', 'reverse-linked-list', 'climbing-stairs', 'maximum-subarray', 'binary-search', 'search-rotated', 'group-anagrams', 'product-except-self', 'top-k-frequent', 'coin-change', 'merge-intervals', 'lru-cache', 'longest-substring', 'trapping-rain', 'spiral-matrix', 'rotate-image'],
  'Netflix': ['lru-cache', 'merge-intervals', 'design-twitter', 'top-k-frequent', 'find-median-stream', 'word-ladder', 'course-schedule', 'clone-graph', 'graph-valid-tree', 'longest-substring', 'two-sum', 'three-sum', 'number-of-islands', 'serialize-deserialize-bt', 'coin-change', 'longest-increasing', 'product-except-self', 'group-anagrams', 'container-most-water', 'trapping-rain'],
  'Uber': ['two-sum', 'merge-intervals', 'word-break', 'number-of-islands', 'course-schedule', 'alien-dictionary', 'serialize-deserialize-bt', 'design-hit-counter', 'lru-cache', 'longest-substring', 'three-sum', 'valid-parentheses', 'trapping-rain', 'group-anagrams', 'product-except-self', 'top-k-frequent', 'coin-change', 'best-time-buy-sell', 'maximum-subarray', 'binary-search', 'search-rotated', 'container-most-water', 'reverse-linked-list', 'climbing-stairs', 'spiral-matrix'],
  'Bloomberg': ['two-sum', 'valid-parentheses', 'merge-intervals', 'lru-cache', 'flatten-nested-list', 'decode-string', 'meeting-rooms', 'moving-average', 'max-stack', 'candy', 'three-sum', 'group-anagrams', 'top-k-frequent', 'coin-change', 'number-of-islands', 'word-break', 'product-except-self', 'best-time-buy-sell', 'maximum-subarray', 'reverse-linked-list', 'merge-two-sorted', 'climbing-stairs', 'binary-search', 'trapping-rain', 'longest-substring'],
  'Goldman Sachs': ['two-sum', 'trapping-rain', 'median-two-sorted', 'merge-k-sorted', 'lru-cache', 'number-of-islands', 'word-search', 'coin-change', 'edit-distance', 'longest-increasing', 'three-sum', 'valid-parentheses', 'group-anagrams', 'product-except-self', 'top-k-frequent', 'best-time-buy-sell', 'maximum-subarray', 'binary-search', 'search-rotated', 'container-most-water', 'merge-intervals', 'reverse-linked-list', 'climbing-stairs', 'longest-substring', 'spiral-matrix'],
  'Adobe': ['two-sum', 'reverse-linked-list', 'merge-two-sorted', 'valid-parentheses', 'climbing-stairs', 'best-time-buy-sell', 'maximum-subarray', 'binary-search', 'search-rotated', 'min-path-sum', 'three-sum', 'group-anagrams', 'product-except-self', 'top-k-frequent', 'coin-change', 'number-of-islands', 'longest-substring', 'container-most-water', 'trapping-rain', 'merge-intervals', 'lru-cache', 'word-break', 'rotate-image', 'spiral-matrix', 'set-matrix-zeroes'],
  'Oracle': ['two-sum', 'reverse-linked-list', 'merge-two-sorted', 'valid-parentheses', 'climbing-stairs', 'best-time-buy-sell', 'maximum-subarray', 'binary-search', 'search-rotated', 'group-anagrams', 'three-sum', 'product-except-self', 'coin-change', 'number-of-islands', 'longest-substring', 'merge-intervals', 'lru-cache', 'top-k-frequent', 'word-break', 'spiral-matrix'],
  'Salesforce': ['two-sum', 'three-sum', 'valid-parentheses', 'merge-intervals', 'number-of-islands', 'group-anagrams', 'product-except-self', 'top-k-frequent', 'best-time-buy-sell', 'maximum-subarray', 'coin-change', 'climbing-stairs', 'binary-search', 'reverse-linked-list', 'longest-substring', 'container-most-water', 'lru-cache', 'word-break'],
  'Twitter / X': ['two-sum', 'lru-cache', 'design-twitter', 'merge-intervals', 'top-k-frequent', 'three-sum', 'number-of-islands', 'longest-substring', 'valid-parentheses', 'group-anagrams', 'product-except-self', 'trapping-rain', 'coin-change', 'course-schedule', 'serialize-deserialize-bt', 'best-time-buy-sell'],
  'LinkedIn': ['two-sum', 'merge-intervals', 'number-of-islands', 'product-except-self', 'serialize-deserialize-bt', 'three-sum', 'valid-parentheses', 'group-anagrams', 'top-k-frequent', 'coin-change', 'best-time-buy-sell', 'maximum-subarray', 'lru-cache', 'longest-substring', 'binary-search', 'search-rotated', 'reverse-linked-list', 'word-break'],
  'Spotify': ['two-sum', 'lru-cache', 'top-k-frequent', 'merge-intervals', 'longest-substring', 'three-sum', 'group-anagrams', 'coin-change', 'number-of-islands', 'valid-parentheses', 'product-except-self', 'best-time-buy-sell', 'climbing-stairs', 'binary-search', 'maximum-subarray'],
  'Stripe': ['two-sum', 'valid-parentheses', 'merge-intervals', 'lru-cache', 'three-sum', 'group-anagrams', 'product-except-self', 'coin-change', 'top-k-frequent', 'longest-substring', 'number-of-islands', 'best-time-buy-sell', 'maximum-subarray', 'binary-search', 'reverse-linked-list', 'word-break', 'container-most-water'],
  'Airbnb': ['two-sum', 'merge-intervals', 'alien-dictionary', 'number-of-islands', 'lru-cache', 'three-sum', 'valid-parentheses', 'group-anagrams', 'top-k-frequent', 'coin-change', 'product-except-self', 'best-time-buy-sell', 'longest-substring', 'word-break', 'serialize-deserialize-bt', 'course-schedule'],
  'TikTok / ByteDance': ['two-sum', 'lru-cache', 'merge-intervals', 'trapping-rain', 'longest-substring', 'three-sum', 'number-of-islands', 'valid-parentheses', 'group-anagrams', 'product-except-self', 'top-k-frequent', 'coin-change', 'best-time-buy-sell', 'maximum-subarray', 'binary-search', 'search-rotated', 'container-most-water', 'reverse-linked-list', 'merge-k-sorted', 'word-break', 'course-schedule', 'serialize-deserialize-bt', 'spiral-matrix', 'rotate-image', 'longest-increasing'],
  'Nvidia': ['two-sum', 'binary-search', 'merge-intervals', 'number-of-islands', 'three-sum', 'valid-parentheses', 'climbing-stairs', 'maximum-subarray', 'best-time-buy-sell', 'reverse-linked-list', 'group-anagrams', 'coin-change', 'product-except-self', 'lru-cache', 'longest-substring'],
  'Samsung': ['two-sum', 'reverse-linked-list', 'merge-two-sorted', 'climbing-stairs', 'binary-search', 'number-of-islands', 'three-sum', 'valid-parentheses', 'best-time-buy-sell', 'maximum-subarray', 'group-anagrams', 'coin-change', 'product-except-self', 'top-k-frequent', 'longest-substring', 'merge-intervals', 'search-rotated', 'rotate-image'],
};

const Compan = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const companies = Object.keys(COMPANY_TAGS);

  const matchedProblems = useMemo(() => {
    if (!selected) return [];
    const slugs = COMPANY_TAGS[selected] || [];
    return slugs.map(slug => findProblemBySlug(slug)).filter(Boolean) as typeof ALL_PROBLEMS;
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
