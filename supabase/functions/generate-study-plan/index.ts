import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { dayOfWeek } = await req.json();
    const targetDay = dayOfWeek ?? new Date().getDay();

    const { data: schedule } = await supabase
      .from("weekly_schedule")
      .select("*")
      .eq("user_id", user.id)
      .eq("day_of_week", targetDay)
      .order("period_number");

    if (!schedule || schedule.length === 0) {
      return new Response(JSON.stringify({
        hasPlan: false,
        message: "لا يوجد جدول حصص لهذا اليوم. أضف جدولك الأسبوعي أولاً.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, grade_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: progress } = await supabase
      .from("user_progress")
      .select("lesson_id, completed, quiz_score")
      .eq("user_id", user.id);

    const completedCount = progress?.filter(p => p.completed)?.length ?? 0;
    const avgScore = progress?.filter(p => p.quiz_score != null)
      .reduce((acc, p, _, arr) => acc + (p.quiz_score! / arr.length), 0) ?? 0;

    const subjectNames = schedule.map(s => s.subject_name).join("، ");
    const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `أنت مساعد دراسي ذكي لمنصة "تنوير" التعليمية اليمنية. مهمتك مساعدة الطالب في تنظيم مراجعته اليومية بناءً على حصصه الدراسية.

قواعد مهمة:
- استخدم اللغة العربية الفصحى البسيطة
- كن مشجعاً وإيجابياً
- قدم نصائح عملية وقابلة للتنفيذ
- اقترح أوقات محددة للمراجعة
- نوّع بين أساليب المراجعة (قراءة، حل تمارين، ملخصات، اختبارات تجريبية)
- اجعل الخطة واقعية ولا تزيد عن 2-3 ساعات مراجعة
- أجب بصيغة JSON فقط`;

    const userPrompt = `الطالب: ${profile?.full_name || "طالب"}
اليوم: ${dayNames[targetDay]}
المواد المقررة اليوم: ${subjectNames}
عدد الحصص: ${schedule.length}
عدد الدروس المكتملة في المنصة: ${completedCount}
متوسط درجات الاختبارات: ${Math.round(avgScore)}%

أنشئ خطة مراجعة يومية مخصصة لهذا الطالب. أجب بـ JSON بالتنسيق التالي:
{
  "greeting": "تحية شخصية قصيرة للطالب",
  "summary": "ملخص قصير عن يوم الطالب الدراسي",
  "studyBlocks": [
    {
      "subject": "اسم المادة",
      "duration": "المدة المقترحة مثل: 30 دقيقة",
      "method": "أسلوب المراجعة",
      "tips": "نصيحة مخصصة للمادة",
      "priority": "high أو medium أو low"
    }
  ],
  "motivationalTip": "نصيحة تحفيزية ختامية",
  "examSuggestion": "اقتراح اختبار تجريبي إن وجد"
}`;

    const model = "google/gemini-2.5-flash";
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
        temperature: 0.7,
      }),
    });

    // Log AI usage
    serviceClient.from("ai_usage_logs").insert({
      user_id: user.id,
      feature: "study_plan",
      model,
      success: response.ok,
      error_message: response.ok ? null : `HTTP ${response.status}`,
    }).then(() => {});

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز الحد المسموح، حاول مرة أخرى لاحقاً." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إضافة رصيد للاستمرار." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content ?? "";

    let plan;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      plan = JSON.parse(jsonMatch[1]!.trim());
    } catch {
      plan = { greeting: "مرحباً!", summary: content, studyBlocks: [], motivationalTip: "", examSuggestion: "" };
    }

    return new Response(JSON.stringify({
      hasPlan: true,
      schedule: schedule.map(s => ({ period: s.period_number, subject: s.subject_name })),
      plan,
      dayName: dayNames[targetDay],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("generate-study-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
