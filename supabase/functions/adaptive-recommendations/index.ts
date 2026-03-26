import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { authorization: authHeader || "" } },
    });
    const serviceClient = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [progressRes, lessonsRes, subjectsRes, questionsRes, profileRes] = await Promise.all([
      supabase.from("user_progress").select("lesson_id, completed, quiz_score, completed_at").eq("user_id", user.id),
      supabase.from("lessons").select("id, title, subject_id, sort_order"),
      supabase.from("subjects").select("id, name, grade_id"),
      supabase.from("questions").select("id, lesson_id").not("lesson_id", "is", null),
      supabase.from("profiles").select("grade_id").eq("user_id", user.id).single(),
    ]);

    const progress = progressRes.data || [];
    const lessons = lessonsRes.data || [];
    const subjects = subjectsRes.data || [];
    const questions = questionsRes.data || [];
    const gradeId = profileRes.data?.grade_id;

    const gradeSubjects = gradeId ? subjects.filter((s: any) => s.grade_id === gradeId) : subjects;

    const progressMap = new Map(progress.map((p: any) => [p.lesson_id, p]));
    const questionsPerLesson = new Map<string, number>();
    questions.forEach((q: any) => {
      questionsPerLesson.set(q.lesson_id, (questionsPerLesson.get(q.lesson_id) || 0) + 1);
    });

    const subjectAnalysis = gradeSubjects.map((subject: any) => {
      const subjectLessons = lessons
        .filter((l: any) => l.subject_id === subject.id)
        .sort((a: any, b: any) => a.sort_order - b.sort_order);
      
      const completedLessons = subjectLessons.filter((l: any) => progressMap.get(l.id)?.completed);
      const incompleteLessons = subjectLessons.filter((l: any) => !progressMap.get(l.id)?.completed);
      
      const quizScores = subjectLessons
        .map((l: any) => progressMap.get(l.id)?.quiz_score)
        .filter((s: any) => s != null) as number[];
      
      const avgScore = quizScores.length > 0 
        ? Math.round(quizScores.reduce((a: number, b: number) => a + b, 0) / quizScores.length) 
        : null;

      const weakLessons = subjectLessons.filter((l: any) => {
        const p = progressMap.get(l.id);
        if (!p?.completed) return true;
        if (p.quiz_score != null && p.quiz_score < 70) return true;
        return false;
      });

      const reviewPriority = subjectLessons
        .filter((l: any) => {
          const p = progressMap.get(l.id);
          const hasQuestions = (questionsPerLesson.get(l.id) || 0) > 0;
          return hasQuestions && (!p?.quiz_score || p.quiz_score < 80);
        })
        .map((l: any) => ({
          id: l.id, title: l.title,
          score: progressMap.get(l.id)?.quiz_score ?? null,
          questionsCount: questionsPerLesson.get(l.id) || 0,
        }));

      return {
        subjectId: subject.id, subjectName: subject.name,
        totalLessons: subjectLessons.length, completedCount: completedLessons.length,
        completionPct: subjectLessons.length > 0 ? Math.round((completedLessons.length / subjectLessons.length) * 100) : 0,
        avgScore, weakLessonsCount: weakLessons.length,
        nextLesson: incompleteLessons[0] ? { id: incompleteLessons[0].id, title: incompleteLessons[0].title } : null,
        reviewPriority: reviewPriority.slice(0, 3),
      };
    });

    const performanceData = {
      totalSubjects: subjectAnalysis.length,
      overallCompletion: subjectAnalysis.length > 0
        ? Math.round(subjectAnalysis.reduce((a: number, s: any) => a + s.completionPct, 0) / subjectAnalysis.length) : 0,
      subjects: subjectAnalysis,
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let aiRecommendations = null;
    const model = "google/gemini-3-flash-preview";

    if (LOVABLE_API_KEY && subjectAnalysis.length > 0) {
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content: `أنت مستشار تعليمي ذكي. حلل أداء الطالب وقدم توصيات مخصصة.
أعد الإجابة بصيغة JSON:
{
  "overallAssessment": "تقييم عام في جملتين",
  "strengths": ["نقطة قوة 1", "نقطة قوة 2"],
  "weaknesses": ["نقطة ضعف 1"],
  "recommendations": [
    { "type": "review|practice|advance", "subject": "اسم المادة", "action": "ما يجب فعله", "priority": "high|medium|low" }
  ],
  "motivationalMessage": "رسالة تحفيزية قصيرة"
}`,
              },
              { role: "user", content: `بيانات الطالب:\n${JSON.stringify(performanceData, null, 2)}` },
            ],
            response_format: { type: "json_object" },
          }),
        });

        // Log AI usage
        serviceClient.from("ai_usage_logs").insert({
          user_id: user.id,
          feature: "adaptive_recommendations",
          model,
          success: aiResponse.ok,
          error_message: aiResponse.ok ? null : `HTTP ${aiResponse.status}`,
        }).then(() => {});

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          try { aiRecommendations = JSON.parse(content); } catch { aiRecommendations = null; }
        }
      } catch (e) {
        console.error("AI recommendation error:", e);
      }
    }

    return new Response(JSON.stringify({ performance: performanceData, ai: aiRecommendations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("adaptive-recommendations error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
