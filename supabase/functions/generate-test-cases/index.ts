import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { code, title, difficulty } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a test case generator for Java DSA problems. Generate exactly 5 high-quality test cases:

1. NORMAL CASE: A standard test case matching the problem description with typical inputs
2. EDGE CASE: Edge cases like empty arrays, single elements, null/zero inputs, minimum valid inputs
3. BOUNDARY CASE: Max/min constraints, large values, off-by-one scenarios
4. LARGE INPUT CASE: A test with larger-than-typical input to test performance
5. CORNER CASE: A tricky or unusual input that might catch common bugs

CRITICAL: Each test case must have MULTIPLE INPUT VARIABLES matching the function parameters.

For example, if the function is:
public static int[] twoSum(int[] nums, int target)

Then each test case should have inputs for BOTH "nums" and "target":
{
  "inputs": { "nums": "[2,7,11,15]", "target": "9" },
  "expectedOutput": "[0, 1]",
  "category": "normal"
}

All input values must be STRING representations. Arrays as "[1,2,3]", integers as "5", strings as "hello".
Expected output must exactly match what System.out.println() would produce in Java:
- Arrays: "[1, 2, 3]" (with spaces after commas, like Arrays.toString)
- 2D arrays: "[[1, 2], [3, 4]]" (like Arrays.deepToString)
- Booleans: "true" or "false"
- Strings: just the string without extra quotes`
          },
          {
            role: "user",
            content: `Generate 5 high-quality test cases (normal, edge, boundary, large input, corner) for this Java function${title ? ` (Problem: ${title}, Difficulty: ${difficulty || 'Medium'})` : ''}:\n\n${code}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_test_cases",
              description: "Return 5 high-quality test cases: normal, edge, boundary, large input, and corner case",
              parameters: {
                type: "object",
                properties: {
                  testCases: {
                    type: "array",
                    maxItems: 5,
                    items: {
                      type: "object",
                      properties: {
                        inputs: {
                          type: "object",
                          description: "Map of parameter name to string value"
                        },
                        expectedOutput: { type: "string" },
                        category: { 
                          type: "string",
                          description: "Test category: normal, edge, boundary, large_input, or corner"
                        }
                      },
                      required: ["inputs", "expectedOutput"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["testCases"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "return_test_cases" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      const args = JSON.parse(toolCall.function.arguments);
      // Strict validation: every test case must have non-empty inputs and expectedOutput
      const validCases = (args.testCases || []).filter((tc: any) => {
        if (!tc || typeof tc !== "object") return false;
        if (!tc.inputs || typeof tc.inputs !== "object") return false;
        const hasInputs = Object.values(tc.inputs).some(
          (v) => v !== null && v !== undefined && String(v).trim() !== ""
        );
        const hasExpected = tc.expectedOutput && String(tc.expectedOutput).trim() !== "";
        return hasInputs && hasExpected;
      }).slice(0, 5);
      return new Response(JSON.stringify({ testCases: validCases }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = data.choices?.[0]?.message?.content || "[]";
    const parsed = JSON.parse(content);
    return new Response(JSON.stringify({ testCases: Array.isArray(parsed) ? parsed : [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-test-cases error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
