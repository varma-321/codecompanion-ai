import { useState } from 'react';
import { GitBranch, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';

interface RecursionTreePanelProps {
  code: string;
}

const RecursionTreePanel = ({ code }: RecursionTreePanelProps) => {
  const [tree, setTree] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setTree('');

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recursion-tree`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ code }),
      });

      if (!resp.ok || !resp.body) throw new Error('Failed');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let content = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              content += delta;
              setTree(content);
            }
          } catch {}
        }
      }
    } catch (err: any) {
      setTree(`⚠️ Error: ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="flex h-full flex-col bg-ide-sidebar">
      <div className="flex items-center justify-between border-b border-panel-border px-3 py-1.5">
        <div className="flex items-center gap-2">
          <GitBranch className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recursion Tree</span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 gap-1 text-[10px]" onClick={handleGenerate} disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
          Generate
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {!tree && !loading && (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Click "Generate" to visualize the recursion tree for your code. Works best with recursive algorithms like fibonacci, merge sort, or backtracking.
            </div>
          )}
          {loading && !tree && (
            <div className="flex items-center gap-2 py-8 justify-center text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Generating recursion tree...
            </div>
          )}
          {tree && (
            <div className="prose prose-sm max-w-none dark:prose-invert [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-secondary [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-[11px] [&_code]:bg-secondary [&_code]:rounded [&_code]:px-1 [&_code]:text-[10px] [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_p]:text-foreground [&_li]:text-foreground">
              <ReactMarkdown>{tree}</ReactMarkdown>
              {loading && <Loader2 className="mt-2 h-4 w-4 animate-spin text-primary" />}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default RecursionTreePanel;
