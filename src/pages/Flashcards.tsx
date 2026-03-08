import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, ChevronLeft, ChevronRight, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Flashcard {
  front: string;
  back: string;
  category: string;
  difficulty: string;
}

const FLASHCARDS: Flashcard[] = [
  { front: 'What is the time complexity of Binary Search?', back: 'O(log n) — Divides search space in half each step. Requires sorted input.', category: 'Search', difficulty: 'Easy' },
  { front: 'When to use Sliding Window?', back: 'Use when finding subarrays/substrings with a constraint (max sum, distinct chars, etc.). Maintains a window that expands/shrinks.', category: 'Patterns', difficulty: 'Medium' },
  { front: 'Difference between BFS and DFS?', back: 'BFS: Level-order, uses Queue, finds shortest path in unweighted graphs. O(V+E).\nDFS: Goes deep first, uses Stack/recursion, good for connectivity and cycles.', category: 'Graphs', difficulty: 'Easy' },
  { front: 'What is Dynamic Programming?', back: 'Optimization technique that solves overlapping subproblems by storing results (memoization/tabulation). Key: Optimal substructure + Overlapping subproblems.', category: 'DP', difficulty: 'Medium' },
  { front: 'How does a HashMap work internally?', back: 'Uses hash function → bucket index. Handles collisions via chaining (LinkedList) or open addressing. Avg O(1) get/put, worst O(n).', category: 'Data Structures', difficulty: 'Medium' },
  { front: 'What is the Two Pointers technique?', back: 'Use two indices moving toward each other (or same direction) to solve problems in O(n). Common: sorted arrays, palindromes, pair sums.', category: 'Patterns', difficulty: 'Easy' },
  { front: 'Explain Kadane\'s Algorithm', back: 'Finds maximum subarray sum in O(n). Track currentMax = max(nums[i], currentMax + nums[i]) and globalMax at each step.', category: 'DP', difficulty: 'Easy' },
  { front: 'When to use a Monotonic Stack?', back: 'Finding next greater/smaller element, stock span, largest rectangle in histogram. Maintains increasing/decreasing order.', category: 'Patterns', difficulty: 'Hard' },
  { front: 'What is Union-Find (Disjoint Set)?', back: 'Data structure for tracking connected components. Operations: find(x), union(x,y). With path compression + union by rank: near O(1) amortized.', category: 'Data Structures', difficulty: 'Hard' },
  { front: 'Topological Sort use cases?', back: 'Ordering tasks with dependencies (DAG). Two methods: Kahn\'s (BFS with in-degree) or DFS-based. O(V+E). Detects cycles if not all nodes processed.', category: 'Graphs', difficulty: 'Hard' },
  { front: 'What is a Trie?', back: 'Prefix tree for efficient string storage/search. Each node = character. O(L) insert/search where L = word length. Used for autocomplete, spell check.', category: 'Data Structures', difficulty: 'Medium' },
  { front: 'Merge Sort vs Quick Sort?', back: 'Merge: O(n log n) always, stable, O(n) space.\nQuick: O(n log n) avg, O(n²) worst, in-place, not stable. Quick is faster in practice due to cache locality.', category: 'Sorting', difficulty: 'Easy' },
  { front: 'What is Backtracking?', back: 'Build solution incrementally, abandon (backtrack) when constraints violated. Used for: permutations, combinations, N-Queens, Sudoku. Often exponential time.', category: 'Patterns', difficulty: 'Medium' },
  { front: 'Explain Dijkstra\'s Algorithm', back: 'Shortest path from single source in weighted graph (non-negative edges). Uses min-heap/priority queue. O((V+E) log V). Greedy approach.', category: 'Graphs', difficulty: 'Hard' },
  { front: 'What is a Segment Tree?', back: 'Tree for range queries (sum, min, max) with point updates. Build O(n), query O(log n), update O(log n). Used in competitive programming.', category: 'Data Structures', difficulty: 'Hard' },
  { front: 'When to use Greedy vs DP?', back: 'Greedy: Local optimal → global optimal (greedy choice property). Faster.\nDP: When greedy fails, need to consider all subproblems. Check if greedy works first.', category: 'Patterns', difficulty: 'Medium' },
  { front: 'Explain the Floyd Cycle Detection', back: 'Slow pointer (1 step) + Fast pointer (2 steps). If cycle exists, they meet. To find start: reset one to head, move both 1 step until they meet again.', category: 'Linked List', difficulty: 'Medium' },
  { front: 'What is Bit Manipulation useful for?', back: 'XOR: find single number, swap without temp. AND/OR: check/set bits. Shift: multiply/divide by 2. Common: n & (n-1) removes lowest set bit.', category: 'Patterns', difficulty: 'Medium' },
];

const categories = ['All', ...new Set(FLASHCARDS.map(f => f.category))];

const Flashcards = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState('All');
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffled, setShuffled] = useState<Flashcard[]>([...FLASHCARDS]);

  const filtered = category === 'All' ? shuffled : shuffled.filter(f => f.category === category);
  const current = filtered[index % Math.max(filtered.length, 1)];

  const handleShuffle = useCallback(() => {
    setShuffled(prev => [...prev].sort(() => Math.random() - 0.5));
    setIndex(0);
    setFlipped(false);
  }, []);

  const diffColor: Record<string, string> = {
    Easy: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    Medium: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    Hard: 'bg-red-500/10 text-red-600 border-red-500/20',
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-panel-border bg-ide-toolbar px-4 py-2 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-7 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back
        </Button>
        <span className="font-bold text-foreground">🃏 DSA Flashcards</span>
        <Badge variant="outline" className="text-[10px]">{filtered.length} cards</Badge>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Select value={category} onValueChange={v => { setCategory(v); setIndex(0); setFlipped(false); }}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleShuffle} className="gap-1"><Shuffle className="h-3 w-3" /> Shuffle</Button>
          <span className="text-sm text-muted-foreground ml-auto">{Math.min(index + 1, filtered.length)} / {filtered.length}</span>
        </div>

        {current ? (
          <div className="perspective-1000" onClick={() => setFlipped(!flipped)} style={{ cursor: 'pointer' }}>
            <Card className={`min-h-[300px] transition-all duration-500 ${flipped ? 'bg-primary/5' : ''}`}>
              <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[300px] text-center">
                <div className="flex gap-2 mb-4">
                  <Badge variant="outline" className="text-[10px]">{current.category}</Badge>
                  <Badge variant="outline" className={`text-[10px] ${diffColor[current.difficulty] || ''}`}>{current.difficulty}</Badge>
                </div>
                {!flipped ? (
                  <>
                    <p className="text-lg font-semibold text-foreground mb-4">{current.front}</p>
                    <p className="text-xs text-muted-foreground">Click to reveal answer</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-2">Answer:</p>
                    <p className="text-foreground whitespace-pre-line leading-relaxed">{current.back}</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-10">No cards in this category</p>
        )}

        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" size="sm" onClick={() => { setIndex(Math.max(0, index - 1)); setFlipped(false); }} disabled={index === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setFlipped(false)}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setIndex(Math.min(filtered.length - 1, index + 1)); setFlipped(false); }} disabled={index >= filtered.length - 1}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Flashcards;
