import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, FileText, Lock, BookOpen, CheckCircle, XCircle, RotateCcw, Trophy, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import SEOHead from "@/components/SEOHead";

interface ExamQuestion {
  id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
}

const SubjectExamPage = () => {
  const { gradeId, subjectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [finished, setFinished] = useState(false);

  const { data: subject } = useQuery({
    queryKey: ["subject", subjectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id, name").eq("id", subjectId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!subjectId,
  });

  const { data: hasSubscription = false } = useQuery({
    queryKey: ["subscription-check", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions").select("id")
        .eq("user_id", user!.id).eq("status", "active").limit(1);
      return !!data && data.length > 0;
    },
    enabled: !!user,
  });

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["exam-questions", subjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("id, question_text, options, correct_index, explanation")
        .eq("subject_id", subjectId!)
        .eq("question_type", "exam")
        .order("sort_order");
      if (error) throw error;
      return (data || []).map((q: any) => ({
        ...q,
        options: typeof q.options === "string" ? JSON.parse(q.options) : q.options,
      })) as ExamQuestion[];
    },
    enabled: !!subjectId,
  });

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progressPercent = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;
  const correctCount = questions.filter((q) => answers[q.id] === q.correct_index).length;
  const scorePercent = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  const handleAnswer = (optionIndex: number) => {
    if (!currentQ || revealed[currentQ.id]) return;
    setAnswers((prev) => ({ ...prev, [currentQ.id]: optionIndex }));
    setRevealed((prev) => ({ ...prev, [currentQ.id]: true }));
  };

  const goNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex((i) => i + 1);
    else setFinished(true);
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const retry = () => {
    setAnswers({});
    setRevealed({});
    setCurrentIndex(0);
    setFinished(false);
    setStarted(true);
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

  // Gate: require subscription for exam
  if (!hasSubscription) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 shadow-card">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
              <Lock className="h-8 w-8 text-accent" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-card-foreground">الاختبار الشامل متاح للمشتركين</h2>
            <p className="mb-6 text-muted-foreground">اشترك الآن للوصول إلى الاختبارات الشاملة لجميع الوحدات.</p>
            <Button variant="hero" onClick={() => navigate("/subscribe")} className="w-full">اشترك الآن</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`اختبار شامل - ${subject?.name || "الوحدة"}`}
        description="اختبار شامل لمراجعة جميع دروس الوحدة واختبار مستوى فهمك."
        canonical={`/grades/${gradeId}/subjects/${subjectId}/exam`}
      />
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link to={`/grades/${gradeId}/subjects`} className="hover:text-primary transition-colors">المواد</Link>
          <ArrowLeft className="h-3 w-3" />
          <Link to={`/grades/${gradeId}/subjects/${subjectId}/lessons`} className="hover:text-primary transition-colors">الدروس</Link>
          <ArrowLeft className="h-3 w-3" />
          <span className="text-foreground font-medium">اختبار شامل</span>
        </div>

        <h1 className="mb-6 text-2xl font-bold text-foreground">
          اختبار شامل — {subject?.name || "الوحدة"}
        </h1>

        {questions.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-semibold text-card-foreground mb-2">لم تُضف أسئلة للاختبار الشامل بعد</p>
            <p className="text-muted-foreground">سيتم إضافة أسئلة الاختبار قريباً</p>
          </div>
        ) : !started && !finished ? (
          /* Start screen */
          <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-card animate-fade-in-up">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
              <FileText className="h-10 w-10 text-accent" />
            </div>
            <h2 className="text-xl font-bold text-card-foreground mb-2">هل أنت مستعد؟</h2>
            <p className="text-muted-foreground mb-6">
              يتكون الاختبار من <strong className="text-foreground">{questions.length}</strong> سؤال يغطي جميع دروس الوحدة.
            </p>
            <Button variant="hero" size="lg" className="w-full py-6 text-lg gap-2" onClick={() => setStarted(true)}>
              ابدأ الاختبار
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
        ) : finished ? (
          /* Results */
          <div className="space-y-6 animate-fade-in-up">
            <div className={`rounded-2xl border-2 p-8 text-center ${
              scorePercent >= 80 ? "border-success/40 bg-success/5" :
              scorePercent >= 50 ? "border-accent/40 bg-accent/5" :
              "border-destructive/40 bg-destructive/5"
            }`}>
              <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${
                scorePercent >= 80 ? "bg-success/15" : scorePercent >= 50 ? "bg-accent/15" : "bg-destructive/15"
              }`}>
                <Trophy className={`h-10 w-10 ${
                  scorePercent >= 80 ? "text-success" : scorePercent >= 50 ? "text-accent" : "text-destructive"
                }`} />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-1">
                {scorePercent >= 80 ? "ممتاز! أحسنت 🎉" : scorePercent >= 50 ? "جيد، يمكنك التحسن 💪" : "حاول مرة أخرى 📚"}
              </h3>
              <p className="text-4xl font-black text-foreground my-3">{scorePercent}%</p>
              <p className="text-muted-foreground">{correctCount} من {questions.length} إجابة صحيحة</p>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                مراجعة الإجابات
              </h4>
              {questions.map((q, qi) => {
                const isCorrect = answers[q.id] === q.correct_index;
                return (
                  <div key={q.id} className={`rounded-xl border p-4 ${
                    isCorrect ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"
                  }`}>
                    <div className="flex items-start gap-2 mb-2">
                      {isCorrect ? <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" /> : <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />}
                      <p className="font-medium text-card-foreground text-sm">{qi + 1}. {q.question_text}</p>
                    </div>
                    {!isCorrect && (
                      <p className="text-sm text-success mr-7 mb-1">✓ الإجابة الصحيحة: {q.options[q.correct_index]}</p>
                    )}
                    {q.explanation && (
                      <p className="text-sm text-muted-foreground mr-7 mt-1 bg-muted rounded-lg p-2">💡 {q.explanation}</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <Button variant="hero" className="flex-1 gap-2" onClick={retry}>
                <RotateCcw className="h-4 w-4" />
                إعادة الاختبار
              </Button>
              <Link to={`/grades/${gradeId}/subjects/${subjectId}/lessons`} className="flex-1">
                <Button variant="outline" className="w-full gap-2">
                  <ArrowRight className="h-4 w-4" />
                  العودة للدروس
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          /* Active exam */
          <div className="space-y-4 animate-fade-in-up">
            <div className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  السؤال {currentIndex + 1} من {questions.length}
                </span>
                <span className="text-sm font-bold text-primary">{answeredCount}/{questions.length}</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <p className="text-lg font-semibold text-card-foreground mb-5">{currentQ.question_text}</p>
              <div className="space-y-3">
                {currentQ.options.map((option: string, oi: number) => {
                  const isSelected = answers[currentQ.id] === oi;
                  const isCorrectOpt = revealed[currentQ.id] && oi === currentQ.correct_index;
                  const isWrong = revealed[currentQ.id] && isSelected && oi !== currentQ.correct_index;

                  return (
                    <button
                      key={oi}
                      onClick={() => handleAnswer(oi)}
                      disabled={!!revealed[currentQ.id]}
                      className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-sm transition-all text-start ${
                        isCorrectOpt ? "border-success bg-success/10 scale-[1.02]"
                        : isWrong ? "border-destructive bg-destructive/10"
                        : isSelected ? "border-primary bg-primary/5"
                        : revealed[currentQ.id] ? "border-border opacity-60"
                        : "border-border hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98]"
                      }`}
                    >
                      {isCorrectOpt && <CheckCircle className="h-5 w-5 shrink-0 text-success" />}
                      {isWrong && <XCircle className="h-5 w-5 shrink-0 text-destructive" />}
                      {!isCorrectOpt && !isWrong && (
                        <div className={`h-5 w-5 shrink-0 rounded-full border-2 transition-colors ${
                          isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                        }`} />
                      )}
                      <span className={`${isCorrectOpt ? "text-success font-semibold" : isWrong ? "text-destructive" : "text-card-foreground"}`}>
                        {option}
                      </span>
                    </button>
                  );
                })}
              </div>

              {revealed[currentQ.id] && currentQ.explanation && (
                <div className="mt-4 rounded-xl bg-muted p-4 text-sm text-muted-foreground animate-fade-in-up">
                  💡 {currentQ.explanation}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={goPrev} disabled={currentIndex === 0} className="flex-1 gap-2">
                <ArrowRight className="h-4 w-4" />
                السابق
              </Button>
              {revealed[currentQ.id] && (
                <Button variant="hero" onClick={goNext} className="flex-1 gap-2">
                  {currentIndex === questions.length - 1 ? "عرض النتيجة" : "التالي"}
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {!started && !finished && questions.length > 0 && (
          <div className="mt-6">
            <Link to={`/grades/${gradeId}/subjects/${subjectId}/lessons`}>
              <Button variant="outline" className="gap-2">
                <ArrowRight className="h-4 w-4" />
                العودة للدروس
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubjectExamPage;
