import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Calculator, Globe, FlaskConical, Atom, BookText, Dumbbell, Lock, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import SEOHead, { breadcrumbJsonLd } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const iconMap: Record<string, any> = {
  Calculator, Globe, FlaskConical, Atom, BookText, BookOpen, Dumbbell,
};

interface SubjectItem {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  lessons_count: number | null;
  semester: number | null;
}

interface SubjectProgress {
  completed: number;
  total: number;
}

const SubjectGrid = ({ subjects, gradeId, progressMap }: { subjects: SubjectItem[]; gradeId: string; progressMap: Record<string, SubjectProgress> }) => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {subjects.map((subject, i) => {
      const IconComp = iconMap[subject.icon || "BookOpen"] || BookOpen;
      const color = subject.color || "#3b82f6";
      const progress = progressMap[subject.id];
      const total = progress?.total || subject.lessons_count || 0;
      const completed = progress?.completed || 0;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      return (
        <Link
          key={subject.id}
          to={`/grades/${gradeId}/subjects/${subject.id}/lessons`}
          className="group opacity-0 animate-fade-in-up"
          style={{ animationDelay: `${i * 0.08}s` }}
        >
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl" style={{ backgroundColor: color + "18" }}>
                <IconComp className="h-7 w-7" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-card-foreground">{subject.name}</h3>
                <p className="text-sm text-muted-foreground">{total} درس</p>
              </div>
              {pct === 100 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              ) : (
                <ArrowLeft className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:-translate-x-1 shrink-0" />
              )}
            </div>
            {total > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span>{completed} / {total} درس مكتمل</span>
                  <span className="font-medium" style={{ color: pct > 0 ? color : undefined }}>{pct}%</span>
                </div>
                <Progress value={pct} className="h-1.5" />
              </div>
            )}
          </div>
        </Link>
      );
    })}
  </div>
);

