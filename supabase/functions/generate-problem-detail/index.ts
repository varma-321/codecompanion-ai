import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, difficulty, topic } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
            content: `You are an expert competitive programming problem writer. Generate complete LeetCode-style problem details for Java DSA problems. 
Return structured JSON via the tool call. Make the problem description detailed and clear like real LeetCode problems.
- Description should include the full problem statement, what to return, and edge case notes
- Constraints section should list realistic constraints (e.g., 1 <= nums.length <= 10^5)
- Include 2-3 examples with input, output, and explanation
- Provide 3-4 test cases covering edge cases
- Starter code must be a valid Java class with the correct method signature
- The function name, return type, and parameters must match the starter code exactly`
          },
          {
            role: "user",
            content: `Generate a complete LeetCode-style problem for: "${title}" (Difficulty: ${difficulty}, Topic: ${topic || 'General'}). 
This should match the real LeetCode problem if it exists. Include full description, constraints, examples with explanations, starter code, and test cases.`
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_problem_detail",
            description: "Return the complete problem detail",
            parameters: {
              type: "object",
              properties: {
                description: { 
                  type: "string", 
                  description: "Full problem description in markdown. Include the problem statement, what to return, and any special notes. Do NOT include examples or constraints here." 
                },
                constraints: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of constraints like '1 <= nums.length <= 10^5', '−10^9 <= nums[i] <= 10^9'"
                },
                examples: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      input: { type: "string" },
                      output: { type: "string" },
                      explanation: { type: "string" }
                    },
                    required: ["input", "output"]
                  },
                  description: "2-3 examples with input, output, and explanation"
                },
                starterCode: { 
                  type: "string", 
                  description: "Java starter code with correct class and method signature. Must be a complete compilable class." 
                },
                testCases: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      inputs: { 
                        type: "object",
                        description: "Map of parameter name to value string, e.g. {\"nums\": \"[1,2,3]\", \"target\": \"5\"}"
                      },
                      expected: { type: "string" }
                    },
                    required: ["inputs", "expected"]
                  },
                  description: "3-4 test cases including edge cases"
                },
                functionName: { type: "string" },
                returnType: { type: "string" },
                params: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      type: { type: "string" }
                    },
                    required: ["name", "type"]
                  }
                },
                hints: {
                  type: "array",
                  items: { type: "string" },
                  description: "2-3 progressive hints to help solve the problem"
                },
                approach: {
                  type: "string",
                  description: "Brief description of the optimal approach and its complexity"
                }
              },
              required: ["description", "constraints", "examples", "starterCode", "testCases", "functionName", "returnType", "params"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_problem_detail" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", status, t);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      const detail = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ detail }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Failed to generate" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-problem-detail error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
