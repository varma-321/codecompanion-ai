import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Loader2, Trash2, Download, Copy, Check, Layers, Square } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CodeEditor from '@/components/CodeEditor';
import { executeJavaCode, type ExecutionStatus as ExecStatusType } from '@/lib/executor';

const TEMPLATES: Record<string, string> = {
  'Hello World': `import java.util.*;

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,
  'Array Operations': `import java.util.*;

public class Main {
    public static void main(String[] args) {
        int[] arr = {5, 2, 8, 1, 9, 3};
        Arrays.sort(arr);
        System.out.println("Sorted: " + Arrays.toString(arr));
        System.out.println("Sum: " + Arrays.stream(arr).sum());
        System.out.println("Max: " + Arrays.stream(arr).max().getAsInt());
    }
}`,
  'HashMap Example': `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Map<String, Integer> map = new HashMap<>();
        String[] words = {"apple", "banana", "apple", "cherry", "banana", "apple"};
        
        for (String w : words) {
            map.put(w, map.getOrDefault(w, 0) + 1);
        }
        
        map.forEach((k, v) -> System.out.println(k + ": " + v));
    }
}`,
  'Linked List': `import java.util.*;

public class Main {
    static class ListNode {
        int val;
        ListNode next;
        ListNode(int v) { val = v; }
    }
    
    static ListNode reverse(ListNode head) {
        ListNode prev = null, curr = head;
        while (curr != null) {
            ListNode next = curr.next;
            curr.next = prev;
            prev = curr;
            curr = next;
        }
        return prev;
    }
    
    public static void main(String[] args) {
        ListNode head = new ListNode(1);
        head.next = new ListNode(2);
        head.next.next = new ListNode(3);
        head.next.next.next = new ListNode(4);
        
        ListNode rev = reverse(head);
        while (rev != null) {
            System.out.print(rev.val + " -> ");
            rev = rev.next;
        }
        System.out.println("null");
    }
}`,
  'Binary Search': `import java.util.*;

public class Main {
    static int binarySearch(int[] arr, int target) {
        int lo = 0, hi = arr.length - 1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            if (arr[mid] == target) return mid;
            else if (arr[mid] < target) lo = mid + 1;
            else hi = mid - 1;
        }
        return -1;
    }
    
    public static void main(String[] args) {
        int[] arr = {1, 3, 5, 7, 9, 11, 13};
        System.out.println("Index of 7: " + binarySearch(arr, 7));
        System.out.println("Index of 4: " + binarySearch(arr, 4));
    }
}`,
  'Stack & Queue': `import java.util.*;

public class Main {
    public static void main(String[] args) {
        // Stack usage - check balanced parentheses
        String expr = "({[()]})";
        Stack<Character> stack = new Stack<>();
        boolean valid = true;
        for (char c : expr.toCharArray()) {
            if ("({[".indexOf(c) >= 0) stack.push(c);
            else {
                if (stack.isEmpty()) { valid = false; break; }
                char top = stack.pop();
                if ((c == ')' && top != '(') || (c == '}' && top != '{') || (c == ']' && top != '['))
                    { valid = false; break; }
            }
        }
        valid = valid && stack.isEmpty();
        System.out.println(expr + " is " + (valid ? "valid" : "invalid"));
    }
}`,
};

const CodePlayground = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState(TEMPLATES['Hello World']);
  const [output, setOutput] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [execTime, setExecTime] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRun = async () => {
    if (running) return;
    setRunning(true);
    setOutput(['▶ Compiling and running...']);
    const start = Date.now();
    try {
      const result = await executeJavaCode(code, () => {});
      const elapsed = Date.now() - start;
      setExecTime(elapsed);
      if (result.success) {
        setOutput(result.output ? result.output.split('\n') : ['(no output)']);
      } else {
        setOutput(result.error ? result.error.split('\n') : ['Execution failed']);
      }
    } catch (err: any) {
      setOutput([err?.message || 'Execution failed']);
    }
    setRunning(false);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'Main.java'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex items-center gap-1 sm:gap-2 border-b border-panel-border bg-ide-toolbar px-2 sm:px-3 py-1.5 overflow-x-auto scrollbar-none">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-7 gap-1 text-xs shrink-0">
          <ArrowLeft className="h-3 w-3" /> <span className="hidden sm:inline">Back</span>
        </Button>
        <span className="font-bold text-foreground text-sm shrink-0">⚡ <span className="hidden sm:inline">Code Playground</span></span>
        <Badge variant="outline" className="text-[10px] shrink-0">Java</Badge>
        
        <div className="flex items-center gap-1 shrink-0">
          <Layers className="h-3 w-3 text-muted-foreground hidden sm:block" />
          <Select onValueChange={(v) => setCode(TEMPLATES[v] || code)}>
            <SelectTrigger className="h-7 w-28 sm:w-36 text-[10px]"><SelectValue placeholder="Templates..." /></SelectTrigger>
            <SelectContent>
              {Object.keys(TEMPLATES).map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5 shrink-0">
          {execTime !== null && <span className="text-[10px] text-muted-foreground hidden sm:inline">{execTime}ms</span>}
          <Button size="sm" variant="ghost" onClick={handleCopy} className="h-7 w-7 p-0">
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownload} className="h-7 gap-1 text-xs hidden sm:flex">
            <Download className="h-3 w-3" /> Save
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setCode(TEMPLATES['Hello World']); setOutput([]); }} className="h-7 gap-1 text-xs hidden sm:flex">
            <Trash2 className="h-3 w-3" /> Reset
          </Button>
          <Button size="sm" onClick={handleRun} disabled={running} className="h-7 gap-1 text-xs">
            {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            Run
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        <div className="flex-1 overflow-hidden min-h-[200px]">
          <CodeEditor code={code} onChange={setCode} />
        </div>
        <div className="w-full md:w-[400px] border-t md:border-t-0 md:border-l border-panel-border flex flex-col min-h-[150px] md:min-h-0">
          <div className="border-b border-panel-border bg-ide-toolbar px-3 py-1.5 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Output</span>
            {output.length > 0 && (
              <Button variant="ghost" size="sm" className="h-5 text-[10px]" onClick={() => setOutput([])}>Clear</Button>
            )}
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 font-mono text-xs space-y-0.5">
              {output.length === 0 ? (
                <p className="text-muted-foreground">Click Run to execute your code</p>
              ) : output.map((line, i) => (
                <p key={i} className={`${line.startsWith('▶') ? 'text-primary' : line.toLowerCase().includes('error') ? 'text-destructive' : 'text-foreground'}`}>{line}</p>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default CodePlayground;