const SubjectsPage = () => {
  const { gradeId } = useParams();
  const { user, profile, isAdmin, loading: authLoading } = useAuth();

  const shouldRedirect = !authLoading && !isAdmin && profile?.grade_id && profile.grade_id !== gradeId;

  const { data: grade } = useQuery({
    queryKey: ["grade", gradeId],
    queryFn: async () => {
      const { data, error } = await supabase.from("grades").select("id, name, slug, category").eq("id", gradeId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!gradeId,
  });

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ["subjects", gradeId],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id, name, slug, icon, color, lessons_count, semester").eq("grade_id", gradeId!).order("sort_order");
      if (error) throw error;
      return (data || []) as SubjectItem[];
    },
    enabled: !!gradeId,
  });

  // Get active subscription to check semester access
  const { data: activeSub } = useQuery({
    queryKey: ["active-subscription", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("id, status, semester, plan_id, subscription_plans(duration_type)")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);
      return data?.[0] || null;
    },
    enabled: !!user && !isAdmin,
  });

  // Fetch progress: completed lessons per subject
  const subjectIds = subjects.map((s) => s.id);
  const { data: progressData } = useQuery({
    queryKey: ["subject-progress", user?.id, subjectIds],
    queryFn: async () => {
      // Get all lessons for these subjects
      const { data: lessons } = await supabase
        .from("lessons")
        .select("id, subject_id")
        .in("subject_id", subjectIds);
      if (!lessons?.length) return {} as Record<string, SubjectProgress>;

      // Get completed progress
      const lessonIds = lessons.map((l) => l.id);
      const { data: progress } = await supabase
        .from("user_progress")
        .select("lesson_id")
        .eq("user_id", user!.id)
        .eq("completed", true)
        .in("lesson_id", lessonIds);

      const completedSet = new Set((progress || []).map((p) => p.lesson_id));

      // Build map
      const map: Record<string, SubjectProgress> = {};
      for (const s of subjects) {
        const subLessons = lessons.filter((l) => l.subject_id === s.id);
        map[s.id] = {
          total: subLessons.length,
          completed: subLessons.filter((l) => completedSet.has(l.id)).length,
        };
      }
      return map;
    },
    enabled: !!user && !isAdmin && subjectIds.length > 0,
  });

  const progressMap = progressData || {};

  const hasActiveSubscription = !!activeSub;
  const subscriptionSemester = activeSub?.semester;
  const isAnnual = (activeSub as any)?.subscription_plans?.duration_type === "annual";

  // All subjects are shown — semester filtering happens at lesson level
  const filteredSubjects = subjects;

  const gradeName = grade?.name || "الصف الدراسي";
  const isThirdSec = grade?.slug === "grade-12";
  const hasBranches = grade?.slug === "grade-11" || grade?.slug === "grade-12";

  const sciOnly = hasBranches ? filteredSubjects.filter((s) => !s.slug.endsWith("-lit")) : [];
  const litOnly = hasBranches ? filteredSubjects.filter((s) => s.slug.endsWith("-lit")) : [];

  if (shouldRedirect) {
    return <Navigate to={`/grades/${profile!.grade_id}/subjects`} replace />;
  }

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`مواد ${gradeName}`}
        description={`تصفح المواد الدراسية المتاحة لـ${gradeName} في منصة تنوير التعليمية.`}
        canonical={`/grades/${gradeId}/subjects`}
        jsonLd={breadcrumbJsonLd([
          { name: "الصفوف", url: "/grades" },
          { name: gradeName, url: `/grades/${gradeId}/subjects` },
        ])}
      />
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        <div className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/grades" className="hover:text-primary transition-colors">الصفوف</Link>
          <ArrowLeft className="h-3 w-3" />
          <span className="text-foreground font-medium">{gradeName}</span>
        </div>

        <div className="mb-10">
          {!isAdmin && (
            <p className="mb-3 text-lg text-muted-foreground">
              أهلاً <span className="font-bold text-foreground">{profile?.full_name || user?.user_metadata?.full_name || "طالب"}</span> 👋
            </p>
          )}
          <h1 className="mb-2 text-2xl font-bold text-foreground md:text-3xl">{gradeName}</h1>
          <p className="text-muted-foreground">اختر المادة الدراسية للبدء</p>
          {hasActiveSubscription && !isAdmin && subscriptionSemester && !isAnnual && (
            <p className="mt-2 text-sm text-primary font-medium">
              📅 اشتراكك يشمل مواد الفصل الدراسي {subscriptionSemester === 1 ? "الأول" : "الثاني"}
            </p>
          )}
          {hasActiveSubscription && !isAdmin && isAnnual && (
            <p className="mt-2 text-sm text-primary font-medium">
              📅 اشتراكك السنوي يشمل مواد الفصلين الدراسيين
            </p>
          )}
        </div>

        {filteredSubjects.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
            <p className="text-muted-foreground">لم تُضاف مواد لهذا الصف بعد</p>
          </div>
        ) : hasBranches ? (
          <>
            {sciOnly.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-4 text-lg font-bold text-foreground flex items-center gap-2">
                  <Atom className="h-5 w-5 text-primary" />
                  الفرع العلمي
                </h2>
                <SubjectGrid subjects={sciOnly} gradeId={gradeId!} progressMap={progressMap} />
              </div>
            )}
            {litOnly.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-4 text-lg font-bold text-foreground flex items-center gap-2">
                  <BookText className="h-5 w-5 text-accent" />
                  الفرع الأدبي
                </h2>
                <SubjectGrid subjects={litOnly} gradeId={gradeId!} progressMap={progressMap} />
              </div>
            )}
          </>
        ) : (
          <SubjectGrid subjects={filteredSubjects} gradeId={gradeId!} progressMap={progressMap} />
        )}

        {isThirdSec && (
          <div className="mt-10 rounded-2xl border-2 border-accent/30 bg-accent/5 p-6 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
                <BookOpen className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-bold text-foreground">النماذج الوزارية والاختبارات التجريبية</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">راجع نماذج الاختبارات الوزارية للسنوات السابقة واختبر نفسك باختبارات محاكاة</p>
            <Link to={`/grades/${gradeId}/exams`}>
              <button className="text-sm font-semibold text-accent hover:underline flex items-center gap-1">
                عرض النماذج الوزارية
                <ArrowLeft className="h-4 w-4" />
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubjectsPage;
