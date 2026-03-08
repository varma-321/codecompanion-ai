import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { code, executionTimeMs, fullExplanation, problemTitle } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Full explanation mode - returns detailed markdown
    if (fullExplanation) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a DSA expert. Provide a comprehensive complexity analysis of the given code. Include:
1. **Time Complexity**: Detailed breakdown of each loop/recursion with Big-O notation
2. **Space Complexity**: Analysis of all data structures and auxiliary space used
3. **Why this complexity**: Step-by-step reasoning
4. **Bottlenecks**: Which part of the code dominates the complexity
5. **Optimization suggestions**: How to reduce time/space complexity with specific code changes
6. **Comparison**: How this approach compares to optimal solutions for this problem type
Format as clean markdown.`,
            },
            {
              role: "user",
              content: `${problemTitle ? `Problem: ${problemTitle}\n\n` : ''}Analyze this Java code in full detail:\n\n\`\`\`java\n${code}\n\`\`\``,
            },
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ error: "AI error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "Could not generate explanation.";
      return new Response(JSON.stringify({ fullExplanation: content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Quick analysis mode - returns structured JSON
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Analyze code complexity concisely. Return JSON only." },
          { role: "user", content: `Analyze this Java code's complexity.${executionTimeMs ? ` Execution took ${executionTimeMs}ms.` : ''}\n\n${code}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_analysis",
            description: "Return complexity analysis",
            parameters: {
              type: "object",
              properties: {
                timeComplexity: { type: "string", description: "Big-O time complexity e.g. O(n log n)" },
                spaceComplexity: { type: "string", description: "Big-O space complexity e.g. O(n)" },
                suggestion: { type: "string", description: "Brief optimization suggestion (1-2 sentences)" },
                optimizationPossible: { type: "boolean", description: "Whether a better approach exists" },
                betterApproach: { type: "string", description: "Brief description of a better approach if exists" },
              },
              required: ["timeComplexity", "spaceComplexity", "suggestion"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      return new Response(JSON.stringify(JSON.parse(toolCall.function.arguments)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ timeComplexity: "Unknown", spaceComplexity: "Unknown", suggestion: "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
