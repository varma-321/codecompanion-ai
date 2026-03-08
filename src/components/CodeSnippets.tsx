import { useState } from 'react';
import { Code2, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface Snippet {
  name: string;
  code: string;
  description: string;
}

interface SnippetCategory {
  category: string;
  icon: string;
  snippets: Snippet[];
}

const SNIPPET_DATA: SnippetCategory[] = [
  {
    category: 'Sorting',
    icon: '🔢',
    snippets: [
      {
        name: 'Merge Sort',
        description: 'O(n log n) divide-and-conquer sort',
        code: `public static void mergeSort(int[] arr, int l, int r) {
    if (l < r) {
        int mid = l + (r - l) / 2;
        mergeSort(arr, l, mid);
        mergeSort(arr, mid + 1, r);
        merge(arr, l, mid, r);
    }
}

private static void merge(int[] arr, int l, int mid, int r) {
    int n1 = mid - l + 1, n2 = r - mid;
    int[] L = new int[n1], R = new int[n2];
    for (int i = 0; i < n1; i++) L[i] = arr[l + i];
    for (int j = 0; j < n2; j++) R[j] = arr[mid + 1 + j];
    int i = 0, j = 0, k = l;
    while (i < n1 && j < n2) arr[k++] = L[i] <= R[j] ? L[i++] : R[j++];
    while (i < n1) arr[k++] = L[i++];
    while (j < n2) arr[k++] = R[j++];
}`,
      },
      {
        name: 'Quick Sort',
        description: 'O(n log n) avg partition-based sort',
        code: `public static void quickSort(int[] arr, int low, int high) {
    if (low < high) {
        int pi = partition(arr, low, high);
        quickSort(arr, low, pi - 1);
        quickSort(arr, pi + 1, high);
    }
}

private static int partition(int[] arr, int low, int high) {
    int pivot = arr[high], i = low - 1;
    for (int j = low; j < high; j++) {
        if (arr[j] < pivot) { i++; int t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    }
    int t = arr[i + 1]; arr[i + 1] = arr[high]; arr[high] = t;
    return i + 1;
}`,
      },
    ],
  },
  {
    category: 'Graph Traversal',
    icon: '🕸️',
    snippets: [
      {
        name: 'BFS',
        description: 'Breadth-first search using queue',
        code: `public static void bfs(List<List<Integer>> adj, int start) {
    boolean[] visited = new boolean[adj.size()];
    Queue<Integer> queue = new LinkedList<>();
    visited[start] = true;
    queue.add(start);
    while (!queue.isEmpty()) {
        int node = queue.poll();
        System.out.print(node + " ");
        for (int neighbor : adj.get(node)) {
            if (!visited[neighbor]) {
                visited[neighbor] = true;
                queue.add(neighbor);
            }
        }
    }
}`,
      },
      {
        name: 'DFS',
        description: 'Depth-first search using recursion',
        code: `public static void dfs(List<List<Integer>> adj, int node, boolean[] visited) {
    visited[node] = true;
    System.out.print(node + " ");
    for (int neighbor : adj.get(node)) {
        if (!visited[neighbor]) {
            dfs(adj, neighbor, visited);
        }
    }
}`,
      },
      {
        name: "Dijkstra's",
        description: 'Shortest path using priority queue',
        code: `public static int[] dijkstra(List<List<int[]>> adj, int src) {
    int n = adj.size();
    int[] dist = new int[n];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[src] = 0;
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[1] - b[1]);
    pq.offer(new int[]{src, 0});
    while (!pq.isEmpty()) {
        int[] curr = pq.poll();
        int u = curr[0], d = curr[1];
        if (d > dist[u]) continue;
        for (int[] edge : adj.get(u)) {
            int v = edge[0], w = edge[1];
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                pq.offer(new int[]{v, dist[v]});
            }
        }
    }
    return dist;
}`,
      },
    ],
  },
  {
    category: 'Binary Search',
    icon: '🔍',
    snippets: [
      {
        name: 'Standard Binary Search',
        description: 'Classic O(log n) search',
        code: `public static int binarySearch(int[] arr, int target) {
    int lo = 0, hi = arr.length - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (arr[mid] == target) return mid;
        else if (arr[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}`,
      },
      {
        name: 'Lower Bound',
        description: 'First index where arr[i] >= target',
        code: `public static int lowerBound(int[] arr, int target) {
    int lo = 0, hi = arr.length;
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (arr[mid] < target) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}`,
      },
    ],
  },
  {
    category: 'Sliding Window',
    icon: '🪟',
    snippets: [
      {
        name: 'Fixed Window',
        description: 'Max sum of subarray of size k',
        code: `public static int maxSumWindow(int[] arr, int k) {
    int sum = 0, maxSum = Integer.MIN_VALUE;
    for (int i = 0; i < arr.length; i++) {
        sum += arr[i];
        if (i >= k) sum -= arr[i - k];
        if (i >= k - 1) maxSum = Math.max(maxSum, sum);
    }
    return maxSum;
}`,
      },
      {
        name: 'Variable Window',
        description: 'Smallest subarray with sum >= target',
        code: `public static int minSubArrayLen(int target, int[] nums) {
    int left = 0, sum = 0, minLen = Integer.MAX_VALUE;
    for (int right = 0; right < nums.length; right++) {
        sum += nums[right];
        while (sum >= target) {
            minLen = Math.min(minLen, right - left + 1);
            sum -= nums[left++];
        }
    }
    return minLen == Integer.MAX_VALUE ? 0 : minLen;
}`,
      },
    ],
  },
  {
    category: 'Two Pointers',
    icon: '👉👈',
    snippets: [
      {
        name: 'Two Sum (Sorted)',
        description: 'Find pair with target sum in sorted array',
        code: `public static int[] twoSum(int[] arr, int target) {
    int left = 0, right = arr.length - 1;
    while (left < right) {
        int sum = arr[left] + arr[right];
        if (sum == target) return new int[]{left, right};
        else if (sum < target) left++;
        else right--;
    }
    return new int[]{-1, -1};
}`,
      },
    ],
  },
  {
    category: 'Dynamic Programming',
    icon: '📊',
    snippets: [
      {
        name: '0/1 Knapsack',
        description: 'Classic DP knapsack',
        code: `public static int knapsack(int[] wt, int[] val, int W) {
    int n = wt.length;
    int[][] dp = new int[n + 1][W + 1];
    for (int i = 1; i <= n; i++) {
        for (int w = 0; w <= W; w++) {
            dp[i][w] = dp[i - 1][w];
            if (wt[i - 1] <= w)
                dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - wt[i - 1]] + val[i - 1]);
        }
    }
    return dp[n][W];
}`,
      },
      {
        name: 'LCS',
        description: 'Longest Common Subsequence',
        code: `public static int lcs(String s1, String s2) {
    int m = s1.length(), n = s2.length();
    int[][] dp = new int[m + 1][n + 1];
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (s1.charAt(i - 1) == s2.charAt(j - 1)) dp[i][j] = dp[i - 1][j - 1] + 1;
            else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }
    return dp[m][n];
}`,
      },
    ],
  },
  {
    category: 'Trees',
    icon: '🌲',
    snippets: [
      {
        name: 'Inorder Traversal',
        description: 'Left → Root → Right',
        code: `public static void inorder(TreeNode root) {
    if (root == null) return;
    inorder(root.left);
    System.out.print(root.val + " ");
    inorder(root.right);
}`,
      },
      {
        name: 'Level Order (BFS)',
        description: 'Level-by-level traversal',
        code: `public static List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> result = new ArrayList<>();
    if (root == null) return result;
    Queue<TreeNode> queue = new LinkedList<>();
    queue.add(root);
    while (!queue.isEmpty()) {
        int size = queue.size();
        List<Integer> level = new ArrayList<>();
        for (int i = 0; i < size; i++) {
            TreeNode node = queue.poll();
            level.add(node.val);
            if (node.left != null) queue.add(node.left);
            if (node.right != null) queue.add(node.right);
        }
        result.add(level);
    }
    return result;
}`,
      },
    ],
  },
  {
    category: 'Stack & Queue',
    icon: '📚',
    snippets: [
      {
        name: 'Next Greater Element',
        description: 'Using monotonic stack',
        code: `public static int[] nextGreater(int[] arr) {
    int n = arr.length;
    int[] result = new int[n];
    Arrays.fill(result, -1);
    Stack<Integer> stack = new Stack<>();
    for (int i = 0; i < n; i++) {
        while (!stack.isEmpty() && arr[stack.peek()] < arr[i]) {
            result[stack.pop()] = arr[i];
        }
        stack.push(i);
    }
    return result;
}`,
      },
    ],
  },
];

interface CodeSnippetsProps {
  onInsert: (code: string) => void;
}

const CodeSnippets = ({ onInsert }: CodeSnippetsProps) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (name: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(name);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleInsert = (code: string) => {
    onInsert('\n' + code + '\n');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1.5 border-b border-panel-border bg-ide-toolbar px-3 py-2">
        <Code2 className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Code Templates</span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {SNIPPET_DATA.map(cat => (
            <div key={cat.category}>
              <button
                onClick={() => setExpanded(expanded === cat.category ? null : cat.category)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold text-foreground hover:bg-ide-hover transition-colors"
              >
                <span>{cat.icon}</span>
                <span className="flex-1 text-left">{cat.category}</span>
                <Badge variant="secondary" className="text-[9px] h-4 px-1">{cat.snippets.length}</Badge>
                {expanded === cat.category ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              </button>
              {expanded === cat.category && (
                <div className="ml-4 space-y-1 pb-1 animate-fade-in">
                  {cat.snippets.map(s => (
                    <div key={s.name} className="rounded-md border border-panel-border bg-secondary/30 p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-foreground">{s.name}</span>
                        <div className="flex gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => handleCopy(s.name, s.code)}
                            title="Copy"
                          >
                            {copied === s.name ? <Check className="h-2.5 w-2.5 text-success" /> : <Copy className="h-2.5 w-2.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 text-[9px] px-1.5"
                            onClick={() => handleInsert(s.code)}
                          >
                            Insert
                          </Button>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-1.5">{s.description}</p>
                      <pre className="overflow-x-auto rounded bg-background p-1.5 font-mono text-[10px] leading-tight text-foreground max-h-32 overflow-y-auto">
                        {s.code}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default CodeSnippets;
