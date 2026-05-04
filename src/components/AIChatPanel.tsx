import { useState, useEffect, useRef, memo, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  Brain,
  Send,
  Loader2,
  AlertCircle,
  Trash2,
  Copy,
  ArrowUpRight,
  Volume2,
  VolumeX,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  analyzeCode,
  getHints as getAIHints,
  detectMistakes,
  detectPatterns,
  chat as aiChat,
  checkBackendStatus,
} from "@/lib/ai-backend";
import ReactMarkdown from "react-markdown";
import mermaid from "mermaid";

// Mermaid Initializer
mermaid.initialize({
  startOnLoad: true,
  theme: "dark",
  securityLevel: "loose",
  fontFamily: "Inter, sans-serif",
});

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

const Mermaid = memo(({ chart }: { chart: string }) => {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (chart) {
      setError(null);
      // Clean up common AI hallucinations in Mermaid
      const cleanedChart = chart
        .replace(/^[ \t]*graph [TLR][D]/gm, "graph TD")
        .replace(/^\s+|\s+$/g, "");

      mermaid
        .render(
          `mermaid-${Math.random().toString(36).substring(2, 9)}`,
          cleanedChart,
        )
        .then(({ svg }) => {
          setSvg(svg);
        })
        .catch((e) => {
          console.error("Mermaid render error:", e);
          setError("Invalid diagram syntax. Showing raw logic below.");
        });
    }
  }, [chart]);

  if (error) {
    return (
      <div className="my-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
        <div className="flex items-center gap-2 mb-2 text-destructive font-bold text-xs">
          <AlertCircle className="h-3 w-3" /> {error}
        </div>
        <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap bg-black/20 p-2 rounded border border-white/5">
          {chart}
        </pre>
      </div>
    );
  }

  return (
    <div className="my-4 p-4 rounded-xl bg-black/20 border border-white/5 overflow-x-auto shadow-inner transition-all duration-500 hover:border-primary/20">
      <div
        className="flex justify-center"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
});

Mermaid.displayName = "Mermaid";

interface MessageBubbleProps {
  msg: ChatMessage;
  onInsertCode: (code: string) => void;
}

