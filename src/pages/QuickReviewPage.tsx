import { useState, useMemo, lazy, Suspense } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import ExamSimulator, { ExamQuestion } from "@/components/ExamSimulator";
import {
  ArrowLeft, Zap, BookOpen, CheckCircle2, XCircle, FileText,
  Play, ChevronDown, ChevronUp, Brain, Target, Clock, Sparkles,
} from "lucide-react";

const AiLessonSummary = lazy(() => import("@/components/AiLessonSummary"));

/* ─── Key Points Summary Card ─── */
const LessonSummaryCard = ({
  lesson,
  index,
}: {
  lesson: { id: string; title: string; content_text: string | null; questionsCount: number; userCompleted: boolean };
  index: number;
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-xl border border-border bg-card p-4 transition-all hover:shadow-card opacity-0 animate-fade-in-up"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${
            lesson.userCompleted 
              ? "bg-green-500/10 text-green-600" 
              : "bg-muted text-muted-foreground"
          }`}>
            {lesson.userCompleted ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-card-foreground">{lesson.title}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              {lesson.questionsCount > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {lesson.questionsCount} سؤال
                </span>
              )}
              {lesson.content_text && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  ملخص متاح
                </span>
              )}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 shrink-0"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {expanded && (
        <div className="mt-3">
          <Suspense fallback={<div className="flex justify-center py-4"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}>
            <AiLessonSummary lessonTitle={lesson.title} lessonContent={lesson.content_text} />
          </Suspense>
        </div>
      )}
    </div>
  );
};

/* ─── Main Page ─── */
const QuickReviewPage = () => {
  const { gradeId, subjectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [startQuiz, setStartQuiz] = useState(false);

  // Subject info
  const { data: subject } = useQuery({
    queryKey: ["subject", subjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name, slug")
        .eq("id", subjectId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!subjectId,
  });

  // Lessons with content
  const { data: lessons = [], isLoading: lessonsLoading } = useQuery({
    queryKey: ["review-lessons", subjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, content_text, sort_order")
        .eq("subject_id", subjectId!)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!subjectId,
  });

  // Questions for the subject (all lesson questions)
  const { data: allQuestions = [] } = useQuery({
    queryKey: ["review-questions", subjectId],
    queryFn: async () => {
      const lessonIds = lessons.map((l) => l.id);
      if (lessonIds.length === 0) return [];
      const { data, error } = await supabase
        .from("questions")
        .select("id, question_text, options, correct_index, explanation, lesson_id")
        .in("lesson_id", lessonIds)
        .order("sort_order");
      if (error) throw error;
      return (data || []).map((q: any) => ({
        ...q,
        options: typeof q.options === "string" ? JSON.parse(q.options) : q.options,
      }));
    },
    enabled: lessons.length > 0,
  });

  // User progress
  const { data: userProgress = [] } = useQuery({
    queryKey: ["review-progress", subjectId, user?.id],
    queryFn: async () => {
      const lessonIds = lessons.map((l) => l.id);
      if (lessonIds.length === 0) return [];
      const { data } = await supabase
        .from("user_progress")
        .select("lesson_id, completed, quiz_score")
        .eq("user_id", user!.id)
        .in("lesson_id", lessonIds);
      return data || [];
    },
    enabled: !!user && lessons.length > 0,
  });

  const progressMap = useMemo(() => {
    const map = new Map<string, { completed: boolean; quiz_score: number | null }>();
    userProgress.forEach((p) => map.set(p.lesson_id, p));
    return map;
  }, [userProgress]);

  const questionsPerLesson = useMemo(() => {
    const map = new Map<string, number>();
    allQuestions.forEach((q: any) => {
      map.set(q.lesson_id, (map.get(q.lesson_id) || 0) + 1);
    });
    return map;
  }, [allQuestions]);

  // Stats
  const completedCount = userProgress.filter((p) => p.completed).length;
  const totalLessons = lessons.length;
  const completionPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const lessonsWithContent = lessons.filter((l) => l.content_text).length;

  // Pick review questions: prioritize ones the student got wrong or hasn't seen
  const reviewQuestions: ExamQuestion[] = useMemo(() => {
    // Shuffle and take up to 20
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 20).map((q: any) => ({
      id: q.id,
      question_text: q.question_text,
      options: q.options,
      correct_index: q.correct_index,
      explanation: q.explanation,
    }));
  }, [allQuestions]);

  if (startQuiz && reviewQuestions.length > 0) {
    return (
      <div className="min-h-screen bg-background">
        <ExamSimulator
          questions={reviewQuestions}
          title={`مراجعة سريعة — ${subject?.name || ""}`}
          subtitle={`${reviewQuestions.length} سؤال مختار للمراجعة`}
          durationMinutes={0}
          practiceMode
          onExit={() => setStartQuiz(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`مراجعة سريعة — ${subject?.name || ""}`}
        description={`مراجعة سريعة لأهم النقاط والأسئلة في مادة ${subject?.name || ""} قبل الامتحان`}
      />
      <Navbar />
      <div className="container mx-auto px-4 py-6 md:py-10 max-w-3xl">
        {/* Breadcrumb */}
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link to={`/grades/${gradeId}/subjects`} className="hover:text-primary transition-colors">المواد</Link>
          <ArrowLeft className="h-3 w-3" />
          <Link to={`/grades/${gradeId}/subjects/${subjectId}/lessons`} className="hover:text-primary transition-colors">الدروس</Link>
          <ArrowLeft className="h-3 w-3" />
          <span className="text-foreground font-medium">مراجعة سريعة</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
              <Zap className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground md:text-2xl">مراجعة سريعة</h1>
              <p className="text-sm text-muted-foreground">{subject?.name}</p>
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "الدروس", value: totalLessons, icon: BookOpen, color: "text-primary" },
            { label: "مكتمل", value: completedCount, icon: CheckCircle2, color: "text-green-600" },
            { label: "ملخصات", value: lessonsWithContent, icon: FileText, color: "text-blue-600" },
            { label: "أسئلة", value: allQuestions.length, icon: Target, color: "text-accent" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-3 text-center shadow-card">
              <stat.icon className={`h-5 w-5 mx-auto mb-1 ${stat.color}`} />
              <p className="text-lg font-bold text-card-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Completion bar */}
        <div className="mb-8 rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-card-foreground">نسبة الإنجاز</span>
            <span className="text-sm font-bold text-primary">{completionPct}%</span>
          </div>
          <Progress value={completionPct} className="h-2" />
          {completionPct < 50 && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Brain className="h-3.5 w-3.5 text-accent" />
              ننصحك بإكمال المزيد من الدروس قبل المراجعة
            </p>
          )}
        </div>

        {/* Quick quiz button */}
        {reviewQuestions.length > 0 && (
          <div className="mb-8 rounded-xl border border-primary/20 bg-primary/5 p-5 text-center">
            <Brain className="h-8 w-8 text-primary mx-auto mb-2" />
            <h2 className="text-lg font-bold text-foreground mb-1">اختبار مراجعة سريع</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {reviewQuestions.length} سؤال مختار من جميع الدروس — وضع التدريب مع شرح فوري
            </p>
            <Button variant="hero" size="lg" className="gap-2" onClick={() => setStartQuiz(true)}>
              <Zap className="h-5 w-5" />
              ابدأ المراجعة
            </Button>
          </div>
        )}

        {/* Lessons summary */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            ملخص الدروس
          </h2>
          {lessonsLoading ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-2">
              {lessons.map((lesson, i) => (
                <LessonSummaryCard
                  key={lesson.id}
                  lesson={{
                    ...lesson,
                    questionsCount: questionsPerLesson.get(lesson.id) || 0,
                    userCompleted: !!progressMap.get(lesson.id)?.completed,
                  }}
                  index={i}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickReviewPage;
