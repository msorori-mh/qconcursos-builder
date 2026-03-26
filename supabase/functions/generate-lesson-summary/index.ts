import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lessonTitle, lessonContent, lessonId, regenerate } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!lessonTitle) {
      return new Response(JSON.stringify({ error: "lessonTitle is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, serviceKey);

    // Get user for logging
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader) {
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { authorization: authHeader } },
      });
      const { data: { user } } = await anonClient.auth.getUser();
      userId = user?.id ?? null;
    }

    // Check cache first (unless regenerate requested)
    if (lessonId && !regenerate) {
      const { data: cached } = await serviceClient
        .from("lesson_summaries")
        .select("summary, key_points, study_tip")
        .eq("lesson_id", lessonId)
        .maybeSingle();

      if (cached) {
        return new Response(JSON.stringify({
          summary: cached.summary,
          keyPoints: cached.key_points,
          studyTip: cached.study_tip,
          cached: true,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const systemPrompt = `أنت مساعد تعليمي متخصص في تلخيص الدروس لطلاب المدارس في اليمن.

مهمتك: أنشئ ملخصاً ذكياً ومركزاً للدرس التالي.

القواعد:
- اكتب باللغة العربية الفصحى البسيطة المناسبة لطلاب المدارس
- قسّم الملخص إلى نقاط رئيسية واضحة (3-7 نقاط)
- لكل نقطة: عنوان قصير + شرح مختصر في سطر أو سطرين
- ركّز على المفاهيم الأساسية والقوانين والتعريفات المهمة
- أضف نصائح للمذاكرة إن أمكن
- لا تكرر المعلومات
- اجعل الملخص مفيداً للمراجعة السريعة قبل الامتحان

أعد الإجابة بصيغة JSON بالشكل التالي:
{
  "summary": "ملخص عام في جملة أو جملتين",
  "keyPoints": [
    { "title": "عنوان النقطة", "detail": "شرح مختصر" }
  ],
  "studyTip": "نصيحة قصيرة للمذاكرة"
}`;

    const userPrompt = lessonContent
      ? `الدرس: ${lessonTitle}\n\nمحتوى الدرس:\n${lessonContent.substring(0, 4000)}`
      : `الدرس: ${lessonTitle}\n\nلا يوجد محتوى نصي متاح. أنشئ ملخصاً عاماً بناءً على عنوان الدرس فقط.`;

    const model = "google/gemini-3-flash-preview";
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    // Log AI usage
    if (userId) {
      serviceClient.from("ai_usage_logs").insert({
        user_id: userId,
        feature: "lesson_summary",
        model,
        success: response.ok,
        error_message: response.ok ? null : `HTTP ${response.status}`,
      }).then(() => {});
    }

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز الحد المسموح، حاول لاحقاً" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى شحن رصيد الذكاء الاصطناعي" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { summary: content, keyPoints: [], studyTip: "" };
    }

    // Cache the result
    if (lessonId) {
      serviceClient.from("lesson_summaries").upsert({
        lesson_id: lessonId,
        summary: parsed.summary || "",
        key_points: parsed.keyPoints || [],
        study_tip: parsed.studyTip || "",
        updated_at: new Date().toISOString(),
      }, { onConflict: "lesson_id" }).then(() => {});
    }

    return new Response(JSON.stringify({ ...parsed, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-lesson-summary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
