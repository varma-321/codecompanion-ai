import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { code } = await req.json();
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
            content: `You are a test case generator for Java DSA problems. Given a Java function, generate 5 diverse test cases including edge cases.

IMPORTANT: Each test case must have MULTIPLE INPUT VARIABLES matching the function parameters.

For example, if the function is:
public static int[] twoSum(int[] nums, int target)

Then each test case should have inputs for BOTH "nums" and "target":
{
  "inputs": { "nums": "[2,7,11,15]", "target": "9" },
  "expectedOutput": "[0,1]"
}

Another example for:
public static int binarySearch(int[] arr, int target)

{
  "inputs": { "arr": "[1,3,5,7,9]", "target": "5" },
  "expectedOutput": "2"
}

All input values must be STRING representations. Arrays as "[1,2,3]", integers as "5", strings as "hello".`
          },
          {
            role: "user",
            content: `Generate 5 diverse test cases for this Java function:\n\n${code}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_test_cases",
              description: "Return generated test cases with multi-variable inputs",
              parameters: {
                type: "object",
                properties: {
                  testCases: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        inputs: {
                          type: "object",
                          description: "Map of parameter name to string value, e.g. {\"nums\": \"[1,2,3]\", \"target\": \"5\"}"
                        },
                        expectedOutput: { type: "string" }
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
      return new Response(JSON.stringify({ testCases: args.testCases }), {
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
