import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Play, FlaskConical, Send, Github, ExternalLink, Loader2,
  CheckCircle2, XCircle, Clock, Plus, Trash2, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import CodeEditor from "@/components/CodeEditor";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/user-context";
import {
  pushFileToGitHub,
  getGitHubSettings,
} from "@/lib/github";
import { useAutosave } from "@/hooks/use-autosave";

type TestCase = { input: string; expected: string };
type Difficulty = "Easy" | "Medium" | "Hard" | string;

interface DailyQuestion {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  topic: string;
  description: string;
  constraints: string[];
  examples: { input: string; output: string; explanation?: string }[];
  starter_code: string;
  visible_test_cases: TestCase[];
  daily_date: string | null;
}

interface RunResult {
  test: number;
  status: "PASSED" | "FAILED" | "RUNTIME_ERROR" | "TLE";
  input: string;
  expected: string;
  actual: string;
}

interface FailingCase {
  input: string;
  expected: string;
  yourOutput: string;
}

const DIFFICULTY_TONE: Record<string, string> = {
  Easy: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  Medium: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  Hard: "bg-destructive/10 text-destructive border-destructive/30",
};

const DailyQuestionPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const slug = params.get("slug");
  const { authUser } = useUser();

  const [questions, setQuestions] = useState<DailyQuestion[]>([]);
  const [active, setActive] = useState<DailyQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [tab, setTab] = useState<"description" | "submissions">("description");
  const [bottomTab, setBottomTab] = useState<"testcases" | "result">("testcases");

  // Cases shown to user (visible + auto-revealed failing cases)
  const [revealedCases, setRevealedCases] = useState<TestCase[]>([]);
  const [customCases, setCustomCases] = useState<TestCase[]>([]);

  const [runResults, setRunResults] = useState<RunResult[] | null>(null);
  const [testSummary, setTestSummary] = useState<{
    passed: number; total: number; runtime: number; failing: FailingCase | null;
  } | null>(null);
  const [submitResult, setSubmitResult] = useState<{
    status: string; passed: number; total: number; runtime: number; failing: FailingCase | null;
  } | null>(null);

  const [busy, setBusy] = useState<"" | "run" | "test" | "submit" | "push">("");
  const [submissions, setSubmissions] = useState<any[]>([]);

  // Load list + active
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("daily_questions" as any)
        .select(
          "id, slug, title, difficulty, topic, description, constraints, examples, starter_code, visible_test_cases, daily_date"
        )
        .eq("is_active", true)
        .order("daily_date", { ascending: false, nullsFirst: false });

      if (error) {
        console.error(error);
        toast({ title: "Failed to load daily questions", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      const list = (data ?? []) as unknown as DailyQuestion[];
      setQuestions(list);

      // Pick today's, or the slug from URL, or the first
      const todayStr = new Date().toISOString().slice(0, 10);
      const fromSlug = slug ? list.find((q) => q.slug === slug) : null;
      const today = list.find((q) => q.daily_date === todayStr);
      setActive(fromSlug ?? today ?? list[0] ?? null);
      setLoading(false);
    })();
  }, [slug]);

  // Load saved code + reset reveals when active changes
  useEffect(() => {
    if (!active) return;
    const localKey = `daily_code__${active.slug}`;
    const saved = localStorage.getItem(localKey);
    setCode(saved ?? active.starter_code ?? "");
    setRevealedCases(active.visible_test_cases ?? []);
    setCustomCases([]);
    setRunResults(null);
    setTestSummary(null);
    setSubmitResult(null);
    setBottomTab("testcases");

    // Try DB-saved code (auth users)
    if (authUser) {
      supabase
        .from("user_code_saves")
        .select("code")
        .eq("user_id", authUser.id)
        .eq("problem_key", `daily__${active.slug}`)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.code) {
            setCode(data.code);
            localStorage.setItem(localKey, data.code);
          }
        });
    }
  }, [active, authUser]);

  // Autosave
  useAutosave(
    code,
    async (val) => {
      if (!active) return;
      localStorage.setItem(`daily_code__${active.slug}`, val);
      if (!authUser) return;
      await supabase
        .from("user_code_saves")
        .upsert(
          { user_id: authUser.id, problem_key: `daily__${active.slug}`, code: val, language: "java" },
          { onConflict: "user_id,problem_key" } as any,
        );
    },
    { delay: 1500, key: active?.slug },
  );

  const loadSubmissions = useCallback(async () => {
    if (!authUser || !active) return;
    const { data } = await supabase
      .from("daily_submissions" as any)
      .select("*")
      .eq("user_id", authUser.id)
      .eq("question_id", active.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setSubmissions((data ?? []) as any[]);
  }, [authUser, active]);

  useEffect(() => {
    if (tab === "submissions") loadSubmissions();
  }, [tab, loadSubmissions]);

  // Edge function call
  const callJudge = async (mode: "run" | "test" | "submit") => {
    if (!active) return;
    if (!authUser) {
      toast({ title: "Login required", description: "Please log in to run code.", variant: "destructive" });
      return;
    }
    setBusy(mode);
    try {
      const { data, error } = await supabase.functions.invoke("daily-judge", {
        body: { questionId: active.id, code, mode },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      if (mode === "run") {
        setRunResults((data as any).results ?? []);
        setBottomTab("result");
      } else if (mode === "test") {
        const failing = (data as any).first_failing_case as FailingCase | null;
        setTestSummary({
          passed: (data as any).passed,
          total: (data as any).total,
          runtime: (data as any).runtime_ms,
          failing,
        });
        // LeetCode-style: append failing hidden case to visible list
        if (failing) {
          setRevealedCases((prev) => {
            if (prev.some((p) => p.input === failing.input && p.expected === failing.expected)) return prev;
            return [...prev, { input: failing.input, expected: failing.expected }];
          });
        }
        setBottomTab("result");
      } else {
        const failing = (data as any).first_failing_case as FailingCase | null;
        setSubmitResult({
          status: (data as any).status,
          passed: (data as any).passed,
          total: (data as any).total,
          runtime: (data as any).runtime_ms,
          failing,
        });
        if (failing) {
          setRevealedCases((prev) =>
            prev.some((p) => p.input === failing.input && p.expected === failing.expected)
              ? prev
              : [...prev, { input: failing.input, expected: failing.expected }],
          );
        }
        setBottomTab("result");
        if ((data as any).status === "ACCEPTED") {
          toast({ title: "Accepted ✓", description: `${(data as any).runtime_ms}ms` });
        } else {
          toast({
            title: (data as any).status.replace(/_/g, " "),
            description: `${(data as any).passed}/${(data as any).total} cases passed`,
            variant: "destructive",
          });
        }
      }
    } catch (e: any) {
      console.error(e);
      toast({
        title: `Failed to ${mode}`,
        description: e?.message ?? "Unknown error. Make sure JAVA_JUDGE_URL is configured.",
        variant: "destructive",
      });
    } finally {
      setBusy("");
    }
  };

  const openInLeetCode = async () => {
    if (!active) return;
    try {
      await navigator.clipboard.writeText(code);
    } catch {}
    toast({
      title: "Code copied to clipboard",
      description: "Paste it into LeetCode's editor.",
    });
    const url = `https://leetcode.com/problems/${active.slug}/`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const pushToGitHub = async () => {
    if (!active) return;
    const settings = getGitHubSettings();
    if (!settings?.token || !settings.repo) {
      toast({
        title: "GitHub not configured",
        description: "Set up GitHub sync in your profile first.",
        variant: "destructive",
      });
      return;
    }
    setBusy("push");
    try {
      const folder = (active.topic || "general").replace(/[^A-Za-z0-9_-]/g, "_");
      const file = `${active.slug.replace(/[^a-z0-9-]/gi, "-")}.java`;
      const path = `${folder}/${file}`;
      const result = await pushFileToGitHub(
        settings.token,
        settings.repo,
        path,
        code,
        `Solved: ${active.title}`,
      );
      if (!result.success) throw new Error(result.error);
      toast({ title: "Pushed to GitHub", description: path });
    } catch (e: any) {
      toast({ title: "GitHub push failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy("");
    }
  };

  const allCases = useMemo(
    () => [...revealedCases, ...customCases],
    [revealedCases, customCases],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!active) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-6">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center space-y-3">
            <h2 className="text-lg font-semibold">No daily question available</h2>
            <p className="text-sm text-muted-foreground">
              An admin needs to add a question to the <code>daily_questions</code> table.
            </p>
            <Button variant="outline" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tone = DIFFICULTY_TONE[active.difficulty] ?? "bg-muted text-foreground border-border";

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-3 py-2 gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Button size="icon" variant="ghost" onClick={() => navigate("/")} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-sm font-semibold truncate">{active.title}</h1>
          <Badge variant="outline" className={`text-[10px] ${tone}`}>{active.difficulty}</Badge>
          <Badge variant="outline" className="text-[10px]">{active.topic}</Badge>
          {active.daily_date && (
            <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">
              {active.daily_date}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="ghost" disabled={questions.length < 2}
            onClick={() => {
              const i = questions.findIndex((q) => q.id === active.id);
              const prev = questions[(i - 1 + questions.length) % questions.length];
              setActive(prev);
            }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" disabled={questions.length < 2}
            onClick={() => {
              const i = questions.findIndex((q) => q.id === active.id);
              const next = questions[(i + 1) % questions.length];
              setActive(next);
            }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-5 mx-1" />
          <Button size="sm" variant="outline" onClick={openInLeetCode} className="h-8 gap-1">
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">LeetCode</span>
          </Button>
          <Button size="sm" variant="outline" onClick={pushToGitHub} disabled={busy === "push"} className="h-8 gap-1">
            {busy === "push" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Github className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Push</span>
          </Button>
        </div>
      </header>

      {/* Main split */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 min-h-0">
        {/* Left: description / submissions */}
        <div className="flex flex-col border-r border-border min-h-0">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex flex-col flex-1 min-h-0">
            <TabsList className="rounded-none border-b border-border bg-transparent justify-start px-2 h-9 shrink-0">
              <TabsTrigger value="description" className="text-xs">Description</TabsTrigger>
              <TabsTrigger value="submissions" className="text-xs">Submissions</TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="flex-1 m-0 min-h-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4 max-w-none">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                    {active.description}
                  </p>

                  {active.examples?.length > 0 && (
                    <div className="space-y-3">
                      {active.examples.map((ex, i) => (
                        <div key={i} className="rounded-md border border-border bg-muted/30 p-3 space-y-1.5">
                          <p className="text-[11px] font-semibold uppercase text-muted-foreground">Example {i + 1}</p>
                          <pre className="text-xs font-mono whitespace-pre-wrap"><span className="text-muted-foreground">Input: </span>{ex.input}</pre>
                          <pre className="text-xs font-mono whitespace-pre-wrap"><span className="text-muted-foreground">Output: </span>{ex.output}</pre>
                          {ex.explanation && (
                            <pre className="text-xs font-mono whitespace-pre-wrap text-muted-foreground"><span>Explanation: </span>{ex.explanation}</pre>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {active.constraints?.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase text-muted-foreground">Constraints</p>
                      <ul className="text-xs font-mono space-y-0.5 list-disc pl-5">
                        {active.constraints.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="submissions" className="flex-1 m-0 min-h-0">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-1.5">
                  {submissions.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-4 text-center">No submissions yet.</p>
                  ) : submissions.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 px-3 py-2 rounded border border-border text-xs">
                      {s.status === "ACCEPTED" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                      )}
                      <Badge variant={s.status === "ACCEPTED" ? "default" : "destructive"} className="text-[10px]">
                        {s.status.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-muted-foreground">{s.passed_count}/{s.total_count}</span>
                      {s.runtime_ms != null && <span className="text-muted-foreground font-mono">{s.runtime_ms}ms</span>}
                      <span className="ml-auto text-muted-foreground">
                        {new Date(s.created_at).toLocaleString()}
                      </span>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setCode(s.code)}>
                        Load
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: editor + tests */}
        <div className="flex flex-col min-h-0">
          {/* Editor toolbar */}
          <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5 shrink-0">
            <Button size="sm" variant="outline" onClick={() => callJudge("run")} disabled={!!busy} className="h-8 gap-1">
              {busy === "run" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Run
            </Button>
            <Button size="sm" variant="outline" onClick={() => callJudge("test")} disabled={!!busy} className="h-8 gap-1">
              {busy === "test" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}
              Test
            </Button>
            <Button size="sm" onClick={() => callJudge("submit")} disabled={!!busy} className="h-8 gap-1 ml-auto">
              {busy === "submit" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Submit
            </Button>
          </div>

          {/* Editor */}
          <div className="flex-1 min-h-0">
            <CodeEditor code={code} onChange={setCode} />
          </div>

          {/* Bottom tests panel */}
          <div className="border-t border-border max-h-[40%] flex flex-col min-h-0">
            <Tabs value={bottomTab} onValueChange={(v) => setBottomTab(v as any)} className="flex flex-col flex-1 min-h-0">
              <TabsList className="rounded-none border-b border-border bg-transparent justify-start px-2 h-9 shrink-0">
                <TabsTrigger value="testcases" className="text-xs">Test Cases ({allCases.length})</TabsTrigger>
                <TabsTrigger value="result" className="text-xs">Result</TabsTrigger>
              </TabsList>

              <TabsContent value="testcases" className="flex-1 m-0 min-h-0">
                <ScrollArea className="h-full">
                  <div className="p-3 space-y-2">
                    {allCases.map((tc, i) => (
                      <div key={i} className="rounded border border-border p-2 space-y-1 bg-muted/20">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px]">Case {i + 1}</Badge>
                          {i >= revealedCases.length && (
                            <Button size="sm" variant="ghost" className="h-5 w-5 p-0 ml-auto"
                              onClick={() => setCustomCases((c) => c.filter((_, idx) => idx !== i - revealedCases.length))}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <Input
                          placeholder="Input"
                          value={tc.input}
                          readOnly={i < revealedCases.length}
                          onChange={(e) => {
                            const idx = i - revealedCases.length;
                            setCustomCases((c) => c.map((x, k) => k === idx ? { ...x, input: e.target.value } : x));
                          }}
                          className="h-7 text-xs font-mono"
                        />
                        <Input
                          placeholder="Expected output"
                          value={tc.expected}
                          readOnly={i < revealedCases.length}
                          onChange={(e) => {
                            const idx = i - revealedCases.length;
                            setCustomCases((c) => c.map((x, k) => k === idx ? { ...x, expected: e.target.value } : x));
                          }}
                          className="h-7 text-xs font-mono"
                        />
                      </div>
                    ))}
                    <Button size="sm" variant="outline" className="w-full h-8 gap-1"
                      onClick={() => setCustomCases((c) => [...c, { input: "", expected: "" }])}>
                      <Plus className="h-3 w-3" /> Add custom case
                    </Button>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="result" className="flex-1 m-0 min-h-0">
                <ScrollArea className="h-full">
                  <div className="p-3 space-y-2 text-xs">
                    {submitResult && (
                      <Card className={submitResult.status === "ACCEPTED" ? "border-emerald-500/40" : "border-destructive/40"}>
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            {submitResult.status === "ACCEPTED" ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive" />
                            )}
                            <span className="font-semibold">{submitResult.status.replace(/_/g, " ")}</span>
                            <Badge variant="outline" className="ml-auto text-[10px]">
                              {submitResult.passed}/{submitResult.total}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              <Clock className="h-3 w-3 mr-1" />{submitResult.runtime}ms
                            </Badge>
                          </div>
                          {submitResult.failing && (
                            <FailingCaseView f={submitResult.failing} />
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {testSummary && (
                      <Card>
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <FlaskConical className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">Hidden Tests</span>
                            <Badge variant="outline" className="ml-auto text-[10px]">
                              {testSummary.passed}/{testSummary.total}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              <Clock className="h-3 w-3 mr-1" />{testSummary.runtime}ms
                            </Badge>
                          </div>
                          {testSummary.failing && <FailingCaseView f={testSummary.failing} />}
                          {!testSummary.failing && (
                            <p className="text-emerald-600 text-xs">All hidden tests passed.</p>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {runResults && runResults.map((r) => (
                      <Card key={r.test} className={r.status === "PASSED" ? "border-emerald-500/40" : "border-destructive/40"}>
                        <CardContent className="p-3 space-y-1">
                          <div className="flex items-center gap-2">
                            {r.status === "PASSED" ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive" />
                            )}
                            <span className="font-semibold">Case {r.test}</span>
                            <Badge variant="outline" className="ml-auto text-[10px]">{r.status}</Badge>
                          </div>
                          <pre className="font-mono text-[11px] whitespace-pre-wrap"><span className="text-muted-foreground">Input: </span>{r.input}</pre>
                          <pre className="font-mono text-[11px] whitespace-pre-wrap"><span className="text-muted-foreground">Expected: </span>{r.expected}</pre>
                          <pre className="font-mono text-[11px] whitespace-pre-wrap"><span className="text-muted-foreground">Output: </span>{r.actual}</pre>
                        </CardContent>
                      </Card>
                    ))}

                    {!runResults && !testSummary && !submitResult && (
                      <p className="text-muted-foreground text-center p-4">
                        Press <kbd className="px-1 py-0.5 rounded border text-[10px]">Run</kbd>, <kbd className="px-1 py-0.5 rounded border text-[10px]">Test</kbd>, or <kbd className="px-1 py-0.5 rounded border text-[10px]">Submit</kbd> to see results.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

const FailingCaseView = ({ f }: { f: FailingCase }) => (
  <div className="rounded border border-destructive/30 bg-destructive/5 p-2 space-y-0.5">
    <p className="text-[10px] font-semibold uppercase text-destructive">First failing case</p>
    <pre className="font-mono text-[11px] whitespace-pre-wrap"><span className="text-muted-foreground">Input: </span>{f.input}</pre>
    <pre className="font-mono text-[11px] whitespace-pre-wrap"><span className="text-muted-foreground">Expected: </span>{f.expected}</pre>
    <pre className="font-mono text-[11px] whitespace-pre-wrap"><span className="text-muted-foreground">Your Output: </span>{f.yourOutput}</pre>
  </div>
);

export default DailyQuestionPage;