const MessageBubble = memo(({ msg, onInsertCode }: MessageBubbleProps) => {
  const isAssistant = msg.role === "assistant";
  const isUser = msg.role === "user";
  const isSystem = msg.role === "system";

  const markdownComponents = useMemo(
    () => ({
      code({ node, inline, className, children, ...props }: any) {
        const match = /language-(\w+)/.exec(className || "");
        const codeStr = String(children).replace(/\n$/, "");
        if (!inline && match && match[1] === "mermaid") {
          return <Mermaid chart={codeStr} />;
        }
        const isBlock = !inline && match;
        const isJava = match && match[1] === "java";
        if (isBlock) {
          return (
            <div className="relative group/code mt-2 mb-2">
              <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover/code:opacity-100 transition-opacity z-10">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10"
                  onClick={() => {
                    navigator.clipboard.writeText(codeStr);
                    toast.success("Copied to clipboard");
                  }}
                  title="Copy code"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                {isJava && (
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-7 w-7 bg-primary/30 hover:bg-primary/50 backdrop-blur-md border border-primary/30"
                    onClick={() => onInsertCode(codeStr)}
                    title="Insert into editor"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5 text-white" />
                  </Button>
                )}
              </div>
              <pre
                className="!bg-[#0d1117] !text-gray-100 rounded-xl p-4 overflow-x-auto text-[11.5px] font-mono border border-white/10"
                {...props}
              >
                <code className="!text-gray-100 font-mono">{children}</code>
              </pre>
            </div>
          );
        }
        return (
          <code
            className="bg-secondary/40 text-primary px-1 py-0.5 rounded text-[11px] font-mono"
            {...props}
          >
            {children}
          </code>
        );
      },
    }),
    [onInsertCode],
  );

  return (
    <div
      className={`mb-4 flex flex-col group ${isUser ? "items-end" : "items-start"}`}
    >
      <div className="flex items-center gap-2 mb-1 px-1">
        {isAssistant && (
          <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm">
            <Brain className="h-3 w-3 text-primary" />
          </div>
        )}
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
          {isUser ? "You" : isAssistant ? "AI Architect" : "System"}
        </span>
      </div>

      <div
        className={`relative max-w-[95%] rounded-2xl px-4 py-3 text-sm shadow-sm transition-all duration-300 backdrop-blur-md border ${
          isUser
            ? "bg-primary/90 text-primary-foreground border-primary/20 rounded-tr-none"
            : isSystem
              ? "bg-warning/10 text-warning border-warning/20 rounded-tl-none italic"
              : "bg-card/50 text-card-foreground border-panel-border rounded-tl-none"
        }`}
      >
        {isAssistant ? (
          <div
            className="prose prose-sm max-w-none dark:prose-invert text-[12.5px] leading-relaxed 
            [&_pre]:mt-3 [&_pre]:mb-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-[#0d1117] [&_pre]:p-4 [&_pre]:border [&_pre]:border-white/10 [&_pre]:shadow-inner [&_pre]:text-gray-100
            [&_code]:font-mono [&_code]:text-[11.5px] [&_code]:text-gray-100 [&_table]:mt-3 [&_table]:mb-3 [&_table]:border-collapse [&_th]:bg-secondary/20 [&_th]:p-2 [&_td]:p-2 [&_td]:border [&_td]:border-panel-border"
          >
            <ReactMarkdown components={markdownComponents}>
              {msg.content}
            </ReactMarkdown>
          </div>
        ) : (
          <span>{msg.content}</span>
        )}
      </div>
    </div>
  );
});

MessageBubble.displayName = "MessageBubble";

interface AIChatPanelProps {
  code: string;
  problemId: string | null;
  aiEnabled?: boolean;
}

// Quick action bar removed by design — all AI features live in the upper "AI" dropdown.
// Internal prompt sentinels still used (dispatched from the workspace dropdown):
//   __dry_run__ (Logic Trace), __hints__ (Hints), __optimal__ (Optimal Approach),
//   __mistakes__ (Find Bugs), __patterns__ (Patterns), __generate_tests__ (handled in workspace),
//   __analyze__ (Complexity Analysis).


const AIChatPanel = ({
  code,
  problemId,
  aiEnabled = true,
}: AIChatPanelProps) => {
  const [backendOnline, setBackendOnline] = useState(true);
  const [checking, setChecking] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isTutorMode, setIsTutorMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const check = async () => {
      setChecking(true);
      const online = await checkBackendStatus();
      setBackendOnline(online);
      setChecking(false);
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleExplain = (e: any) => {
      const prompt = e.detail || "__analyze__";
      handleSend(prompt);
    };
    window.addEventListener("trigger-explain", handleExplain);
    return () => window.removeEventListener("trigger-explain", handleExplain);
  }, [code, backendOnline, problemId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const speak = (text: string) => {
    if (!isVoiceEnabled) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      text.replace(/```[\s\S]*?```/g, "").replace(/[*#]/g, ""),
    );
    utterance.rate = 1.1;
    window.speechSynthesis.speak(utterance);
  };

  const addMessage = (
    role: ChatMessage["role"],
    content: string,
  ): ChatMessage => {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
    if (role === "assistant") speak(content);
    return msg;
  };

  const handleInsertCode = useCallback((newCode: string) => {
    window.dispatchEvent(new CustomEvent("update-code", { detail: newCode }));
    toast.success("Code inserted into editor!");
  }, []);

  const handleSend = async (customPrompt?: string) => {
    const text = customPrompt || input.trim();
    if (!text || isLoading) return;

    if (!backendOnline) {
      addMessage(
        "system",
        "⚠️ AI service is unavailable. Server may be waking up. Please try again in a moment.",
      );
      return;
    }

    if (!customPrompt) setInput("");
    setIsLoading(true);

    // Build a compact transcript of the recent conversation so follow-up
    // questions ("now give me the code", etc.) stay grounded in prior context.
    const buildHistory = (limit = 8) => {
      const recent = messages.slice(-limit);
      if (recent.length === 0) return "";
      const lines = recent.map(
        (m) => `${m.role === "user" ? "USER" : m.role === "assistant" ? "AI" : "SYSTEM"}: ${m.content.slice(0, 1200)}`,
      );
      return `\n\n=== Recent conversation (most recent last) ===\n${lines.join("\n\n")}\n=== End conversation ===`;
    };

    try {
      if (text === "__analyze__") {
        addMessage("user", "🔍 Run Deep Java Analysis");
        const result = await analyzeCode(code, problemId);
        addMessage("assistant", result.summary);
      } else if (text === "__dry_run__") {
        // LOGIC TRACE: explain the user's CURRENT code line-by-line, marking
        // which steps are correct and which contain errors. Not a brute/optimal
        // suggestion — purely an explanation of what the user wrote.
        addMessage("user", "⚙️ Logic Trace — explain my code step by step");
        const prompt =
          `LOGIC TRACE MODE.\n` +
          `Walk through the Java code below line-by-line / block-by-block.\n` +
          `For each meaningful step:\n` +
          `  • State exactly what that line/block does.\n` +
          `  • Mark it ✅ Correct, ⚠️ Suspicious, or ❌ Error and explain why.\n` +
          `  • Show how key variables change (use a small markdown table when useful).\n` +
          `Do NOT rewrite the code. Do NOT propose a brute/better/optimal solution.\n` +
          `Focus only on explaining and validating the user's own code.\n` +
          `If the code is empty, say so and ask the user to write some code first.`;
        const result = await aiChat(code, prompt, problemId);
        addMessage("assistant", result);
      } else if (text === "__hints__") {
        // HINTS: give exactly ONE hint per click, up to 4 total.
        if (hintLevel >= 4) {
          addMessage("user", "💡 Hint");
          addMessage(
            "assistant",
            `### All 4 hints used\n\nYou've already received the maximum of 4 hints for this problem. Try the **Optimal** option in the AI menu for the recommended approach, or ask a specific question in the chat.`,
          );
        } else {
          const nextLevel = hintLevel + 1;
          addMessage("user", `💡 Hint ${nextLevel} of 4`);
          const prompt =
            `HINT MODE — Give ONLY hint #${nextLevel} of 4 (progressive).\n` +
            `Hint 1 = nudge about the data structure / pattern to consider.\n` +
            `Hint 2 = describe the high-level approach in 2–3 sentences (no code).\n` +
            `Hint 3 = outline the algorithm steps as a short bullet list (no code).\n` +
            `Hint 4 = pseudocode-level outline (still no full Java solution).\n` +
            `Return ONLY hint ${nextLevel}. Do not include other hints. Keep it short and focused.`;
          const hint = await aiChat(code, prompt, problemId);
          addMessage(
            "assistant",
            `### 💡 Hint ${nextLevel} of 4\n\n${hint}\n\n_${4 - nextLevel} hint${4 - nextLevel === 1 ? "" : "s"} remaining._`,
          );
          setHintLevel(nextLevel);
        }
      } else if (text === "__optimal__" || text === "__solution_optimal__") {
        // OPTIMAL: give the optimal APPROACH NAME + LOGIC ONLY, no code.
        // Follow-up "give me the code" in chat will use the conversation history.
        addMessage("user", "🏆 Optimal Approach");
        const prompt =
          `OPTIMAL APPROACH MODE — DO NOT WRITE ANY CODE.\n` +
          `Respond in this exact structure:\n` +
          `### 🏆 Optimal Approach: <name of the approach / algorithm>\n` +
          `**Time:** O(...)  •  **Space:** O(...)\n\n` +
          `**Why this is optimal:** 2–3 sentences.\n\n` +
          `**Logic / intuition:**\n` +
          `- step-by-step bullet list explaining the algorithm in plain English.\n\n` +
          `**Key data structures:** comma-separated list.\n\n` +
          `Do NOT include any Java code, pseudocode blocks, or code fences. ` +
          `If the user later asks for the code in chat, you will provide it then.`;
        const result = await aiChat(code, prompt, problemId);
        addMessage("assistant", result);
      } else if (text === "__mistakes__") {
        // FIND BUGS: report bugs only, no full corrected code.
        addMessage("user", "🐛 Find Bugs");
        const prompt =
          `BUG-FINDING MODE.\n` +
          `Review the Java code below and report ONLY the bugs / issues you find.\n` +
          `For each bug, output:\n` +
          `  • **Location:** line number or method name + the offending snippet (≤ 1 line).\n` +
          `  • **Type:** compile error / runtime error / logic bug / edge-case miss / performance.\n` +
          `  • **Why it's wrong:** 1–2 sentences.\n` +
          `  • **How to fix (described in words):** short description, NO code block.\n\n` +
          `Strict rules:\n` +
          `  - Do NOT output the corrected full code.\n` +
          `  - Do NOT output method-level rewrites.\n` +
          `  - At most 1-line code snippets when quoting the bug.\n` +
          `If the user asks for the fixed code in a follow-up message, you may provide it then.`;
        const result = await aiChat(code, prompt, problemId);
        addMessage("assistant", result);
      } else if (text === "__patterns__") {
        // PATTERNS: list applicable patterns + identify the pattern in user's code + verdict.
        addMessage("user", "📚 Patterns");
        const prompt =
          `PATTERN ANALYSIS MODE.\n` +
          `Respond in this exact structure (markdown):\n\n` +
          `### 📚 Patterns Applicable to This Problem\n` +
          `Bullet list of every relevant DSA pattern (e.g. Two Pointers, Sliding Window, Hash Map, ` +
          `Binary Search, BFS/DFS, DP, Greedy, Backtracking, Heap, Union-Find, Monotonic Stack, etc.). ` +
          `For each: 1-line reason it could apply.\n\n` +
          `### 🔍 Pattern Detected in Your Code\n` +
          `If the user has written code, name the pattern they're currently using. ` +
          `If the editor is empty or no clear pattern, say so.\n\n` +
          `### ✅ Is It Optimal?\n` +
          `Compare the user's pattern to the best applicable pattern and give a clear verdict ` +
          `(Optimal / Sub-optimal / Brute-force) with a 1–2 sentence justification. ` +
          `If sub-optimal, name the better pattern — but do NOT write code.`;
        const result = await aiChat(code, prompt, problemId);
        addMessage("assistant", result);
      } else if (text === "__generate_tests__" || text === "__testcases__") {
        // Test-case generation is handled by the workspace (auto-adds to the
        // Tests tab). We just acknowledge here.
        addMessage("user", "🧪 Generate Test Cases");
        addMessage(
          "assistant",
          `Generating test cases and adding them to the **Tests** tab. They'll run together with the built-in cases when you click **Run Tests** or **Submit**.`,
        );
      } else {
        addMessage("user", text);
        const history = buildHistory();
        const tutorPrefix = isTutorMode
          ? `(TUTOR MODE: Do NOT give direct code or answers. Ask guiding questions, point out logic gaps, and encourage the user to find the solution. Use Socratic method.)\n`
          : "";
        const finalPrompt = `${tutorPrefix}Use the recent conversation below as context (especially any prior "Optimal Approach", "Find Bugs", or "Patterns" responses) when answering. If the user is asking for code that follows a previously-discussed approach, produce that exact approach.${history}\n\nUSER NEW MESSAGE: ${text}`;
        const response = await aiChat(code, finalPrompt, problemId);
        addMessage("assistant", response);
      }

    } catch (err: any) {
      console.error("AI Chat Error:", err);
      addMessage(
        "system",
        `⚠️ ${err.message || "AI service is temporarily unavailable."}`,
      );
    }

    setIsLoading(false);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setHintLevel(0);
    window.speechSynthesis.cancel();
  };

  return (
    <div className="flex h-full flex-col bg-ide-sidebar overflow-hidden relative">
      <div className="flex items-center justify-between border-b border-panel-border bg-gradient-to-r from-background to-secondary/10 px-4 py-3 backdrop-blur-xl z-20">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 shadow-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity blur-md" />
            <Brain className="h-4 w-4 text-primary animate-pulse relative z-10" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-widest text-primary leading-none drop-shadow-[0_0_8px_rgba(var(--primary),0.4)]">
              AI Architect
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">
              High-Level Java Mentor
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 rounded-full transition-all duration-300 ${isVoiceEnabled ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
            onClick={() => {
              setIsVoiceEnabled(!isVoiceEnabled);
              if (isVoiceEnabled) window.speechSynthesis.cancel();
              toast.info(
                `Voice Tutor ${!isVoiceEnabled ? "Enabled" : "Disabled"}`,
              );
            }}
            title="Toggle Voice Tutor"
          >
            {isVoiceEnabled ? (
              <Volume2 className="h-3.5 w-3.5" />
            ) : (
              <VolumeX className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 rounded-full transition-all duration-300 ${isTutorMode ? "text-emerald-500 bg-emerald-500/10" : "text-muted-foreground"}`}
            onClick={() => {
              setIsTutorMode(!isTutorMode);
              toast.success(
                `Tutor Mode ${!isTutorMode ? "Enabled" : "Disabled"}`,
              );
            }}
            title="Toggle Tutor Mode (Socratic Method)"
          >
            <GraduationCap className="h-3.5 w-3.5" />
          </Button>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
              onClick={clearChat}
              title="Clear workspace"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <div
            className={`h-2 w-2 rounded-full ${checking ? "bg-secondary animate-pulse" : backendOnline ? "bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]"}`}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-panel-border">
        {messages.length === 0 && !isLoading && (
          <div className="flex h-full flex-col items-center justify-center gap-5 text-center px-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
              <div className="relative p-7 rounded-3xl border border-primary/20 bg-card/10 backdrop-blur-md shadow-2xl">
                <Brain className="h-14 w-14 text-primary/40" />
              </div>
            </div>
            <div className="max-w-[220px] space-y-2">
              <p className="text-sm font-black text-foreground tracking-tight italic">
                E P I C A I M O D E
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                I can explain logic, hunt bugs, and even{" "}
                <span className="text-primary font-bold underline decoration-primary/30">
                  visualize your code
                </span>
                . How can I assist?
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            onInsertCode={handleInsertCode}
          />
        ))}

        {isLoading && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-3 px-1">
            <div className="flex items-center gap-2 text-[10px] text-primary font-bold uppercase tracking-widest">
              <Loader2 className="h-3 w-3 animate-spin" />
              Processing Epic Insights...
            </div>
            <Skeleton className="h-4 w-full rounded-full bg-primary/10" />
            <Skeleton className="h-4 w-5/6 rounded-full bg-primary/5" />
            <Skeleton className="h-4 w-4/6 rounded-full bg-primary/5" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick-action chip strip removed by design — all AI features now live
          in the upper "AI" dropdown in the workspace header. */}


      <div className="p-3 bg-ide-sidebar border-t border-panel-border backdrop-blur-2xl">
        <div className="relative group transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/20 rounded-2xl overflow-hidden shadow-sm border border-white/5 inset-shadow-sm">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about Java..."
            rows={1}
            className="w-full resize-none border-none bg-secondary/20 px-4 py-3.5 pr-14 text-xs placeholder:text-muted-foreground/50 focus:outline-none scrollbar-none min-h-[50px] max-h-[150px]"
          />
          <div className="absolute bottom-2.5 right-2.5">
            <Button
              size="icon"
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="h-9 w-9 rounded-xl bg-primary shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all duration-200 group-hover:shadow-primary/40"
            >
              <Send className="h-4 w-4 text-primary-foreground" />
            </Button>
          </div>
        </div>
        <p className="mt-2 text-[9px] text-center text-muted-foreground/40 font-bold uppercase tracking-tighter">
          Epic AI • Context-aware for {problemId || "current workspace"}
        </p>
      </div>
    </div>
  );
};

export default AIChatPanel;
