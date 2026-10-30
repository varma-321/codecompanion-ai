import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { chatWithFeatureAI } from "../_shared/ai-pool.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      message,
      history,
      systemPrompt,
      code,
      problemId,
      problemTitle,
      problemDescription,
      problemExamples,
      problemConstraints,
      module,
    } = body || {};

    const messages: any[] = [];

    // 1. Base system prompt — defines personality + general chatbot capability
    messages.push({
      role: 'system',
      content: systemPrompt || [
        "You are JavaArena's in-app AI assistant. Behave like a normal, friendly chat assistant first.",
        "Answer exactly what the user asked — nothing more. Match their length: a greeting or small talk gets",
        "one or two short sentences with NO code, NO tutorial, NO unrequested example problem.",
        "Never invent a problem to demonstrate, and never dump code unless the user asked for code",
        "or the answer genuinely requires it.",
        "You always silently know the user's CURRENT editor code and problem context (given below).",
        "So when they say things like 'explain this code', 'fix this', 'why is this wrong', 'verify it',",
        "'more test cases', or 'is my solution correct', use that context directly without asking them to paste anything.",
        "If they ask about their code and the editor is empty, say so briefly.",
        "You can also answer general questions (Java, DSA theory, careers, or anything else) like a normal chatbot.",
        "When reviewing code, only flag genuine defects: compile errors, runtime errors, wrong output for a valid input,",
        "real missed edge cases allowed by the constraints, or complexity violations. Never report style, naming,",
        "formatting, comments, or preference-based nitpicks as bugs, and never invent hypothetical issues.",
        "If the code is correct, say it is correct.",
        "Prefer modern Java (JDK 17+). Use markdown, with fenced ```java``` blocks only for actual code.",
      ].join(' '),
    });

    // 2. Inject rich problem/code context as a separate system message
    const ctxParts: string[] = [];
    if (module) ctxParts.push(`MODULE: ${module}`);
    if (problemId) ctxParts.push(`PROBLEM_ID: ${problemId}`);
    if (problemTitle) ctxParts.push(`PROBLEM_TITLE: ${problemTitle}`);
    if (problemDescription) {
      ctxParts.push(`PROBLEM_DESCRIPTION:\n${String(problemDescription).slice(0, 4000)}`);
    }
    if (Array.isArray(problemExamples) && problemExamples.length > 0) {
      ctxParts.push(`EXAMPLES:\n${JSON.stringify(problemExamples).slice(0, 1500)}`);
    }
    if (Array.isArray(problemConstraints) && problemConstraints.length > 0) {
      ctxParts.push(`CONSTRAINTS:\n${problemConstraints.join('\n').slice(0, 1000)}`);
    }
    if (code) {
      ctxParts.push(`CURRENT_USER_CODE:\n\`\`\`java\n${String(code).slice(0, 6000)}\n\`\`\``);
    }

    if (ctxParts.length > 0) {
      messages.push({
        role: 'system',
        content:
          "==== CURRENT WORKSPACE CONTEXT ====\n" +
          ctxParts.join('\n\n') +
          "\n==== END CONTEXT ====\n" +
          "Always treat references like 'this problem', 'my code', 'this code', 'the question' as pointing to the data above. " +
          "Do NOT restate this context back to the user unless they ask about it.",
      });
    } else {
      messages.push({
        role: 'system',
        content: "No active problem or editor code is available. Treat this as an ordinary general conversation and keep replies brief unless asked for depth.",
      });
    }

    // 3. Recent history
    if (Array.isArray(history)) {
      messages.push(
        ...history.slice(-10).map((m: any) => ({
          role: m.role === 'system' ? 'system' : m.role === 'assistant' ? 'assistant' : 'user',
          content: String(m.content ?? ''),
        })),
      );
    }

    // 4. Current user message
    messages.push({ role: 'user', content: String(message ?? '') });

    const result = await chatWithFeatureAI('agent-chat', {
      messages,
      temperature: 0.3,
      maxTokens: 4096,
    });

    return new Response(
      JSON.stringify({ response: result.content, keyUsed: result.keyLabel, provider: result.provider }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
