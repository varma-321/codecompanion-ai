import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, ChevronLeft, ChevronRight, Shuffle, ThumbsUp, ThumbsDown, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Flashcard {
  front: string;
  back: string;
  category: string;
  difficulty: string;
}

const FLASHCARDS: Flashcard[] = [
  { front: 'What is the time complexity of Binary Search?', back: 'O(log n) — Divides search space in half each step. Requires sorted input. Use mid = lo + (hi-lo)/2 to avoid overflow.', category: 'Search', difficulty: 'Easy' },
  { front: 'When to use Sliding Window?', back: 'Use when finding subarrays/substrings with a constraint (max sum, distinct chars, etc.). Maintains a window that expands/shrinks. Two types: fixed-size and variable-size.', category: 'Patterns', difficulty: 'Medium' },
  { front: 'Difference between BFS and DFS?', back: 'BFS: Level-order, uses Queue, finds shortest path in unweighted graphs. O(V+E).\nDFS: Goes deep first, uses Stack/recursion, good for connectivity and cycles. O(V+E).', category: 'Graphs', difficulty: 'Easy' },
  { front: 'What is Dynamic Programming?', back: 'Optimization technique that solves overlapping subproblems by storing results (memoization/tabulation). Key: Optimal substructure + Overlapping subproblems. Start by defining state, then transition.', category: 'DP', difficulty: 'Medium' },
  { front: 'How does a HashMap work internally?', back: 'Uses hash function → bucket index. Handles collisions via chaining (LinkedList) or open addressing. Avg O(1) get/put, worst O(n). Java 8+: converts to TreeMap at 8 entries per bucket.', category: 'Data Structures', difficulty: 'Medium' },
  { front: 'What is the Two Pointers technique?', back: 'Use two indices moving toward each other (or same direction) to solve problems in O(n). Common: sorted arrays, palindromes, pair sums, removing duplicates in-place.', category: 'Patterns', difficulty: 'Easy' },
  { front: "Explain Kadane's Algorithm", back: "Finds maximum subarray sum in O(n). Track currentMax = max(nums[i], currentMax + nums[i]) and globalMax at each step. Can be extended to track start/end indices.", category: 'DP', difficulty: 'Easy' },
  { front: 'When to use a Monotonic Stack?', back: 'Finding next greater/smaller element, stock span, largest rectangle in histogram, daily temperatures. Maintains increasing/decreasing order. Each element pushed/popped once → O(n).', category: 'Patterns', difficulty: 'Hard' },
  { front: 'What is Union-Find (Disjoint Set)?', back: 'Data structure for tracking connected components. Operations: find(x), union(x,y). With path compression + union by rank: nearly O(1) amortized (inverse Ackermann). Used in Kruskal\'s MST.', category: 'Data Structures', difficulty: 'Hard' },
  { front: 'Topological Sort use cases?', back: 'Ordering tasks with dependencies (DAG only). Two methods: Kahn\'s (BFS with in-degree) or DFS-based (post-order). O(V+E). Detects cycles if not all nodes processed. Common in build systems, course scheduling.', category: 'Graphs', difficulty: 'Hard' },
  { front: 'What is a Trie?', back: 'Prefix tree for efficient string storage/search. Each node = character + children map. O(L) insert/search where L = word length. Used for autocomplete, spell check, IP routing (longest prefix match).', category: 'Data Structures', difficulty: 'Medium' },
  { front: 'Merge Sort vs Quick Sort?', back: 'Merge: O(n log n) always, stable, O(n) space. Good for linked lists.\nQuick: O(n log n) avg, O(n²) worst, in-place, not stable. Faster in practice (cache locality). Use randomized pivot.', category: 'Sorting', difficulty: 'Easy' },
  { front: 'What is Backtracking?', back: 'Build solution incrementally, abandon (backtrack) when constraints violated. Used for: permutations, combinations, N-Queens, Sudoku. Prune early for efficiency. Often exponential but pruning helps.', category: 'Patterns', difficulty: 'Medium' },
  { front: "Explain Dijkstra's Algorithm", back: "Shortest path from single source in weighted graph (non-negative edges only). Uses min-heap. O((V+E) log V). For negative edges use Bellman-Ford O(VE). Greedy approach.", category: 'Graphs', difficulty: 'Hard' },
  { front: 'What is a Segment Tree?', back: 'Tree for range queries (sum, min, max) with point/range updates. Build O(n), query O(log n), update O(log n). Lazy propagation for range updates. Used in competitive programming.', category: 'Data Structures', difficulty: 'Hard' },
  { front: 'When to use Greedy vs DP?', back: 'Greedy: Local optimal → global optimal (greedy choice property). Faster but harder to prove.\nDP: When greedy fails, need to consider all subproblems. Always try greedy first, prove or disprove.', category: 'Patterns', difficulty: 'Medium' },
  { front: 'Explain the Floyd Cycle Detection', back: "Slow pointer (1 step) + Fast pointer (2 steps). If cycle exists, they meet. To find cycle start: reset one to head, move both 1 step — they meet at cycle start. O(n) time, O(1) space.", category: 'Linked List', difficulty: 'Medium' },
  { front: 'What is Bit Manipulation useful for?', back: 'XOR: find single number, swap. AND/OR: check/set bits. n & (n-1): removes lowest set bit. Count bits: Brian Kernighan. Power of 2: n & (n-1) == 0. Common in optimization.', category: 'Patterns', difficulty: 'Medium' },
  // Additional cards
  { front: 'What is a Priority Queue / Heap?', back: 'Complete binary tree where parent ≤ children (min-heap). Insert/delete: O(log n). Peek: O(1). Used for: Top-K problems, merge K lists, median in stream, Dijkstra.', category: 'Data Structures', difficulty: 'Medium' },
  { front: 'How does Counting Sort work?', back: 'Non-comparison sort for integers in known range [0,k]. Count occurrences, compute prefix sums, place elements. O(n+k) time & space. Stable. Used when k is small relative to n.', category: 'Sorting', difficulty: 'Easy' },
  { front: 'What is the Prefix Sum technique?', back: 'Precompute cumulative sums to answer range sum queries in O(1). prefix[i] = sum(arr[0..i-1]). Range sum [l,r] = prefix[r+1] - prefix[l]. 2D version for matrix queries.', category: 'Patterns', difficulty: 'Easy' },
  { front: 'Explain Binary Search on Answer', back: 'When answer is monotonic (if x works, x+1 also works), binary search the answer space. Common in: minimize max, maximize min problems. Check feasibility at each mid value.', category: 'Patterns', difficulty: 'Hard' },
  { front: 'What is a Fenwick Tree (BIT)?', back: 'Binary Indexed Tree for prefix sum queries + point updates in O(log n). Simpler to implement than segment tree. Uses bit manipulation: i += i & (-i) to traverse. Space O(n).', category: 'Data Structures', difficulty: 'Hard' },
  { front: 'When to use a Deque?', back: 'Double-ended queue. O(1) push/pop from both ends. Used in: sliding window maximum (monotonic deque), BFS with 0-1 weights, implementing stack + queue.', category: 'Data Structures', difficulty: 'Medium' },
  { front: 'Explain the KMP Algorithm', back: 'String pattern matching in O(n+m). Builds failure function (LPS array) to avoid re-scanning. LPS[i] = length of longest proper prefix that is also suffix. No backtracking on text.', category: 'Strings', difficulty: 'Hard' },
  { front: 'What is Memoization vs Tabulation?', back: 'Memoization: Top-down, recursive, lazy (computes only needed states). Tabulation: Bottom-up, iterative, fills entire table. Tabulation often faster (no recursion overhead), memoization simpler to write.', category: 'DP', difficulty: 'Easy' },
  { front: 'How does Quick Select work?', back: 'Find kth smallest in O(n) average. Like quicksort but only recurse into one partition. Worst O(n²) but randomized pivot makes it unlikely. Used in: Kth Largest Element.', category: 'Sorting', difficulty: 'Medium' },
  { front: 'What is the Meet in the Middle technique?', back: 'Split input in two halves, enumerate all subsets of each half separately, then combine. Reduces 2^n to 2^(n/2). Used when n ≤ 40. Common in subset sum problems.', category: 'Patterns', difficulty: 'Hard' },
  { front: 'Bellman-Ford vs Dijkstra?', back: 'Bellman-Ford: O(VE), handles negative edges, detects negative cycles. Dijkstra: O((V+E)logV), faster but no negative edges. Use BF when edges can be negative.', category: 'Graphs', difficulty: 'Hard' },
  { front: 'What is a Balanced BST (AVL/Red-Black)?', back: 'Self-balancing BST guaranteeing O(log n) operations. AVL: stricter balance (height diff ≤ 1), faster lookups. Red-Black: looser, faster inserts/deletes. Java TreeMap uses Red-Black.', category: 'Data Structures', difficulty: 'Hard' },
];

