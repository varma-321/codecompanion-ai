import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, BookOpen, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CheatEntry {
  title: string;
  category: string;
  timeComplexity: string;
  spaceComplexity: string;
  keyPoints: string[];
  pseudocode: string;
  whenToUse: string;
}

const CHEAT_ENTRIES: CheatEntry[] = [
  { title: 'Binary Search', category: 'Search', timeComplexity: 'O(log n)', spaceComplexity: 'O(1)', keyPoints: ['Sorted array required', 'Divide search space by half', 'lo <= hi pattern', 'Watch for overflow: mid = lo + (hi-lo)/2', 'Variants: lower bound, upper bound, search on answer'], pseudocode: 'lo=0, hi=n-1\nwhile lo<=hi:\n  mid = lo+(hi-lo)/2\n  if arr[mid]==target: return mid\n  elif arr[mid]<target: lo=mid+1\n  else: hi=mid-1', whenToUse: 'Sorted arrays, monotonic functions, minimize/maximize answer' },
  { title: 'Two Pointers', category: 'Patterns', timeComplexity: 'O(n)', spaceComplexity: 'O(1)', keyPoints: ['Sorted array usually', 'One from each end or same direction', 'Good for pair/triplet sums', 'Remove duplicates in-place'], pseudocode: 'l=0, r=n-1\nwhile l<r:\n  sum = arr[l]+arr[r]\n  if sum==target: return\n  elif sum<target: l++\n  else: r--', whenToUse: 'Pair sums, palindromes, container problems, sorted array operations' },
  { title: 'Sliding Window', category: 'Patterns', timeComplexity: 'O(n)', spaceComplexity: 'O(k)', keyPoints: ['Contiguous subarray/substring', 'Fixed or variable window', 'Track window state with map/set', 'Shrink when constraint violated'], pseudocode: 'l=0\nfor r in range(n):\n  add arr[r] to window\n  while window invalid:\n    remove arr[l], l++\n  update answer', whenToUse: 'Subarray/substring with constraints, max/min window, distinct elements' },
  { title: 'BFS', category: 'Graphs', timeComplexity: 'O(V+E)', spaceComplexity: 'O(V)', keyPoints: ['Uses Queue', 'Level-order traversal', 'Shortest path (unweighted)', 'Mark visited BEFORE enqueue', 'Multi-source BFS for multiple starting points'], pseudocode: 'queue = [start]\nvisited = {start}\nwhile queue:\n  node = queue.pop()\n  for neighbor of node:\n    if not visited:\n      visited.add(neighbor)\n      queue.append(neighbor)', whenToUse: 'Shortest path (unweighted), level-order, nearest/closest problems' },
  { title: 'DFS', category: 'Graphs', timeComplexity: 'O(V+E)', spaceComplexity: 'O(V)', keyPoints: ['Uses Stack/Recursion', 'Goes deep first', 'Detect cycles, topological sort', 'Pre/In/Post order', 'Connected components'], pseudocode: 'def dfs(node, visited):\n  visited.add(node)\n  for neighbor of node:\n    if not visited:\n      dfs(neighbor, visited)', whenToUse: 'Connectivity, cycle detection, topological sort, path finding' },
  { title: 'Dijkstra', category: 'Graphs', timeComplexity: 'O((V+E)logV)', spaceComplexity: 'O(V)', keyPoints: ['Shortest path (weighted, non-negative)', 'Min-heap / Priority Queue', 'Greedy approach', 'Relax edges', 'Skip outdated entries in heap'], pseudocode: 'dist = {start: 0}\npq = [(0, start)]\nwhile pq:\n  d, u = heappop(pq)\n  if d > dist[u]: continue\n  for v, w in adj[u]:\n    if d+w < dist[v]:\n      dist[v] = d+w\n      heappush(pq, (d+w, v))', whenToUse: 'Weighted shortest path (non-negative edges), network routing' },
  { title: 'Dynamic Programming', category: 'DP', timeComplexity: 'Varies', spaceComplexity: 'Varies', keyPoints: ['Optimal substructure', 'Overlapping subproblems', 'Top-down (memo) or Bottom-up (tabulation)', 'Define state clearly', 'Space optimization with rolling array'], pseudocode: '// Bottom-up\ndp[0] = base_case\nfor i in 1..n:\n  dp[i] = recurrence(dp[i-1], ...)\nreturn dp[n]\n\n// Top-down\nmemo = {}\ndef solve(state):\n  if state in memo: return memo[state]\n  memo[state] = compute()\n  return memo[state]', whenToUse: 'Optimization problems, counting paths, string matching, knapsack' },
  { title: 'Merge Sort', category: 'Sorting', timeComplexity: 'O(n log n)', spaceComplexity: 'O(n)', keyPoints: ['Stable sort', 'Divide and conquer', 'Always O(n log n)', 'Good for linked lists', 'Counts inversions'], pseudocode: 'def mergesort(arr):\n  if len<=1: return\n  mid = len/2\n  mergesort(left)\n  mergesort(right)\n  merge(left, right)', whenToUse: 'Need stable sort, linked lists, counting inversions, external sorting' },
  { title: 'Quick Sort', category: 'Sorting', timeComplexity: 'O(n log n) avg', spaceComplexity: 'O(log n)', keyPoints: ['In-place, not stable', 'Pivot selection matters (randomize!)', 'O(n²) worst case', 'Cache-friendly', '3-way partition for duplicates'], pseudocode: 'def quicksort(arr, lo, hi):\n  if lo<hi:\n    p = partition(arr, lo, hi)\n    quicksort(arr, lo, p-1)\n    quicksort(arr, p+1, hi)', whenToUse: 'General purpose, in-place sorting, cache performance matters' },
  { title: 'Union-Find', category: 'Data Structures', timeComplexity: 'O(α(n)) ≈ O(1)', spaceComplexity: 'O(n)', keyPoints: ['Connected components', 'Path compression + union by rank', "Kruskal's MST", 'Cycle detection', 'Count components with counter'], pseudocode: 'parent = [i for i in range(n)]\nrank = [0] * n\ndef find(x):\n  if parent[x]!=x:\n    parent[x]=find(parent[x])\n  return parent[x]\ndef union(x,y):\n  px,py = find(x),find(y)\n  if rank[px]<rank[py]: swap\n  parent[py] = px\n  if rank[px]==rank[py]: rank[px]++', whenToUse: 'Connected components, MST, dynamic connectivity, equivalence classes' },
  { title: 'Trie', category: 'Data Structures', timeComplexity: 'O(L) per op', spaceComplexity: 'O(N*L)', keyPoints: ['Prefix tree', 'Autocomplete, spell check', 'Each node = children map + isEnd flag', 'Can store count at each node', 'Wildcard search with DFS'], pseudocode: 'class TrieNode:\n  children = {}\n  isEnd = false\n\ndef insert(word):\n  node = root\n  for ch in word:\n    if ch not in children:\n      children[ch] = TrieNode()\n    node = children[ch]\n  node.isEnd = true', whenToUse: 'Prefix matching, autocomplete, word search, IP routing' },
  { title: "Kadane's Algorithm", category: 'DP', timeComplexity: 'O(n)', spaceComplexity: 'O(1)', keyPoints: ['Maximum subarray sum', 'Track current and global max', 'Reset current if negative', 'Track start/end indices', 'Circular variant: total - min subarray'], pseudocode: 'curMax = globalMax = arr[0]\nfor i in 1..n:\n  curMax = max(arr[i], curMax+arr[i])\n  globalMax = max(globalMax, curMax)', whenToUse: 'Maximum subarray, maximum circular subarray, maximum product subarray' },
  { title: 'Backtracking', category: 'Patterns', timeComplexity: 'O(k^n) typically', spaceComplexity: 'O(n)', keyPoints: ['Build solution incrementally', 'Prune invalid branches early', 'Permutations, combinations, subsets', 'N-Queens, Sudoku', 'Use visited array or swap technique'], pseudocode: 'def backtrack(state, choices):\n  if complete(state):\n    results.add(state.copy())\n    return\n  for choice in choices:\n    if valid(choice):\n      state.add(choice)\n      backtrack(state, remaining)\n      state.remove(choice)', whenToUse: 'Generate permutations/combinations, constraint satisfaction, puzzle solving' },
  { title: 'Monotonic Stack', category: 'Patterns', timeComplexity: 'O(n)', spaceComplexity: 'O(n)', keyPoints: ['Next greater/smaller element', 'Stock span, histogram area', 'Stack maintains sorted order', 'Each element pushed/popped once', 'Increasing vs decreasing depends on problem'], pseudocode: 'stack = []\nresult = [-1] * n\nfor i in range(n):\n  while stack and arr[stack[-1]] < arr[i]:\n    idx = stack.pop()\n    result[idx] = arr[i]\n  stack.append(i)', whenToUse: 'Next greater/smaller element, largest rectangle, daily temperatures' },
  { title: 'Heap / Priority Queue', category: 'Data Structures', timeComplexity: 'O(log n) ins/del', spaceComplexity: 'O(n)', keyPoints: ['Top-K problems', 'Merge K sorted lists', 'Median in stream (two heaps)', 'Kth largest: min-heap of size k', 'Custom comparator for complex ordering'], pseudocode: '// Top K Frequent\ncount = Counter(nums)\nheap = []\nfor key, freq in count:\n  heappush(heap, (freq, key))\n  if len(heap) > k: heappop(heap)', whenToUse: 'Top-K, merge K lists, running median, shortest path, scheduling' },
  { title: 'Prefix Sum', category: 'Patterns', timeComplexity: 'O(n) build, O(1) query', spaceComplexity: 'O(n)', keyPoints: ['Range sum queries', 'prefix[i] = sum(arr[0..i-1])', 'Range [l,r] = prefix[r+1] - prefix[l]', '2D prefix sum for matrix', 'Combine with HashMap for subarray sum = k'], pseudocode: 'prefix = [0] * (n+1)\nfor i in range(n):\n  prefix[i+1] = prefix[i] + arr[i]\n\n# Range sum [l, r]\nsum = prefix[r+1] - prefix[l]\n\n# Subarray sum = k (with HashMap)\ncount = 0; curSum = 0; map = {0: 1}\nfor x in arr:\n  curSum += x\n  count += map.get(curSum - k, 0)\n  map[curSum] = map.get(curSum, 0) + 1', whenToUse: 'Range sum queries, subarray sum equals k, equilibrium index' },
  { title: 'Binary Search on Answer', category: 'Patterns', timeComplexity: 'O(n log range)', spaceComplexity: 'O(1)', keyPoints: ['Answer space is monotonic', 'Binary search the answer, check feasibility', 'Common in minimize max, maximize min', 'Feasibility check is key'], pseudocode: 'lo, hi = min_ans, max_ans\nwhile lo < hi:\n  mid = lo + (hi - lo) / 2\n  if feasible(mid):\n    hi = mid  // or lo = mid+1 depending\n  else:\n    lo = mid + 1\nreturn lo', whenToUse: 'Minimize maximum, maximize minimum, allocation problems, kth smallest' },
  { title: 'Topological Sort (Kahn)', category: 'Graphs', timeComplexity: 'O(V+E)', spaceComplexity: 'O(V)', keyPoints: ['DAG only', 'BFS with in-degree array', 'Detects cycles', 'Multiple valid orderings possible', 'Used for task scheduling'], pseudocode: 'indegree = count incoming edges\nqueue = [nodes with indegree 0]\nresult = []\nwhile queue:\n  node = queue.pop()\n  result.append(node)\n  for neighbor:\n    indegree[neighbor]--\n    if indegree[neighbor]==0:\n      queue.append(neighbor)\nif len(result) != V: CYCLE!', whenToUse: 'Task ordering, course scheduling, build systems, dependency resolution' },
];

