import { useState, useEffect, useRef } from 'react';
import { Brain, Send, Loader2, AlertCircle, Lightbulb, Zap, Code2, Bug, BookOpen, FlaskConical, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  analyzeCode, getHints as getAIHints, getSolution, detectPatterns, detectMistakes,
  chat as aiChat, getExtraInsights, checkOllamaStatus, getOllamaModels,
  getSelectedModel, setSelectedModel
} from '@/lib/ollama';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface AIChatPanelProps {
  code: string;
  problemId: string | null;
}

const quickActions = [
  { label: 'Analyze', icon: Zap, prompt: '__analyze__' },
  { label: 'Hints', icon: Lightbulb, prompt: '__hints__' },
  { label: 'Brute Force', icon: Code2, prompt: '__solution_brute__' },
  { label: 'Optimal', icon: Sparkles, prompt: '__solution_optimal__' },
  { label: 'Find Mistakes', icon: Bug, prompt: '__mistakes__' },
  { label: 'Detect Patterns', icon: BookOpen, prompt: '__patterns__' },
  { label: 'Edge Cases', icon: FlaskConical, prompt: '__edgecases__' },
  { label: 'Test Cases', icon: FlaskConical, prompt: '__testcases__' },
];

const AIChatPanel = ({ code, problemId }: AIChatPanelProps) => {
  const [ollamaOnline, setOllamaOnline] = useState(false);
  const [checking, setChecking] = useState(true);
  const [models, setModels] = useState<string[]>([]);
  const [currentModel, setCurrentModel] = useState(getSelectedModel());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const check = async () => {
      setChecking(true);
      const online = await checkOllamaStatus();
      setOllamaOnline(online);
      if (online) {
        const availableModels = await getOllamaModels();
        setModels(availableModels);
        if (availableModels.length > 0 && !availableModels.includes(currentModel)) {
          setCurrentModel(availableModels[0]);
          setSelectedModel(availableModels[0]);
        }
      }
      setChecking(false);
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (role: ChatMessage['role'], content: string): ChatMessage => {
    const msg: ChatMessage = { id: crypto.randomUUID(), role, content, timestamp: new Date() };
    setMessages(prev => [...prev, msg]);
    return msg;
  };

  const handleModelChange = (model: string) => {
    setCurrentModel(model);
    setSelectedModel(model);
  };

  const handleSend = async (customPrompt?: string) => {
    const text = customPrompt || input.trim();
    if (!text || !ollamaOnline || isLoading) return;
    if (!customPrompt) setInput('');

    setIsLoading(true);

    try {
      if (text === '__analyze__') {
        addMessage('user', '🔍 Analyze this code');
        const result = await analyzeCode(code);
        const md = `### Analysis Results\n\n**Problem:** ${result.problemName}\n**Algorithm:** ${result.algorithmUsed}\n\n| Metric | Value |\n|--------|-------|\n| Time Complexity | \`${result.timeComplexity}\` |\n| Space Complexity | \`${result.spaceComplexity}\` |\n\n**Summary:** ${result.summary}\n\n${result.optimizations.length > 0 ? '**Optimizations:**\n' + result.optimizations.map(o => `- ${o}`).join('\n') : ''}`;
        addMessage('assistant', md);
      } else if (text === '__hints__') {
        const nextLevel = Math.min(hintLevel + 1, 4);
        addMessage('user', `💡 Give me hint ${nextLevel}`);
        const hint = await getAIHints(code, nextLevel);
        addMessage('assistant', `### Hint ${nextLevel} of 4\n\n${hint}`);
        setHintLevel(nextLevel);
      } else if (text.startsWith('__solution_')) {
        const type = text.replace('__solution_', '').replace('__', '') as 'brute' | 'better' | 'optimal';
        addMessage('user', `📝 Generate ${type} solution`);
        const sol = await getSolution(code, type);
        const md = `### ${type.charAt(0).toUpperCase() + type.slice(1)} Solution\n\n| Metric | Value |\n|--------|-------|\n| Time | \`${sol.timeComplexity}\` |\n| Space | \`${sol.spaceComplexity}\` |\n\n**Explanation:** ${sol.explanation}\n\n\`\`\`java\n${sol.code}\n\`\`\``;
        addMessage('assistant', md);
      } else if (text === '__mistakes__') {
        addMessage('user', '🐛 Find mistakes in my code');
        const result = await detectMistakes(code);
        addMessage('assistant', result);
      } else if (text === '__patterns__') {
        addMessage('user', '📚 Detect algorithm patterns');
        const result = await detectPatterns(code);
        addMessage('assistant', result);
      } else if (text === '__edgecases__') {
        addMessage('user', '⚠️ Find edge cases');
        const result = await getExtraInsights(code, 'edgecases');
        addMessage('assistant', result);
      } else if (text === '__testcases__') {
        addMessage('user', '🧪 Generate test cases');
        const result = await getExtraInsights(code, 'testcases');
        addMessage('assistant', result);
      } else {
        addMessage('user', text);
        const response = await aiChat(code, text);
        addMessage('assistant', response);
      }
    } catch (err: any) {
      addMessage('assistant', `❌ Error: ${err.message}`);
    }

    setIsLoading(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setHintLevel(0);
  };

  if (!ollamaOnline && !checking) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-ide-sidebar p-4">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Ollama Not Connected</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Run <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[11px]">ollama serve</code> in your terminal.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-ide-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-panel-border px-3 py-2">
        <div className="flex items-center gap-2">
          <Brain className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            checking ? 'bg-secondary text-muted-foreground' :
            ollamaOnline ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${
              checking ? 'animate-pulse-dot bg-muted-foreground' :
              ollamaOnline ? 'bg-success' : 'bg-destructive'
            }`} />
            {checking ? '...' : ollamaOnline ? 'Online' : 'Offline'}
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={clearChat} title="Clear chat">
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Model Selector */}
      {ollamaOnline && models.length > 0 && (
        <div className="border-b border-panel-border px-3 py-1.5">
          <Select value={currentModel} onValueChange={handleModelChange}>
            <SelectTrigger className="h-6 text-[11px]">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {models.map(model => (
                <SelectItem key={model} value={model} className="text-xs">{model}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Brain className="h-10 w-10 text-muted-foreground/30" />
            <div>
              <p className="text-sm font-medium text-foreground">DSA AI Assistant</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Ask questions about your code or use quick actions below.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`mb-3 animate-fade-in ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
            <div className={`max-w-[95%] rounded-lg px-3 py-2 text-xs ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-card-foreground border border-panel-border'
            }`}>
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none text-xs [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-secondary [&_pre]:p-2 [&_pre]:font-mono [&_pre]:text-[11px] [&_code]:rounded [&_code]:bg-secondary [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[11px] [&_table]:w-full [&_th]:border [&_th]:border-panel-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:border-panel-border [&_td]:px-2 [&_td]:py-1">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <span>{msg.content}</span>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="mb-3 flex items-center gap-2 animate-fade-in">
            <div className="rounded-lg bg-card border border-panel-border px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="border-t border-panel-border px-2 py-1.5">
        <div className="flex flex-wrap gap-1">
          {quickActions.map(action => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={() => handleSend(action.prompt)}
              className="h-6 gap-1 px-2 text-[10px]"
            >
              <action.icon className="h-2.5 w-2.5" />
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-panel-border p-2">
        <div className="flex gap-1.5">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your code..."
            rows={1}
            className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button
            size="icon"
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="h-8 w-8 shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIChatPanel;
