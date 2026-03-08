import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { progressSummary, totalSolved, totalProblems } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a DSA study advisor. Given a student's topic-wise progress, provide a brief motivational insight (2-3 sentences) about their strengths, what to focus on next, and a study strategy tip. Be specific and actionable. Use markdown formatting.`
          },
          {
            role: "user",
            content: `Student has solved ${totalSolved}/${totalProblems} problems. Topic breakdown:\n${progressSummary}`
          }
        ],
      }),
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ insight: null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const insight = data.choices?.[0]?.message?.content || "";
    return new Response(JSON.stringify({ insight }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("adaptive-path error:", e);
    return new Response(JSON.stringify({ insight: null }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
