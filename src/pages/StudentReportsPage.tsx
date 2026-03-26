import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import SEOHead from "@/components/SEOHead";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3, BookOpen, CheckCircle2, Award, Target,
  TrendingUp, Clock, Star, Trophy,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

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

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 65%, 60%)",
  "hsl(200, 80%, 50%)",
];

const StudentReportsPage = () => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<SubjectProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [certificatesCount, setCertificatesCount] = useState(0);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    const [progressRes, lessonsRes, subjectsRes, gradesRes, certsRes] = await Promise.all([
      supabase.from("user_progress").select("lesson_id, completed, quiz_score, completed_at").eq("user_id", user.id),
      supabase.from("lessons").select("id, subject_id"),
      supabase.from("subjects").select("id, name, grade_id"),
      supabase.from("grades").select("id, name"),
      supabase.from("certificates").select("id").eq("user_id", user.id),
    ]);

    setCertificatesCount(certsRes.data?.length || 0);

    const progressData = progressRes.data || [];
    const lessonsData = lessonsRes.data || [];
    const subjectsData = subjectsRes.data || [];
    const gradesData = gradesRes.data || [];

    const gradeMap = Object.fromEntries(gradesData.map((g: any) => [g.id, g.name]));
    const progressMap = new Map(progressData.map((p: any) => [p.lesson_id, p]));

    const result: SubjectProgress[] = subjectsData
      .map((sub: any) => {
        const subLessons = lessonsData.filter((l: any) => l.subject_id === sub.id);
        if (subLessons.length === 0) return null;

        const completedLessons = subLessons.filter((l: any) => progressMap.get(l.id)?.completed).length;
        const quizScores = subLessons
          .map((l: any) => progressMap.get(l.id)?.quiz_score)
          .filter((s: any) => s != null) as number[];

        const avgScore = quizScores.length > 0
          ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length) : 0;

        return {
          subjectId: sub.id,
          subjectName: sub.name,
          gradeName: gradeMap[sub.grade_id] || "",
          totalLessons: subLessons.length,
          completedLessons,
          quizScores,
          avgScore,
          completionPercent: Math.round((completedLessons / subLessons.length) * 100),
        };
      })
      .filter(Boolean)
      .filter((s: any) => s.completedLessons > 0 || s.quizScores.length > 0) as SubjectProgress[];

    result.sort((a, b) => b.completionPercent - a.completionPercent);
    setSubjects(result);
    setLoading(false);
  };

  const totalCompleted = subjects.reduce((s, sub) => s + sub.completedLessons, 0);
  const totalLessons = subjects.reduce((s, sub) => s + sub.totalLessons, 0);
  const overallPercent = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;
  const allScores = subjects.flatMap((s) => s.quizScores);
  const overallAvg = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-destructive";
  };

  const barChartData = subjects.map((s) => ({
    name: s.subjectName.length > 12 ? s.subjectName.slice(0, 12) + "…" : s.subjectName,
    إكمال: s.completionPercent,
    اختبارات: s.avgScore,
  }));

  const pieData = [
    { name: "مكتمل", value: totalCompleted },
    { name: "متبقي", value: Math.max(0, totalLessons - totalCompleted) },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="تقاريري — تنوير" description="عرض تقارير التقدم والأداء الدراسي" canonical="/reports" noIndex />
      <Navbar />

      <div className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-hero-gradient">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">تقاريري</h1>
            <p className="text-sm text-muted-foreground">ملخص أدائك وتقدمك الدراسي</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : subjects.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <h2 className="text-lg font-semibold text-foreground mb-2">لم تبدأ التعلم بعد</h2>
            <p className="text-muted-foreground">ابدأ بمشاهدة الدروس وحل الاختبارات لتظهر تقاريرك هنا</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryCard
                icon={<Target className="h-5 w-5 text-primary" />}
                value={`${overallPercent}%`}
                label="نسبة الإكمال"
                sub={`${totalCompleted}/${totalLessons} درس`}
                bg="bg-primary/5"
              />
              <SummaryCard
                icon={<Award className="h-5 w-5 text-amber-500" />}
                value={overallAvg > 0 ? `${overallAvg}%` : "—"}
                valueClass={overallAvg > 0 ? scoreColor(overallAvg) : "text-muted-foreground"}
                label="معدل الاختبارات"
                sub={`${allScores.length} اختبار`}
                bg="bg-amber-500/5"
              />
              <SummaryCard
                icon={<BookOpen className="h-5 w-5 text-blue-500" />}
                value={String(subjects.length)}
                label="مواد نشطة"
                sub="قيد الدراسة"
                bg="bg-blue-500/5"
              />
              <SummaryCard
                icon={<Trophy className="h-5 w-5 text-green-500" />}
                value={String(certificatesCount)}
                label="شهادات"
                sub="مكتسبة"
                bg="bg-green-500/5"
              />
            </div>

            {/* Charts Row */}
            <div className="grid md:grid-cols-3 gap-4">
              {/* Bar Chart */}
              <div className="md:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-card">
                <h3 className="text-sm font-semibold text-card-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  الأداء حسب المادة
                </h3>
                <div className="h-64" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="إكمال" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="اختبارات" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pie Chart */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <h3 className="text-sm font-semibold text-card-foreground mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  نسبة الإنجاز
                </h3>
                <div className="h-48" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        <Cell fill="hsl(var(--primary))" />
                        <Cell fill="hsl(var(--muted))" />
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-center text-2xl font-bold text-foreground">{overallPercent}%</p>
                <p className="text-center text-xs text-muted-foreground">من إجمالي الدروس</p>
              </div>
            </div>

            {/* Per-Subject Detail */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h3 className="text-sm font-semibold text-card-foreground mb-4 flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                تفاصيل المواد
              </h3>
              <div className="space-y-3">
                {subjects.map((sub, i) => (
                  <div key={sub.subjectId} className="rounded-xl border border-border p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white text-xs font-bold"
                          style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        >
                          {i + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-card-foreground truncate">{sub.subjectName}</p>
                          <p className="text-[11px] text-muted-foreground">{sub.gradeName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 text-left">
                        {sub.avgScore > 0 && (
                          <div>
                            <p className={`text-sm font-bold ${scoreColor(sub.avgScore)}`}>{sub.avgScore}%</p>
                            <p className="text-[10px] text-muted-foreground">معدل</p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-card-foreground">{sub.completionPercent}%</p>
                          <p className="text-[10px] text-muted-foreground">إكمال</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {sub.completedLessons}/{sub.totalLessons} درس
                        </span>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {sub.quizScores.length} اختبار
                        </span>
                      </div>
                      <Progress value={sub.completionPercent} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const SummaryCard = ({
  icon, value, valueClass, label, sub, bg,
}: {
  icon: React.ReactNode;
  value: string;
  valueClass?: string;
  label: string;
  sub: string;
  bg: string;
}) => (
  <div className={`rounded-xl ${bg} p-4 text-center`}>
    <div className="mx-auto mb-1.5">{icon}</div>
    <p className={`text-2xl font-bold ${valueClass || "text-foreground"}`}>{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
  </div>
);

export default StudentReportsPage;
