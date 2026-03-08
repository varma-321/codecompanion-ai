import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CheatEntry {
  title: string;
  category: string;
  timeComplexity: string;
  spaceComplexity: string;
  keyPoints: string[];
  pseudocode: string;
}

const CHEAT_ENTRIES: CheatEntry[] = [
  { title: 'Binary Search', category: 'Search', timeComplexity: 'O(log n)', spaceComplexity: 'O(1)', keyPoints: ['Sorted array required', 'Divide search space by half', 'lo <= hi pattern', 'Watch for overflow: mid = lo + (hi-lo)/2'], pseudocode: 'lo=0, hi=n-1\nwhile lo<=hi:\n  mid = lo+(hi-lo)/2\n  if arr[mid]==target: return mid\n  elif arr[mid]<target: lo=mid+1\n  else: hi=mid-1' },
  { title: 'Two Pointers', category: 'Patterns', timeComplexity: 'O(n)', spaceComplexity: 'O(1)', keyPoints: ['Sorted array usually', 'One from each end or same direction', 'Good for pair/triplet sums'], pseudocode: 'l=0, r=n-1\nwhile l<r:\n  sum = arr[l]+arr[r]\n  if sum==target: return\n  elif sum<target: l++\n  else: r--' },
  { title: 'Sliding Window', category: 'Patterns', timeComplexity: 'O(n)', spaceComplexity: 'O(k)', keyPoints: ['Contiguous subarray/substring', 'Fixed or variable window', 'Track window state with map/set'], pseudocode: 'l=0\nfor r in range(n):\n  add arr[r] to window\n  while window invalid:\n    remove arr[l], l++\n  update answer' },
  { title: 'BFS', category: 'Graphs', timeComplexity: 'O(V+E)', spaceComplexity: 'O(V)', keyPoints: ['Uses Queue', 'Level-order traversal', 'Shortest path (unweighted)', 'Mark visited before enqueue'], pseudocode: 'queue = [start]\nvisited = {start}\nwhile queue:\n  node = queue.pop()\n  for neighbor of node:\n    if not visited:\n      visited.add(neighbor)\n      queue.append(neighbor)' },
  { title: 'DFS', category: 'Graphs', timeComplexity: 'O(V+E)', spaceComplexity: 'O(V)', keyPoints: ['Uses Stack/Recursion', 'Goes deep first', 'Detect cycles, topological sort', 'Pre/In/Post order'], pseudocode: 'def dfs(node, visited):\n  visited.add(node)\n  for neighbor of node:\n    if not visited:\n      dfs(neighbor, visited)' },
  { title: 'Dijkstra', category: 'Graphs', timeComplexity: 'O((V+E)logV)', spaceComplexity: 'O(V)', keyPoints: ['Shortest path (weighted, non-negative)', 'Min-heap / Priority Queue', 'Greedy approach', 'Relax edges'], pseudocode: 'dist = {start: 0}\npq = [(0, start)]\nwhile pq:\n  d, u = heappop(pq)\n  for v, w in adj[u]:\n    if d+w < dist[v]:\n      dist[v] = d+w\n      heappush(pq, (d+w, v))' },
  { title: 'Dynamic Programming', category: 'DP', timeComplexity: 'Varies', spaceComplexity: 'Varies', keyPoints: ['Optimal substructure', 'Overlapping subproblems', 'Top-down (memo) or Bottom-up (tabulation)', 'Define state clearly'], pseudocode: '// Bottom-up\ndp[0] = base_case\nfor i in 1..n:\n  dp[i] = recurrence(dp[i-1], ...)\nreturn dp[n]' },
  { title: 'Merge Sort', category: 'Sorting', timeComplexity: 'O(n log n)', spaceComplexity: 'O(n)', keyPoints: ['Stable sort', 'Divide and conquer', 'Always O(n log n)', 'Good for linked lists'], pseudocode: 'def mergesort(arr):\n  if len<=1: return\n  mid = len/2\n  mergesort(left)\n  mergesort(right)\n  merge(left, right)' },
  { title: 'Quick Sort', category: 'Sorting', timeComplexity: 'O(n log n) avg', spaceComplexity: 'O(log n)', keyPoints: ['In-place, not stable', 'Pivot selection matters', 'O(n²) worst case', 'Cache-friendly'], pseudocode: 'def quicksort(arr, lo, hi):\n  if lo<hi:\n    p = partition(arr, lo, hi)\n    quicksort(arr, lo, p-1)\n    quicksort(arr, p+1, hi)' },
  { title: 'Union-Find', category: 'Data Structures', timeComplexity: 'O(α(n)) ≈ O(1)', spaceComplexity: 'O(n)', keyPoints: ['Connected components', 'Path compression + union by rank', 'Kruskal\'s MST', 'Cycle detection'], pseudocode: 'parent = [i for i in range(n)]\ndef find(x):\n  if parent[x]!=x:\n    parent[x]=find(parent[x])\n  return parent[x]\ndef union(x,y):\n  px,py = find(x),find(y)\n  parent[px] = py' },
  { title: 'Trie', category: 'Data Structures', timeComplexity: 'O(L) per op', spaceComplexity: 'O(N*L)', keyPoints: ['Prefix tree', 'Autocomplete, spell check', 'Each node = char + children[]', 'isEndOfWord flag'], pseudocode: 'class TrieNode:\n  children = {}\n  isEnd = false\n\ndef insert(word):\n  node = root\n  for ch in word:\n    if ch not in node.children:\n      node.children[ch] = TrieNode()\n    node = node.children[ch]\n  node.isEnd = true' },
  { title: 'Kadane\'s Algorithm', category: 'DP', timeComplexity: 'O(n)', spaceComplexity: 'O(1)', keyPoints: ['Maximum subarray sum', 'Track current and global max', 'Reset current if negative', 'Can track indices too'], pseudocode: 'curMax = globalMax = arr[0]\nfor i in 1..n:\n  curMax = max(arr[i], curMax+arr[i])\n  globalMax = max(globalMax, curMax)' },
  { title: 'Backtracking', category: 'Patterns', timeComplexity: 'O(k^n) typically', spaceComplexity: 'O(n)', keyPoints: ['Build solution incrementally', 'Prune invalid branches early', 'Permutations, combinations, subsets', 'N-Queens, Sudoku'], pseudocode: 'def backtrack(state):\n  if complete(state):\n    add to results\n    return\n  for choice in choices:\n    if valid(choice):\n      make(choice)\n      backtrack(state)\n      undo(choice)' },
  { title: 'Monotonic Stack', category: 'Patterns', timeComplexity: 'O(n)', spaceComplexity: 'O(n)', keyPoints: ['Next greater/smaller element', 'Stock span, histogram area', 'Stack maintains sorted order', 'Each element pushed/popped once'], pseudocode: 'stack = []\nfor i in range(n):\n  while stack and arr[stack[-1]]<arr[i]:\n    idx = stack.pop()\n    result[idx] = arr[i]\n  stack.append(i)' },
  { title: 'Heap / Priority Queue', category: 'Data Structures', timeComplexity: 'O(log n) insert/delete', spaceComplexity: 'O(n)', keyPoints: ['Top-K problems', 'Merge K sorted lists', 'Median in stream', 'Min-heap default in most languages'], pseudocode: '// Top K Frequent\ncount = Counter(nums)\nheap = nsmallest(k, count, key=count.get)\n\n// Merge K Lists\nheap = [(node.val, i, node) for ...]' },
];

const categories = ['All', ...new Set(CHEAT_ENTRIES.map(e => e.category))];

const CheatSheet = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const filtered = CHEAT_ENTRIES.filter(e => {
    if (category !== 'All' && e.category !== category) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase()) && !e.keyPoints.some(k => k.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-panel-border bg-ide-toolbar px-4 py-2 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-7 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back
        </Button>
        <BookOpen className="h-4 w-4 text-primary" />
        <span className="font-bold text-foreground">DSA Cheat Sheet</span>
        <Badge variant="outline" className="text-[10px]">{CHEAT_ENTRIES.length} topics</Badge>
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
          {filtered.map(entry => (
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
                <pre className="bg-secondary/40 rounded p-2 text-[10px] font-mono text-foreground overflow-x-auto leading-relaxed">
                  {entry.pseudocode}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CheatSheet;
