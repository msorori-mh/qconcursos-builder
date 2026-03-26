import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build system prompt based on context
    let systemPrompt = `أنت "تنوير AI" — مساعد تعليمي ذكي لمنصة تنوير التعليمية في اليمن.
مهمتك مساعدة الطلاب في فهم دروسهم وحل أسئلتهم والإجابة على استفساراتهم الدراسية.

القواعد:
- أجب دائماً باللغة العربية الفصحى البسيطة
- اشرح بطريقة مبسطة ومناسبة لطلاب المدارس في اليمن
- استخدم أمثلة عملية من الحياة اليومية
- إذا كان السؤال يتعلق بمادة معينة، ركز على المنهج اليمني
- شجع الطالب وحفزه على التعلم
- إذا لم تكن متأكداً من إجابة، اعترف بذلك واقترح مصادر بديلة
- لا تجب على أسئلة غير تعليمية أو غير مناسبة`;

    if (context?.lessonTitle) {
      systemPrompt += `\n\nالطالب يدرس حالياً الدرس: "${context.lessonTitle}"`;
      if (context.subjectName) systemPrompt += ` في مادة "${context.subjectName}"`;
      if (context.lessonContent) systemPrompt += `\n\nملخص الدرس:\n${context.lessonContent.slice(0, 2000)}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، حاول مرة أخرى لاحقاً" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "رصيد غير كافٍ، يرجى التواصل مع الإدارة" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "خطأ في خدمة الذكاء الاصطناعي" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-tutor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير معروف" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