const categories = ['All', ...Array.from(new Set(CHEAT_ENTRIES.map(e => e.category)))];

const CheatSheet = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<Set<number>>(new Set());

  const filtered = CHEAT_ENTRIES.filter(e => {
    if (category !== 'All' && e.category !== category) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase()) && !e.keyPoints.some(k => k.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const copyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIdx(idx);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const toggleExpand = (idx: number) => {
    setExpandedIdx(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-panel-border bg-ide-toolbar px-4 py-2 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-7 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back
        </Button>
        <BookOpen className="h-4 w-4 text-primary" />
        <span className="font-bold text-foreground">DSA Cheat Sheet</span>
        <Badge variant="outline" className="text-[10px]">{CHEAT_ENTRIES.length} algorithms</Badge>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search algorithms..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1 flex-wrap">
            {categories.map(c => (
              <Button key={c} size="sm" variant={category === c ? 'default' : 'outline'} onClick={() => setCategory(c)} className="h-8 text-xs">
                {c}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((entry, idx) => {
            const isExpanded = expandedIdx.has(idx);
            return (
              <Card key={entry.title} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{entry.title}</CardTitle>
                    <Badge variant="outline" className="text-[9px]">{entry.category}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20">⏱ {entry.timeComplexity}</Badge>
                    <Badge className="text-[9px] bg-secondary text-secondary-foreground">💾 {entry.spaceComplexity}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <ul className="space-y-0.5">
                    {entry.keyPoints.map((p, i) => (
                      <li key={i} className="text-xs text-muted-foreground">• {p}</li>
                    ))}
                  </ul>
                  
                  <div className="text-[10px] text-primary/80 font-medium">🎯 {entry.whenToUse}</div>

                  <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(idx)}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] w-full justify-center text-muted-foreground hover:text-foreground">
                        {isExpanded ? 'Hide Code ▲' : 'Show Pseudocode ▼'}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="relative">
                        <Button
                          variant="ghost" size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => copyCode(entry.pseudocode, idx)}
                        >
                          {copiedIdx === idx ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                        </Button>
                        <pre className="bg-secondary/40 rounded p-2 pr-8 text-[10px] font-mono text-foreground overflow-x-auto leading-relaxed">
                          {entry.pseudocode}
                        </pre>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CheatSheet;
