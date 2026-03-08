import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Code2, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Pattern {
  name: string;
  icon: string;
  description: string;
  when: string;
  complexity: string;
  template: string;
  problems: string[];
}

const PATTERNS: Pattern[] = [
  {
    name: 'Two Pointers',
    icon: '👆',
    description: 'Use two pointers moving towards each other or in the same direction to solve array/string problems efficiently.',
    when: 'Sorted arrays, finding pairs, palindromes, removing duplicates',
    complexity: 'O(n) time, O(1) space',
    template: `int left = 0, right = arr.length - 1;
while (left < right) {
    int sum = arr[left] + arr[right];
    if (sum == target) {
        // found
        left++; right--;
    } else if (sum < target) {
        left++;
    } else {
        right--;
    }
}`,
    problems: ['Two Sum II', '3Sum', 'Container With Most Water', 'Trapping Rain Water'],
  },
  {
    name: 'Sliding Window',
    icon: '🪟',
    description: 'Maintain a window of elements and slide it across the array to find optimal subarrays/substrings.',
    when: 'Subarray/substring problems with constraints, max/min of size K',
    complexity: 'O(n) time, O(k) space',
    template: `int left = 0;
Map<Character, Integer> window = new HashMap<>();
int maxLen = 0;

for (int right = 0; right < s.length(); right++) {
    // expand window
    window.merge(s.charAt(right), 1, Integer::sum);
    
    while (/* window invalid */) {
        // shrink window
        window.merge(s.charAt(left), -1, Integer::sum);
        left++;
    }
    maxLen = Math.max(maxLen, right - left + 1);
}`,
    problems: ['Longest Substring Without Repeating', 'Minimum Window Substring', 'Max Consecutive Ones III'],
  },
  {
    name: 'Binary Search',
    icon: '🔍',
    description: 'Divide search space in half each iteration. Works on sorted arrays and monotonic functions.',
    when: 'Sorted data, finding boundaries, optimization on monotonic functions',
    complexity: 'O(log n) time, O(1) space',
    template: `int lo = 0, hi = arr.length - 1;
while (lo <= hi) {
    int mid = lo + (hi - lo) / 2;
    if (arr[mid] == target) return mid;
    else if (arr[mid] < target) lo = mid + 1;
    else hi = mid - 1;
}
return -1; // not found`,
    problems: ['Binary Search', 'Search in Rotated Sorted Array', 'Koko Eating Bananas', 'Median of Two Sorted Arrays'],
  },
  {
    name: 'BFS / Level-Order',
    icon: '🌊',
    description: 'Explore nodes level by level using a queue. Ideal for shortest path in unweighted graphs.',
    when: 'Shortest path, level-order traversal, flood fill, multi-source BFS',
    complexity: 'O(V + E) time, O(V) space',
    template: `Queue<int[]> queue = new LinkedList<>();
boolean[][] visited = new boolean[rows][cols];
queue.offer(new int[]{startR, startC});
visited[startR][startC] = true;
int level = 0;

while (!queue.isEmpty()) {
    int size = queue.size();
    for (int i = 0; i < size; i++) {
        int[] cell = queue.poll();
        // process cell
        for (int[] dir : dirs) {
            int nr = cell[0] + dir[0], nc = cell[1] + dir[1];
            if (inBounds(nr, nc) && !visited[nr][nc]) {
                visited[nr][nc] = true;
                queue.offer(new int[]{nr, nc});
            }
        }
    }
    level++;
}`,
    problems: ['Number of Islands', 'Rotting Oranges', 'Word Ladder', 'Binary Tree Level Order'],
  },
  {
    name: 'DFS / Backtracking',
    icon: '🔄',
    description: 'Explore all paths recursively. Backtrack when a path fails to find all valid solutions.',
    when: 'Permutations, combinations, subsets, constraint satisfaction',
    complexity: 'O(2^n) or O(n!) time',
    template: `void backtrack(List<List<Integer>> result, List<Integer> path, int[] nums, int start) {
    result.add(new ArrayList<>(path));
    
    for (int i = start; i < nums.length; i++) {
        path.add(nums[i]);
        backtrack(result, path, nums, i + 1);
        path.remove(path.size() - 1); // undo choice
    }
}`,
    problems: ['Subsets', 'Permutations', 'Combination Sum', 'N-Queens', 'Sudoku Solver'],
  },
  {
    name: 'Dynamic Programming (Bottom-Up)',
    icon: '📈',
    description: 'Build solutions to larger problems from smaller subproblems using a table.',
    when: 'Optimal substructure + overlapping subproblems (min/max/count)',
    complexity: 'Depends on state space',
    template: `// 1D DP example: Climbing Stairs
int[] dp = new int[n + 1];
dp[0] = 1; dp[1] = 1;
for (int i = 2; i <= n; i++) {
    dp[i] = dp[i-1] + dp[i-2];
}
return dp[n];

// 2D DP example: LCS
int[][] dp = new int[m+1][n+1];
for (int i = 1; i <= m; i++) {
    for (int j = 1; j <= n; j++) {
        if (s1.charAt(i-1) == s2.charAt(j-1))
            dp[i][j] = dp[i-1][j-1] + 1;
        else
            dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
    }
}`,
    problems: ['Climbing Stairs', 'House Robber', 'Longest Common Subsequence', 'Coin Change', 'Edit Distance'],
  },
  {
    name: 'Monotonic Stack',
    icon: '📚',
    description: 'Maintain a stack where elements are always in sorted order. Used for next greater/smaller element problems.',
    when: 'Next greater element, largest rectangle, stock span',
    complexity: 'O(n) time, O(n) space',
    template: `Stack<Integer> stack = new Stack<>();
int[] result = new int[n];
Arrays.fill(result, -1);

for (int i = 0; i < n; i++) {
    while (!stack.isEmpty() && arr[stack.peek()] < arr[i]) {
        result[stack.pop()] = arr[i];
    }
    stack.push(i);
}`,
    problems: ['Next Greater Element', 'Daily Temperatures', 'Largest Rectangle in Histogram', 'Trapping Rain Water'],
  },
  {
    name: 'Union-Find (Disjoint Set)',
    icon: '🔗',
    description: 'Track connected components efficiently with path compression and union by rank.',
    when: 'Connected components, cycle detection, Kruskal\'s MST',
    complexity: 'O(α(n)) per operation (nearly O(1))',
    template: `int[] parent, rank;

int find(int x) {
    if (parent[x] != x) parent[x] = find(parent[x]);
    return parent[x];
}

boolean union(int x, int y) {
    int px = find(x), py = find(y);
    if (px == py) return false;
    if (rank[px] < rank[py]) { int t = px; px = py; py = t; }
    parent[py] = px;
    if (rank[px] == rank[py]) rank[px]++;
    return true;
}`,
    problems: ['Number of Connected Components', 'Redundant Connection', 'Accounts Merge', 'Graph Valid Tree'],
  },
  {
    name: 'Prefix Sum',
    icon: '➕',
    description: 'Precompute cumulative sums for O(1) range sum queries.',
    when: 'Subarray sums, range queries, count subarrays with target sum',
    complexity: 'O(n) build, O(1) query',
    template: `// Build prefix sum
int[] prefix = new int[n + 1];
for (int i = 0; i < n; i++) {
    prefix[i + 1] = prefix[i] + arr[i];
}
// Range sum [l, r] = prefix[r+1] - prefix[l]

// Subarray sum equals K using HashMap
Map<Integer, Integer> map = new HashMap<>();
map.put(0, 1);
int sum = 0, count = 0;
for (int num : arr) {
    sum += num;
    count += map.getOrDefault(sum - k, 0);
    map.merge(sum, 1, Integer::sum);
}`,
    problems: ['Subarray Sum Equals K', 'Range Sum Query', 'Product of Array Except Self', 'Count Subarrays with XOR'],
  },
  {
    name: 'Trie (Prefix Tree)',
    icon: '🔤',
    description: 'Tree structure for efficient string prefix operations.',
    when: 'Autocomplete, word search, prefix matching, dictionary problems',
    complexity: 'O(L) per operation where L = word length',
    template: `class TrieNode {
    TrieNode[] children = new TrieNode[26];
    boolean isEnd = false;
}

void insert(String word) {
    TrieNode node = root;
    for (char c : word.toCharArray()) {
        int idx = c - 'a';
        if (node.children[idx] == null)
            node.children[idx] = new TrieNode();
        node = node.children[idx];
    }
    node.isEnd = true;
}

boolean search(String word) {
    TrieNode node = root;
    for (char c : word.toCharArray()) {
        int idx = c - 'a';
        if (node.children[idx] == null) return false;
        node = node.children[idx];
    }
    return node.isEnd;
}`,
    problems: ['Implement Trie', 'Word Search II', 'Design Add and Search Words', 'Replace Words'],
  },
];

