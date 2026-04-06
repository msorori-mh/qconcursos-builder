import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context, mode = "tutor" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Get user for logging
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    
    let userId: string | null = null;
    if (authHeader) {
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { authorization: authHeader } },
      });
      const { data: { user } } = await anonClient.auth.getUser();
      userId = user?.id ?? null;
    }

    let systemPrompt: string;

    if (mode === "support") {
      systemPrompt = `أنت "تنوير AI" — مساعد الدعم الفني لمنصة تنوير التعليمية في اليمن.
مهمتك مساعدة المستخدمين في حل المشاكل التقنية المتعلقة بالمنصة.

القواعد:
- أجب دائماً باللغة العربية الفصحى البسيطة
- ساعد في حل مشاكل تسجيل الدخول والاشتراكات والدفع
- اشرح كيفية استخدام ميزات المنصة (الدروس، الاختبارات، الجدول، التقارير)
- إذا كانت المشكلة تحتاج تدخل بشري، اطلب من المستخدم التواصل عبر صفحة "اتصل بنا"
- كن صبوراً وودوداً في التعامل
- لا تشارك معلومات تقنية حساسة عن بنية المنصة
- إذا كان السؤال تعليمياً، اقترح على المستخدم التبديل لوضع "المساعد التعليمي"

الميزات المتوفرة في المنصة:
- تصفح المواد والدروس حسب الصف الدراسي
- مشاهدة فيديوهات الدروس وتحميل ملفات PDF
- حل اختبارات تفاعلية بعد كل درس
- متابعة التقدم الدراسي والإنجازات
- جدول حصص أسبوعي مع تذكيرات
- خطط اشتراك مدفوعة مع طرق دفع متعددة
- نظام نقاط وشارات تحفيزية
- إرسال تقارير لأولياء الأمور`;
    } else {
      systemPrompt = `أنت "تنوير AI" — مساعد تعليمي ذكي لمنصة تنوير التعليمية في اليمن.
مهمتك مساعدة الطلاب في فهم دروسهم وحل أسئلتهم والإجابة على استفساراتهم الدراسية.

القواعد:
- أجب دائماً باللغة العربية الفصحى البسيطة
- اشرح بطريقة مبسطة ومناسبة لطلاب المدارس في اليمن
- استخدم أمثلة عملية من الحياة اليومية
- إذا كان السؤال يتعلق بمادة معينة، ركز على المنهج اليمني
- شجع الطالب وحفزه على التعلم
- إذا لم تكن متأكداً من إجابة، اعترف بذلك واقترح مصادر بديلة
- لا تجب على أسئلة غير تعليمية أو غير مناسبة
- إذا كان السؤال عن مشكلة تقنية، اقترح على المستخدم التبديل لوضع "الدعم الفني"`;

      if (context?.lessonTitle) {
        systemPrompt += `\n\nالطالب يدرس حالياً الدرس: "${context.lessonTitle}"`;
        if (context.subjectName) systemPrompt += ` في مادة "${context.subjectName}"`;
        if (context.lessonContent) systemPrompt += `\n\nملخص الدرس:\n${context.lessonContent.slice(0, 2000)}`;
      }
    }

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
          ...messages,
        ],
        stream: true,
      }),
    });

    // Log AI usage
    if (userId) {
      supabase.from("ai_usage_logs").insert({
        user_id: userId,
        feature: mode === "support" ? "ai_support" : "ai_tutor",
        model,
        success: response.ok,
        error_message: response.ok ? null : `HTTP ${response.status}`,
      }).then(() => {});
    }

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
