// Server-side judge for Daily Questions.
// Modes:
//   "run"    -> compile + execute against VISIBLE test cases only.
//   "test"   -> execute against HIDDEN test cases. Returns counts + first failing case (input/expected/your).
//   "submit" -> execute against ALL (visible + hidden). Persists submission. Returns ACCEPTED / WRONG_ANSWER / TLE / RUNTIME_ERROR.
//
// Hidden test cases NEVER leave this function except as a single revealed first-failing case.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TestCase {
  input: string;
  expected: string;
}

interface JudgeResult {
  status: "PASSED" | "FAILED" | "RUNTIME_ERROR" | "TLE";
  actual: string;
  runtime_ms?: number;
}

const JAVA_JUDGE_URL =
  Deno.env.get("JAVA_JUDGE_URL") ?? "http://localhost:8080/api/run-java";
const PER_CASE_TIMEOUT_MS = 8000;

async function runOne(code: string, tc: TestCase): Promise<JudgeResult> {
  const wrapped = wrapCode(code, tc.input);
  const t0 = Date.now();
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), PER_CASE_TIMEOUT_MS);
  try {
    const resp = await fetch(JAVA_JUDGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: wrapped, stdin: tc.input }),
      signal: ctrl.signal,
    });
    clearTimeout(to);
    if (!resp.ok) {
      return { status: "RUNTIME_ERROR", actual: `HTTP ${resp.status}`, runtime_ms: Date.now() - t0 };
    }
    const data = await resp.json();
    const out = String(data.output ?? "").trim();
    const err = String(data.error ?? "").trim();
    const runtime_ms = Date.now() - t0;
    if (err && !out) return { status: "RUNTIME_ERROR", actual: err.slice(0, 500), runtime_ms };
    const passed = out === tc.expected.trim();
    return { status: passed ? "PASSED" : "FAILED", actual: out, runtime_ms };
  } catch (e) {
    clearTimeout(to);
    const msg = (e as Error).name === "AbortError" ? "Time Limit Exceeded" : (e as Error).message;
    return { status: (e as Error).name === "AbortError" ? "TLE" : "RUNTIME_ERROR", actual: msg, runtime_ms: Date.now() - t0 };
  }
}

function wrapCode(userCode: string, _stdin: string): string {
  // The user code is expected to either include a `Main` class with main(),
  // or define a function that the existing judge harness wraps. We pass stdin
  // through to the judge service so the user's main() reads it.
  if (/class\s+Main\b/.test(userCode)) return userCode;
  return `import java.util.*;\nimport java.io.*;\n\npublic class Main {\n${userCode}\n}\n`;
}

serveHandler();

function serveHandler() {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
      const { questionId, code, mode } = await req.json();
      if (!questionId || typeof code !== "string" || !["run", "test", "submit"].includes(mode)) {
        return json({ error: "Invalid request" }, 400);
      }

      const auth = req.headers.get("Authorization") ?? "";
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      // Identify caller (token verified via supabase auth)
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: auth } } },
      );
      const { data: userRes } = await userClient.auth.getUser();
      const user = userRes?.user;
      if (!user) return json({ error: "Unauthorized" }, 401);

      // Load question (service role, includes hidden cases)
      const { data: q, error: qErr } = await supabase
        .from("daily_questions")
        .select("id, title, visible_test_cases, hidden_test_cases")
        .eq("id", questionId)
        .single();
      if (qErr || !q) return json({ error: "Question not found" }, 404);

      const visible = (q.visible_test_cases as TestCase[]) ?? [];
      const hidden = (q.hidden_test_cases as TestCase[]) ?? [];

      let cases: TestCase[];
      if (mode === "run") cases = visible;
      else if (mode === "test") cases = hidden;
      else cases = [...visible, ...hidden];

      if (cases.length === 0) return json({ error: "No test cases configured" }, 400);

      const results: JudgeResult[] = [];
      for (const tc of cases) {
        const r = await runOne(code, tc);
        results.push(r);
        if (mode === "submit" && r.status !== "PASSED") break; // short-circuit on submit
      }

      const passed = results.filter((r) => r.status === "PASSED").length;
      const total = cases.length;
      const totalRuntime = results.reduce((s, r) => s + (r.runtime_ms ?? 0), 0);

      let firstFailing: { input: string; expected: string; yourOutput: string } | null = null;
      const failIdx = results.findIndex((r) => r.status !== "PASSED");
      if (failIdx >= 0) {
        firstFailing = {
          input: cases[failIdx].input,
          expected: cases[failIdx].expected,
          yourOutput: results[failIdx].actual,
        };
      }

      // For "run" mode, return per-case results since they're already visible
      if (mode === "run") {
        return json({
          mode,
          passed,
          total,
          runtime_ms: totalRuntime,
          results: results.map((r, i) => ({
            test: i + 1,
            status: r.status,
            input: cases[i].input,
            expected: cases[i].expected,
            actual: r.actual,
          })),
        });
      }

      // For "test" mode, only reveal the first failing case (per spec)
      if (mode === "test") {
        return json({
          mode,
          passed,
          total,
          runtime_ms: totalRuntime,
          first_failing_case: firstFailing,
        });
      }

      // submit mode: classify + persist
      let status: string = "ACCEPTED";
      if (results.some((r) => r.status === "TLE")) status = "TIME_LIMIT_EXCEEDED";
      else if (results.some((r) => r.status === "RUNTIME_ERROR")) status = "RUNTIME_ERROR";
      else if (passed < total) status = "WRONG_ANSWER";

      await supabase.from("daily_submissions").insert({
        user_id: user.id,
        question_id: questionId,
        code,
        language: "java",
        status,
        runtime_ms: totalRuntime,
        passed_count: passed,
        total_count: total,
        first_failing_case: firstFailing,
      });

      return json({
        mode,
        status,
        passed,
        total,
        runtime_ms: totalRuntime,
        first_failing_case: firstFailing,
      });
    } catch (e) {
      console.error("daily-judge error:", e);
      return json({ error: (e as Error).message ?? "Internal error" }, 500);
    }
  });

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
