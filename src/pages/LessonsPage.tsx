import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, FileText, HelpCircle, CheckCircle, Clock, Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import SEOHead, { breadcrumbJsonLd } from "@/components/SEOHead";

const LessonsPage = () => {
  const { gradeId, subjectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ["lessons", subjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, duration, is_free, slug")
        .eq("subject_id", subjectId!)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!subjectId,
  });

  const { data: hasSubscription = false } = useQuery({
    queryKey: ["subscription-check", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .limit(1);
      return !!data && data.length > 0;
    },
    enabled: !!user,
  });

  const { data: progress = {} } = useQuery({
    queryKey: ["user-progress", user?.id, subjectId],
    queryFn: async () => {
      const lessonIds = lessons.map((l) => l.id);
      if (lessonIds.length === 0) return {};
      const { data } = await supabase
        .from("user_progress")
        .select("lesson_id, completed")
        .eq("user_id", user!.id)
        .in("lesson_id", lessonIds);
      const map: Record<string, boolean> = {};
      data?.forEach((p) => { if (p.completed) map[p.lesson_id] = true; });
      return map;
    },
    enabled: !!user && lessons.length > 0,
  });

  const completedCount = Object.values(progress).filter(Boolean).length;

  const handleLessonClick = (lesson: typeof lessons[0], e: React.MouseEvent) => {
    if (!lesson.is_free && !hasSubscription) {
      e.preventDefault();
      navigate("/subscribe");
    }
  };

  if (isLoading) {
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
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        <div className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link to="/grades" className="hover:text-primary transition-colors">الصفوف</Link>
          <ArrowLeft className="h-3 w-3" />
          <Link to={`/grades/${gradeId}/subjects`} className="hover:text-primary transition-colors">المواد</Link>
          <ArrowLeft className="h-3 w-3" />
          <span className="text-foreground font-medium">الدروس</span>
        </div>

        <div className="mb-8">
          <h1 className="mb-2 text-2xl font-bold text-foreground">الدروس</h1>
          <p className="text-muted-foreground">{lessons.length} درس • {completedCount} مكتمل</p>
        </div>

        {lessons.length > 0 && (
          <div className="mb-8 rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">التقدم</span>
              <span className="font-semibold text-primary">
                {lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0}%
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-hero-gradient transition-all duration-500"
                style={{ width: `${lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {!hasSubscription && (
          <Link to="/subscribe">
            <div className="mb-6 rounded-2xl border border-accent/30 bg-accent/5 p-4 text-center transition-all hover:shadow-card">
              <p className="text-sm font-semibold text-accent">
                🔓 اشترك الآن للوصول لجميع الدروس المدفوعة
              </p>
            </div>
          </Link>
        )}

        <div className="space-y-3">
          {lessons.map((lesson, i) => {
            const completed = progress[lesson.id];
            const isFree = lesson.is_free;
            const locked = !isFree && !hasSubscription;

            return (
              <Link
                key={lesson.id}
                to={`/grades/${gradeId}/subjects/${subjectId}/lessons/${lesson.id}`}
                onClick={(e) => handleLessonClick(lesson, e)}
                className="block opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <div className={`group rounded-2xl border bg-card p-5 transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5 ${
                  completed ? "border-success/30" : "border-border"
                }`}>
                  <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      completed ? "bg-success/10" : isFree ? "bg-primary/10" : "bg-muted"
                    }`}>
                      {completed ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : isFree ? (
                        <Play className="h-5 w-5 text-primary" />
                      ) : (
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold ${completed ? "text-muted-foreground" : "text-card-foreground"}`}>
                        {lesson.title}
                      </h3>
                      <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                        {lesson.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {lesson.duration}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Play className="h-3.5 w-3.5" />
                          فيديو
                        </span>
                        <span className="flex items-center gap-1">
                          <HelpCircle className="h-3.5 w-3.5" />
                          أسئلة
                        </span>
                      </div>
                    </div>
                    {locked && (
                      <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">مدفوع</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to={`/grades/${gradeId}/subjects/${subjectId}/quiz`} className="flex-1">
            <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer">
              <HelpCircle className="mx-auto mb-2 h-8 w-8 text-primary" />
              <h3 className="font-bold text-card-foreground">بنك أسئلة الوحدة</h3>
              <p className="text-sm text-muted-foreground">أسئلة مراجعة شاملة</p>
            </div>
          </Link>
          <Link to={`/grades/${gradeId}/subjects/${subjectId}/exam`} className="flex-1">
            <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer">
              <FileText className="mx-auto mb-2 h-8 w-8 text-accent" />
              <h3 className="font-bold text-card-foreground">اختبار شامل</h3>
              <p className="text-sm text-muted-foreground">اختبر نفسك في الوحدة كاملة</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LessonsPage;
