import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's weak topics
    const { data: problems } = await supabase
      .from('problems')
      .select('topic, solved')
      .eq('user_id', userId);

    const topicStats: Record<string, { total: number; solved: number }> = {};
    (problems || []).forEach((p: any) => {
      const t = p.topic || 'general';
      if (!topicStats[t]) topicStats[t] = { total: 0, solved: 0 };
      topicStats[t].total++;
      if (p.solved) topicStats[t].solved++;
    });

    // Find weakest topic
    const allTopics = ['Arrays', 'Strings', 'Trees', 'Graphs', 'Dynamic Programming', 'Sorting', 'Searching', 'Hash Maps', 'Recursion', 'Linked Lists'];
    let weakestTopic = allTopics[Math.floor(Math.random() * allTopics.length)];
    let minRatio = 1;

    for (const [topic, stats] of Object.entries(topicStats)) {
      const ratio = stats.total > 0 ? stats.solved / stats.total : 0;
      if (ratio < minRatio) {
        minRatio = ratio;
        weakestTopic = topic;
      }
    }

    // Topics not practiced yet
    const unpracticed = allTopics.filter(t => !topicStats[t]);
    if (unpracticed.length > 0) {
      weakestTopic = unpracticed[Math.floor(Math.random() * unpracticed.length)];
    }

    const difficulties = ['easy', 'medium', 'hard'];
    const difficulty = difficulties[Math.floor(Math.random() * 2)]; // bias toward easy/medium

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Generate a unique Java DSA practice problem. Return structured data." },
          { role: "user", content: `Generate a ${difficulty} Java DSA problem about "${weakestTopic}". Make it unique and educational.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_problem",
            description: "Return the generated problem",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                difficulty: { type: "string" },
                topic: { type: "string" },
                examples: { type: "array", items: { type: "object", properties: { input: { type: "string" }, output: { type: "string" } }, required: ["input", "output"] } },
                starterCode: { type: "string" },
                hint: { type: "string" },
              },
              required: ["title", "description", "difficulty", "topic", "examples", "starterCode"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_problem" } },
      }),
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "AI error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      const problem = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ problem, weakestTopic }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
