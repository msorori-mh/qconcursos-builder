import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "غير مصرح" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "غير مصرح" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const { subjectId, gradeId, questionCount, difficulty } = await req.json();
    if (!subjectId || !questionCount || !difficulty) {
      return new Response(JSON.stringify({ error: "بيانات ناقصة" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Fetch student progress for this subject's lessons
    const { data: lessons } = await adminClient
      .from("lessons")
      .select("id, title, sort_order")
      .eq("subject_id", subjectId)
      .order("sort_order");

    const lessonIds = (lessons || []).map((l: any) => l.id);

    const { data: progress } = lessonIds.length > 0
      ? await adminClient
          .from("user_progress")
          .select("lesson_id, completed, quiz_score")
          .eq("user_id", userId)
          .in("lesson_id", lessonIds)
      : { data: [] };

    // Identify weak areas
    const progressMap = new Map((progress || []).map((p: any) => [p.lesson_id, p]));
    const weakLessons: string[] = [];
    const incompleteLessons: string[] = [];

    for (const lesson of (lessons || [])) {
      const p = progressMap.get(lesson.id);
      if (!p || !p.completed) {
        incompleteLessons.push(lesson.title);
      } else if (p.quiz_score !== null && p.quiz_score < 70) {
        weakLessons.push(`${lesson.title} (${p.quiz_score}%)`);
      }
    }

    // Fetch existing questions for this subject
    const { data: existingQuestions } = await adminClient
      .from("questions")
      .select("id, question_text, options, correct_index, explanation")
      .eq("subject_id", subjectId)
      .limit(50);

    // Get subject name for context
    const { data: subject } = await adminClient
      .from("subjects")
      .select("name")
      .eq("id", subjectId)
      .single();

    const subjectName = subject?.name || "المادة";

    // Build AI prompt
    const difficultyLabel = difficulty === "easy" ? "سهل" : difficulty === "medium" ? "متوسط" : "صعب";
    const existingCount = Math.min((existingQuestions || []).length, Math.floor(questionCount / 2));
    const aiCount = questionCount - existingCount;

    let weaknessContext = "";
    if (weakLessons.length > 0) {
      weaknessContext += `\nالدروس التي حصل فيها الطالب على درجات ضعيفة: ${weakLessons.join("، ")}`;
    }
    if (incompleteLessons.length > 0) {
      weaknessContext += `\nالدروس التي لم يكملها الطالب: ${incompleteLessons.slice(0, 10).join("، ")}`;
    }

    const lessonTitles = (lessons || []).map((l: any) => l.title).join("، ");

    const prompt = `أنت مولّد أسئلة امتحانات تعليمية باللغة العربية لمادة "${subjectName}".
الدروس المتاحة: ${lessonTitles}
${weaknessContext}

المطلوب: أنشئ ${aiCount} سؤال اختيار من متعدد بمستوى صعوبة "${difficultyLabel}".
- ركّز على الدروس الضعيفة وغير المكتملة إن وُجدت.
- كل سؤال يجب أن يحتوي على 4 خيارات فقط.
- يجب أن تكون الأسئلة متنوعة وتغطي مواضيع مختلفة.`;

    const model = "google/gemini-2.5-flash";

    const toolSchema = {
      type: "function" as const,
      function: {
        name: "generate_questions",
        description: "Generate exam questions in Arabic",
        parameters: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question_text: { type: "string", description: "نص السؤال بالعربية" },
                  options: { type: "array", items: { type: "string" }, description: "4 خيارات" },
                  correct_index: { type: "number", description: "فهرس الإجابة الصحيحة (0-3)" },
                  explanation: { type: "string", description: "شرح مختصر للإجابة" },
                },
                required: ["question_text", "options", "correct_index", "explanation"],
                additionalProperties: false,
              },
            },
          },
          required: ["questions"],
          additionalProperties: false,
        },
      },
    };

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "أنت مساعد تعليمي متخصص في إنشاء أسئلة امتحانات للمنهج الدراسي اليمني." },
          { role: "user", content: prompt },
        ],
        tools: [toolSchema],
        tool_choice: { type: "function", function: { name: "generate_questions" } },
      }),
    });

    // Log usage
    await adminClient.from("ai_usage_logs").insert({
      user_id: userId,
      feature: "exam_prep",
      model,
      success: aiResponse.ok,
      error_message: aiResponse.ok ? null : `HTTP ${aiResponse.status}`,
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، حاول لاحقاً" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "رصيد غير كافٍ" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error("فشل توليد الأسئلة");
    }

    const aiData = await aiResponse.json();
    let aiQuestions: any[] = [];

    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        const parsed = JSON.parse(toolCall.function.arguments);
        aiQuestions = parsed.questions || [];
      }
    } catch (e) {
      console.error("Failed to parse AI response:", e);
    }

    // Combine existing + AI questions
    const finalQuestions: any[] = [];

    // Add subset of existing questions (shuffled)
    const shuffled = (existingQuestions || []).sort(() => Math.random() - 0.5);
    for (let i = 0; i < existingCount; i++) {
      const q = shuffled[i];
      if (!q) break;
      const opts = Array.isArray(q.options) ? q.options : JSON.parse(q.options as string);
      finalQuestions.push({
        id: q.id,
        question_text: q.question_text,
        options: opts,
        correct_index: q.correct_index,
        explanation: q.explanation,
      });
    }

    // Add AI-generated questions
    for (const q of aiQuestions) {
      if (finalQuestions.length >= questionCount) break;
      finalQuestions.push({
        id: crypto.randomUUID(),
        question_text: q.question_text,
        options: (q.options || []).slice(0, 4),
        correct_index: Math.min(Math.max(q.correct_index || 0, 0), 3),
        explanation: q.explanation || null,
      });
    }

    // Build analysis data
    const totalLessons = (lessons || []).length;
    const completedLessons = (progress || []).filter((p: any) => p.completed).length;
    const scores = (progress || []).filter((p: any) => p.quiz_score !== null).map((p: any) => p.quiz_score);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;

    return new Response(JSON.stringify({
      questions: finalQuestions,
      analysis: {
        totalLessons,
        completedLessons,
        avgScore,
        weakLessons: weakLessons.length,
        incompleteLessons: incompleteLessons.length,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-exam error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير معروف" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
