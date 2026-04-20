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
            content: `You are an expert competitive programming problem writer who creates problems identical to real LeetCode problems.

Generate complete LeetCode-style problem details for Java DSA problems with a SMALL SET of HIGH-QUALITY test cases.

CRITICAL TEST CASE REQUIREMENTS:
- Generate exactly 5 test cases, choosing only the highest-value cases
- The 5 cases together MUST cover:
  1. NORMAL CASE: Standard example matching the problem description
  2. EDGE CASE: Empty arrays, single elements, null/zero inputs
  3. BOUNDARY CASE: Maximum/minimum constraints, off-by-one scenarios
  4. LARGE INPUT CASE: Larger-than-typical input for performance testing
  5. CORNER CASE: Tricky or unusual input that catches common bugs

Each test case input value must be a STRING representation. Arrays as "[1,2,3]", integers as "5", strings as "\"hello\"".
The expected output must exactly match what System.out.println() would produce in Java for a CORRECT solution.

For array / list outputs: use Java toString formats like "[1, 2, 3]" (spaces after commas, like Arrays.toString / List.toString)
For 2D arrays: use Arrays.deepToString format like "[[1, 2], [3, 4]]"
For boolean: "true" or "false"
For strings: just the string without quotes

PROBLEM REQUIREMENTS:
- Description should be detailed and clear, matching real LeetCode if this problem exists
- Constraints should list realistic limits
- Include 2-3 examples with input, output, and explanation  
- Starter code must be a valid Java class with correct method signature
- The function name, return type, and parameters must match the starter code exactly`
          },
          {
            role: "user",
            content: `Generate a complete LeetCode-style problem for: "${title}" (Difficulty: ${difficulty}, Topic: ${topic || 'General'}). 
This should match the REAL LeetCode problem if it exists. Include full description, constraints, examples with explanations, starter code, and exactly 5 high-quality test cases covering normal, edge, boundary, large input, and corner cases.`
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_problem_detail",
            description: "Return the complete problem detail with 5 high-quality test cases",
            parameters: {
              type: "object",
              properties: {
                description: { 
                  type: "string", 
                  description: "Full problem description in markdown." 
                },
                constraints: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of constraints"
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
                  description: "Java starter code with correct class and method signature." 
                },
                testCases: {
                  type: "array",
                  maxItems: 5,
                  items: {
                    type: "object",
                    properties: {
                      inputs: { 
                        type: "object",
                        description: "Map of parameter name to value string"
                      },
                      expected: { type: "string" },
                      category: { 
                        type: "string",
                        description: "Test category: normal, edge, boundary, large_input, or corner"
                      }
                    },
                    required: ["inputs", "expected"]
                  },
                  description: "Exactly 5 high-quality test cases"
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
                  description: "3-4 progressive hints"
                },
                approach: {
                  type: "string",
                  description: "Brief description of the optimal approach"
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
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      // Strict validation: filter out test cases with missing inputs/expected
      if (Array.isArray(detail.testCases)) {
        detail.testCases = detail.testCases.filter((tc: any) => {
          if (!tc || typeof tc !== "object") return false;
          if (!tc.inputs || typeof tc.inputs !== "object") return false;
          const hasInputs = Object.values(tc.inputs).some(
            (v) => v !== null && v !== undefined && String(v).trim() !== ""
          );
          const expectedField = tc.expected ?? tc.expectedOutput;
          const hasExpected = expectedField !== undefined && String(expectedField).trim() !== "";
          return hasInputs && hasExpected;
        }).slice(0, 5);
      } else {
        detail.testCases = [];
      }

      // Fallback: derive test cases from examples when AI returned none.
      // Parse "name = value, name2 = value2" style example inputs into an inputs map.
      if (detail.testCases.length === 0 && Array.isArray(detail.examples) && Array.isArray(detail.params)) {
        const paramNames: string[] = detail.params.map((p: any) => p?.name).filter(Boolean);
        const derived = detail.examples.map((ex: any) => {
          const raw = String(ex?.input ?? "");
          const inputs: Record<string, string> = {};
          // Try "name = value" pattern split by commas at top level (best-effort).
          const assignments = raw.split(/,\s*(?=[a-zA-Z_]\w*\s*=)/);
          let matched = 0;
          for (const part of assignments) {
            const m = part.match(/^\s*([a-zA-Z_]\w*)\s*=\s*([\s\S]+?)\s*$/);
            if (m && paramNames.includes(m[1])) {
              inputs[m[1]] = m[2];
              matched++;
            }
          }
          // Fallback: assign whole raw string to the first param.
          if (matched === 0 && paramNames.length === 1) {
            inputs[paramNames[0]] = raw.replace(/^[a-zA-Z_]\w*\s*=\s*/, "");
          }
          return {
            inputs,
            expected: String(ex?.output ?? "").trim(),
            category: "normal",
          };
        }).filter((tc: any) => Object.keys(tc.inputs).length > 0 && tc.expected);
        detail.testCases = derived.slice(0, 5);
      }

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
