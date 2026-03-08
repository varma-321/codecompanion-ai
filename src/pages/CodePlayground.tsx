import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Loader2, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import CodeEditor from '@/components/CodeEditor';
import { executeJavaCode, type ExecutionStatus as ExecStatusType } from '@/lib/executor';

const DEFAULT_CODE = `import java.util.*;

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
        
        // Try your code here
        int[] arr = {1, 2, 3, 4, 5};
        System.out.println("Sum: " + Arrays.stream(arr).sum());
    }
}`;

const CodePlayground = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState(DEFAULT_CODE);
  const [output, setOutput] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [execTime, setExecTime] = useState<number | null>(null);

  const handleRun = async () => {
    if (running) return;
    setRunning(true);
    setOutput(['Compiling and running...']);
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
    a.href = url;
    a.download = 'Main.java';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex items-center gap-2 border-b border-panel-border bg-ide-toolbar px-3 py-1.5">
        <Button variant="ghost" size="sm" onClick={() => navigate('/modules')} className="h-7 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back
        </Button>
        <span className="font-bold text-foreground">⚡ Code Playground</span>
        <Badge variant="outline" className="text-[10px]">Java</Badge>
        <div className="ml-auto flex items-center gap-2">
          {execTime !== null && <span className="text-[10px] text-muted-foreground">{execTime}ms</span>}
          <Button size="sm" variant="outline" onClick={handleDownload} className="h-7 gap-1 text-xs">
            <Download className="h-3 w-3" /> Save
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setCode(DEFAULT_CODE); setOutput([]); }} className="h-7 gap-1 text-xs">
            <Trash2 className="h-3 w-3" /> Reset
          </Button>
          <Button size="sm" onClick={handleRun} disabled={running} className="h-7 gap-1 text-xs">
            {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            Run
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <CodeEditor code={code} onChange={setCode} />
        </div>
        <div className="w-[400px] border-l border-panel-border flex flex-col">
          <div className="border-b border-panel-border bg-ide-toolbar px-3 py-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Output</span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 font-mono text-xs space-y-0.5">
              {output.length === 0 ? (
                <p className="text-muted-foreground">Click Run to execute your code</p>
              ) : output.map((line, i) => (
                <p key={i} className="text-foreground">{line}</p>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default CodePlayground;