const categories = ['All', ...Array.from(new Set(FLASHCARDS.map(f => f.category)))];

const Flashcards = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState('All');
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffled, setShuffled] = useState<Flashcard[]>([...FLASHCARDS]);
  const [knownSet, setKnownSet] = useState<Set<number>>(new Set());
  const [unknownSet, setUnknownSet] = useState<Set<number>>(new Set());

  const filtered = category === 'All' ? shuffled : shuffled.filter(f => f.category === category);
  const current = filtered[index % Math.max(filtered.length, 1)];
  const progress = filtered.length > 0 ? ((knownSet.size + unknownSet.size) / filtered.length) * 100 : 0;

  const handleShuffle = useCallback(() => {
    setShuffled(prev => [...prev].sort(() => Math.random() - 0.5));
    setIndex(0);
    setFlipped(false);
    setKnownSet(new Set());
    setUnknownSet(new Set());
  }, []);

  const markKnown = () => {
    setKnownSet(prev => new Set([...prev, index]));
    goNext();
  };

  const markUnknown = () => {
    setUnknownSet(prev => new Set([...prev, index]));
    goNext();
  };

  const goNext = () => {
    if (index < filtered.length - 1) { setIndex(index + 1); setFlipped(false); }
  };

  const goPrev = () => {
    if (index > 0) { setIndex(index - 1); setFlipped(false); }
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped(f => !f); }
      else if (e.key === '1') markKnown();
      else if (e.key === '2') markUnknown();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

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
        <div className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground">
          <Keyboard className="h-3 w-3" />
          <span>← → navigate · Space flip · 1 know · 2 don't</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-5">
        {/* Controls */}
        <div className="flex items-center gap-3">
          <Select value={category} onValueChange={v => { setCategory(v); setIndex(0); setFlipped(false); setKnownSet(new Set()); setUnknownSet(new Set()); }}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleShuffle} className="gap-1"><Shuffle className="h-3 w-3" /> Shuffle</Button>
          <span className="text-sm text-muted-foreground ml-auto">{Math.min(index + 1, filtered.length)} / {filtered.length}</span>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span className="text-emerald-500">✓ Know: {knownSet.size}</span>
            <span>Progress: {Math.round(progress)}%</span>
            <span className="text-red-500">✗ Review: {unknownSet.size}</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Card */}
        {current ? (
          <div onClick={() => setFlipped(!flipped)} style={{ cursor: 'pointer', perspective: '1000px' }}>
            <Card className={`min-h-[280px] transition-all duration-500 ${flipped ? 'bg-primary/5 border-primary/20' : 'hover:shadow-md'}`}>
              <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[280px] text-center px-8">
                <div className="flex gap-2 mb-4">
                  <Badge variant="outline" className="text-[10px]">{current.category}</Badge>
                  <Badge variant="outline" className={`text-[10px] ${diffColor[current.difficulty] || ''}`}>{current.difficulty}</Badge>
                </div>
                {!flipped ? (
                  <>
                    <p className="text-lg font-semibold text-foreground mb-4 leading-relaxed">{current.front}</p>
                    <p className="text-xs text-muted-foreground animate-pulse">Click or press Space to reveal</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground mb-2">Answer:</p>
                    <p className="text-foreground whitespace-pre-line leading-relaxed text-sm">{current.back}</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-10">No cards in this category</p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={goPrev} disabled={index === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {flipped && (
            <>
              <Button variant="outline" size="sm" onClick={markUnknown} className="gap-1 text-red-500 border-red-500/30 hover:bg-red-500/10">
                <ThumbsDown className="h-3.5 w-3.5" /> Don't Know
              </Button>
              <Button variant="outline" size="sm" onClick={markKnown} className="gap-1 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10">
                <ThumbsUp className="h-3.5 w-3.5" /> Know It
              </Button>
            </>
          )}

          {!flipped && (
            <Button variant="outline" size="sm" onClick={() => setFlipped(true)}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={goNext} disabled={index >= filtered.length - 1}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Flashcards;
