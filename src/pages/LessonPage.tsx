import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, FileText, Play, BookOpen, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import SEOHead, { courseJsonLd } from "@/components/SEOHead";
import LazyMedia from "@/components/LazyMedia";
import { getEmbedUrl, getCdnUrl } from "@/lib/cdn";

const LessonPage = () => {
  const { gradeId, subjectId, lessonId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"video" | "content" | "quiz">("video");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);

  const { data: lesson, isLoading: lessonLoading, error: lessonError } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase.from("lessons").select("id, title, video_url, content_text, content_pdf_url, is_free").eq("id", lessonId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!lessonId,
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

  const { data: questions = [] } = useQuery({
    queryKey: ["lesson-questions", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase.from("questions").select("id, question_text, options, correct_index, explanation").eq("lesson_id", lessonId!).order("sort_order");
      if (error) throw error;
      return (data || []).map((q: any) => ({
        ...q,
        options: typeof q.options === "string" ? JSON.parse(q.options) : q.options,
      }));
    },
    enabled: !!lessonId,
  });

  const handleAnswer = (questionId: string, optionIndex: number) => {
    if (showResults) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = async () => {
    setShowResults(true);
    if (user && lessonId) {
      const score = questions.filter((q: any) => answers[q.id] === q.correct_index).length;
      const { data: existing } = await supabase
        .from("user_progress")
        .select("id")
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId)
        .limit(1);

      const payload = { completed: true, completed_at: new Date().toISOString(), quiz_score: score };

      if (existing && existing.length > 0) {
        await supabase.from("user_progress").update(payload).eq("id", existing[0].id);
      } else {
        await supabase.from("user_progress").insert({ user_id: user.id, lesson_id: lessonId, ...payload });
      }
      // Invalidate progress cache
      queryClient.invalidateQueries({ queryKey: ["user-progress"] });
      toast({ title: "تم حفظ تقدمك ✓" });
    }
  };

  const correctCount = questions.filter((q: any) => answers[q.id] === q.correct_index).length;

  const tabs = [
    { id: "video" as const, label: "الفيديو", icon: Play },
    { id: "content" as const, label: "الشرح", icon: FileText },
    { id: "quiz" as const, label: "الأسئلة", icon: BookOpen },
  ];

  if (lessonLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!lesson || lessonError) {
    // If RLS blocked access, show subscription prompt
    const isBlocked = lessonError && !lesson;
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          {isBlocked ? (
            <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 shadow-card">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                <Lock className="h-8 w-8 text-accent" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-card-foreground">محتوى مدفوع</h2>
              <p className="mb-6 text-muted-foreground">هذا الدرس متاح فقط للمشتركين. اشترك الآن للوصول لجميع الدروس.</p>
              <Button variant="hero" onClick={() => navigate("/subscribe")} className="w-full">اشترك الآن</Button>
            </div>
          ) : (
            <p className="text-muted-foreground">الدرس غير موجود</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link to={`/grades/${gradeId}/subjects`} className="hover:text-primary transition-colors">المواد</Link>
          <ArrowLeft className="h-3 w-3" />
          <Link to={`/grades/${gradeId}/subjects/${subjectId}/lessons`} className="hover:text-primary transition-colors">الدروس</Link>
          <ArrowLeft className="h-3 w-3" />
          <span className="text-foreground font-medium">{lesson.title}</span>
        </div>

        <h1 className="mb-6 text-2xl font-bold text-foreground">{lesson.title}</h1>

        <div className="mb-6 flex gap-2 rounded-xl border border-border bg-card p-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-hero-gradient text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "video" && (
          <div className="animate-fade-in-up">
            {lesson.video_url ? (
              <LazyMedia
                className="aspect-video overflow-hidden rounded-2xl border border-border"
                placeholder={
                  <div className="aspect-video rounded-2xl border border-border bg-muted flex items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                }
              >
                <iframe
                  src={getEmbedUrl(lesson.video_url)}
                  className="h-full w-full"
                  allowFullScreen
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </LazyMedia>
            ) : (
              <div className="aspect-video overflow-hidden rounded-2xl border border-border bg-muted flex items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Play className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-lg font-semibold text-foreground">شرح فيديو للدرس</p>
                  <p className="text-sm text-muted-foreground mt-1">سيتم إضافة الفيديو قريباً</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "content" && (
          <div className="animate-fade-in-up">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              {lesson.content_text ? (
                <div className="prose prose-lg max-w-none" style={{ direction: "rtl" }}>
                  {lesson.content_text.split("\n").map((line, i) => (
                    <p key={i} className="mb-3 text-card-foreground leading-relaxed">{line}</p>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">لم يُضف محتوى نصي بعد</p>
              )}
              {lesson.content_pdf_url && (
                <a href={getCdnUrl(lesson.content_pdf_url)} target="_blank" rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                  <FileText className="h-4 w-4" />
                  تحميل ملف PDF
                </a>
              )}
            </div>
          </div>
        )}

        {activeTab === "quiz" && (
          <div className="space-y-4 animate-fade-in-up">
            {questions.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
                <p className="text-muted-foreground">لم تُضف أسئلة لهذا الدرس بعد</p>
              </div>
            ) : (
              <>
                {showResults && (
                  <div className={`rounded-2xl p-5 text-center ${
                    correctCount === questions.length
                      ? "bg-success/10 border border-success/30"
                      : correctCount > 0
                      ? "bg-accent/10 border border-accent/30"
                      : "bg-destructive/10 border border-destructive/30"
                  }`}>
                    <p className="text-lg font-bold text-foreground">
                      النتيجة: {correctCount} من {questions.length}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {correctCount === questions.length ? "ممتاز! أحسنت 🎉" : "حاول مرة أخرى لتحسين نتيجتك"}
                    </p>
                  </div>
                )}

                {questions.map((q: any, qi: number) => (
                  <div key={q.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                    <p className="mb-4 font-semibold text-card-foreground">{qi + 1}. {q.question_text}</p>
                    <div className="space-y-2">
                      {(q.options as string[]).map((option: string, oi: number) => {
                        const isSelected = answers[q.id] === oi;
                        const isCorrect = showResults && oi === q.correct_index;
                        const isWrong = showResults && isSelected && oi !== q.correct_index;

                        return (
                          <button
                            key={oi}
                            onClick={() => handleAnswer(q.id, oi)}
                            className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-sm transition-all text-start ${
                              isCorrect ? "border-success/50 bg-success/10"
                              : isWrong ? "border-destructive/50 bg-destructive/10"
                              : isSelected ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/30 hover:bg-primary/5"
                            }`}
                          >
                            {isCorrect && <CheckCircle className="h-5 w-5 shrink-0 text-success" />}
                            {isWrong && <XCircle className="h-5 w-5 shrink-0 text-destructive" />}
                            {!isCorrect && !isWrong && (
                              <div className={`h-5 w-5 shrink-0 rounded-full border-2 ${isSelected ? "border-primary bg-primary" : "border-border"}`} />
                            )}
                            <span className={isCorrect ? "text-success font-medium" : isWrong ? "text-destructive" : "text-card-foreground"}>
                              {option}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {showResults && q.explanation && (
                      <p className="mt-3 rounded-lg bg-muted p-3 text-sm text-muted-foreground">💡 {q.explanation}</p>
                    )}
                  </div>
                ))}

                {!showResults && Object.keys(answers).length === questions.length && (
                  <Button variant="hero" size="lg" className="w-full py-6" onClick={handleSubmit}>
                    إرسال الإجابات
                  </Button>
                )}

                {showResults && (
                  <Button variant="outline" size="lg" className="w-full py-6"
                    onClick={() => { setAnswers({}); setShowResults(false); }}>
                    إعادة المحاولة
                  </Button>
                )}
              </>
            )}
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <Link to={`/grades/${gradeId}/subjects/${subjectId}/lessons`}>
            <Button variant="outline" className="gap-2">
              <ArrowRight className="h-4 w-4" />
              العودة للدروس
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LessonPage;