const PatternsLibrary = () => {
  const navigate = useNavigate();
  const [openPatterns, setOpenPatterns] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

  const togglePattern = (name: string) => {
    setOpenPatterns(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const copyCode = (name: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(name);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-panel-border bg-ide-toolbar px-4 py-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="h-7 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold">Solution Patterns Library</span>
        </div>
        <Badge variant="secondary" className="text-xs">{PATTERNS.length} patterns</Badge>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto p-6 space-y-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">🧩 Common DSA Patterns</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Master these patterns and you'll be able to solve most interview problems
            </p>
          </div>

          {PATTERNS.map(pattern => {
            const isOpen = openPatterns.has(pattern.name);
            return (
              <Collapsible key={pattern.name} open={isOpen} onOpenChange={() => togglePattern(pattern.name)}>
                <CollapsibleTrigger asChild>
                  <Card className={`cursor-pointer transition-all hover:border-primary/30 ${isOpen ? 'border-primary/30 shadow-sm' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{pattern.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground">{pattern.name}</span>
                            <Badge variant="outline" className="text-[9px] font-mono">{pattern.complexity}</Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{pattern.description}</p>
                        </div>
                        {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </CardContent>
                  </Card>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="mt-1 ml-4 space-y-3 pb-2">
                    <Card className="bg-muted/30">
                      <CardContent className="p-3 space-y-3">
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">When to Use</span>
                          <p className="text-xs text-foreground mt-0.5">{pattern.when}</p>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Template Code</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 text-[9px] gap-1 px-1.5"
                              onClick={(e) => { e.stopPropagation(); copyCode(pattern.name, pattern.template); }}
                            >
                              {copied === pattern.name ? <Check className="h-2.5 w-2.5 text-success" /> : <Copy className="h-2.5 w-2.5" />}
                              {copied === pattern.name ? 'Copied' : 'Copy'}
                            </Button>
                          </div>
                          <pre className="text-[11px] bg-background rounded-md p-3 overflow-x-auto border border-panel-border font-mono leading-relaxed">
                            {pattern.template}
                          </pre>
                        </div>

                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Related Problems</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {pattern.problems.map(p => (
                              <Badge key={p} variant="secondary" className="text-[9px]">{p}</Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default PatternsLibrary;
