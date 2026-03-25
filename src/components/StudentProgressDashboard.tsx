import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, CheckCircle2, Award, TrendingUp, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface SubjectProgress {
  subjectId: string;
  subjectName: string;
  gradeName: string;
  totalLessons: number;
  completedLessons: number;
  quizScores: number[];
  avgScore: number;
  completionPercent: number;
}

const StudentProgressDashboard = () => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<SubjectProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadProgress();
  }, [user]);

  const loadProgress = async () => {
    if (!user) return;

    const [progressRes, lessonsRes, subjectsRes, gradesRes] = await Promise.all([
      supabase.from("user_progress").select("lesson_id, completed, quiz_score").eq("user_id", user.id),
      supabase.from("lessons").select("id, subject_id"),
      supabase.from("subjects").select("id, name, grade_id"),
      supabase.from("grades").select("id, name"),
    ]);

    const progressData = progressRes.data || [];
    const lessonsData = lessonsRes.data || [];
    const subjectsData = subjectsRes.data || [];
    const gradesData = gradesRes.data || [];

    const gradeMap = Object.fromEntries(gradesData.map((g: any) => [g.id, g.name]));
    const progressMap = new Map(progressData.map((p: any) => [p.lesson_id, p]));

    // Build per-subject progress
    const result: SubjectProgress[] = subjectsData
      .map((sub: any) => {
        const subLessons = lessonsData.filter((l: any) => l.subject_id === sub.id);
        if (subLessons.length === 0) return null;

        const completedLessons = subLessons.filter((l: any) => {
          const p = progressMap.get(l.id);
          return p?.completed;
        }).length;

        const quizScores = subLessons
          .map((l: any) => progressMap.get(l.id)?.quiz_score)
          .filter((s: any) => s != null) as number[];

        const avgScore = quizScores.length > 0
          ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
          : 0;

        const completionPercent = Math.round((completedLessons / subLessons.length) * 100);

        return {
          subjectId: sub.id,
          subjectName: sub.name,
          gradeName: gradeMap[sub.grade_id] || "",
          totalLessons: subLessons.length,
          completedLessons,
          quizScores,
          avgScore,
          completionPercent,
        };
      })
      .filter(Boolean)
      .filter((s: any) => s.completedLessons > 0 || s.quizScores.length > 0) as SubjectProgress[];

    // Sort by completion descending
    result.sort((a, b) => b.completionPercent - a.completionPercent);
    setSubjects(result);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const totalCompleted = subjects.reduce((s, sub) => s + sub.completedLessons, 0);
  const totalLessons = subjects.reduce((s, sub) => s + sub.totalLessons, 0);
  const overallPercent = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;
  const allScores = subjects.flatMap((s) => s.quizScores);
  const overallAvg = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 50) return "text-accent";
    return "text-destructive";
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-5">
      <h2 className="flex items-center gap-2 text-lg font-bold text-card-foreground">
        <TrendingUp className="h-5 w-5 text-primary" /> لوحة التقدم
      </h2>

      {subjects.length === 0 ? (
        <p className="text-center text-muted-foreground py-6">لم تبدأ أي مادة بعد. ابدأ التعلم الآن!</p>
      ) : (
        <>
          {/* Overall summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-primary/5 p-4 text-center">
              <Target className="mx-auto mb-1.5 h-5 w-5 text-primary" />
              <p className="text-2xl font-bold text-card-foreground">{overallPercent}%</p>
              <p className="text-xs text-muted-foreground">نسبة الإكمال الكلية</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{totalCompleted}/{totalLessons} درس</p>
            </div>
            <div className="rounded-xl bg-accent/5 p-4 text-center">
              <Award className="mx-auto mb-1.5 h-5 w-5 text-accent" />
              <p className={`text-2xl font-bold ${overallAvg > 0 ? scoreColor(overallAvg) : "text-muted-foreground"}`}>
                {overallAvg > 0 ? `${overallAvg}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">معدل الاختبارات</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{allScores.length} اختبار</p>
            </div>
          </div>

          {/* Per-subject breakdown */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-card-foreground">التقدم حسب المادة</h3>
            {subjects.map((sub) => (
              <div key={sub.subjectId} className="rounded-xl border border-border p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <BookOpen className="h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-card-foreground truncate">{sub.subjectName}</p>
                      <p className="text-[11px] text-muted-foreground">{sub.gradeName}</p>
                    </div>
                  </div>
                  {sub.avgScore > 0 && (
                    <div className="text-left shrink-0">
                      <p className={`text-sm font-bold ${scoreColor(sub.avgScore)}`}>{sub.avgScore}%</p>
                      <p className="text-[10px] text-muted-foreground">معدل الدرجات</p>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {sub.completedLessons}/{sub.totalLessons} درس
                    </span>
                    <span className="font-medium text-card-foreground">{sub.completionPercent}%</span>
                  </div>
                  <Progress value={sub.completionPercent} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default StudentProgressDashboard;
