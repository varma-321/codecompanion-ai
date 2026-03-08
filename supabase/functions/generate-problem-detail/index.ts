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

Generate complete LeetCode-style problem details for Java DSA problems with COMPREHENSIVE test cases.

CRITICAL TEST CASE REQUIREMENTS:
- Generate exactly 20 test cases that thoroughly validate correctness
- Test cases MUST cover ALL of the following categories:

1. BASIC CASES (3-4): Simple examples that match the problem description
2. EDGE CASES (4-5): Empty arrays, single elements, null/zero inputs, minimum valid inputs
3. BOUNDARY CONDITIONS (3-4): Maximum constraints, minimum constraints, off-by-one scenarios
4. SPECIAL PATTERNS (3-4): All same elements, sorted input, reverse sorted, alternating patterns
5. NEGATIVE/TRICKY CASES (3-4): Negative numbers, duplicates, no valid answer scenarios
6. STRESS CASES (2-3): Larger inputs (arrays of 50-100 elements) to test efficiency

Each test case input value must be a STRING representation. Arrays as "[1,2,3]", integers as "5", strings as "\"hello\"".
The expected output must exactly match what System.out.println() would produce in Java.

For array outputs: use Arrays.toString format like "[1, 2, 3]" 
For 2D arrays: use Arrays.deepToString format like "[[1, 2], [3, 4]]"
For lists: use toString format like "[1, 2, 3]"
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
This should match the REAL LeetCode problem if it exists. Include full description, constraints, examples with explanations, starter code, and 20 comprehensive test cases covering all edge cases, boundaries, and stress scenarios.`
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_problem_detail",
            description: "Return the complete problem detail with comprehensive test cases",
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
                      expected: { type: "string" },
                      category: { 
                        type: "string",
                        description: "Test category: basic, edge, boundary, pattern, tricky, or stress"
                      }
                    },
                    required: ["inputs", "expected"]
                  },
                  description: "20 comprehensive test cases covering basic, edge, boundary, pattern, tricky, and stress scenarios"
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
                  description: "3-4 progressive hints to help solve the problem"
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
