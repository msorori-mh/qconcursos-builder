import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, HelpCircle, CheckCircle, XCircle, RotateCcw, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import SEOHead from "@/components/SEOHead";

interface BankQuestion {
  id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
}

const QuestionBankPage = () => {
  const { gradeId, subjectId } = useParams();
  const { user } = useAuth();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const { data: subject } = useQuery({
    queryKey: ["subject", subjectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id, name").eq("id", subjectId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!subjectId,
  });

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["bank-questions", subjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("id, question_text, options, correct_index, explanation")
        .eq("subject_id", subjectId!)
        .eq("question_type", "bank")
        .order("sort_order");
      if (error) throw error;
      return (data || []).map((q: any) => ({
        ...q,
        options: typeof q.options === "string" ? JSON.parse(q.options) : q.options,
      })) as BankQuestion[];
    },
    enabled: !!subjectId,
  });

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progressPercent = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;
  const correctCount = questions.filter((q) => answers[q.id] === q.correct_index).length;

  const handleAnswer = (optionIndex: number) => {
    if (!currentQ || revealed[currentQ.id]) return;
    setAnswers((prev) => ({ ...prev, [currentQ.id]: optionIndex }));
    setRevealed((prev) => ({ ...prev, [currentQ.id]: true }));
  };

  const goNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex((i) => i + 1);
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const retry = () => {
    setAnswers({});
    setRevealed({});
    setCurrentIndex(0);
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
      <SEOHead
        title={`بنك أسئلة - ${subject?.name || "الوحدة"}`}
        description="أسئلة مراجعة شاملة لجميع دروس الوحدة مع إجابات نموذجية وتوضيحات."
        canonical={`/grades/${gradeId}/subjects/${subjectId}/quiz`}
      />
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link to={`/grades/${gradeId}/subjects`} className="hover:text-primary transition-colors">المواد</Link>
          <ArrowLeft className="h-3 w-3" />
          <Link to={`/grades/${gradeId}/subjects/${subjectId}/lessons`} className="hover:text-primary transition-colors">الدروس</Link>
          <ArrowLeft className="h-3 w-3" />
          <span className="text-foreground font-medium">بنك الأسئلة</span>
        </div>

        <h1 className="mb-6 text-2xl font-bold text-foreground">
          بنك أسئلة — {subject?.name || "الوحدة"}
        </h1>

        {questions.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-semibold text-card-foreground mb-2">لم تُضف أسئلة لبنك الأسئلة بعد</p>
            <p className="text-muted-foreground">سيتم إضافة أسئلة المراجعة قريباً</p>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in-up">
            <div className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  السؤال {currentIndex + 1} من {questions.length}
                </span>
                <span className="text-sm text-muted-foreground">
                  <span className="font-bold text-success">{correctCount}</span> صحيحة من {answeredCount} محاولة
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <HelpCircle className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">مراجعة</span>
              </div>
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
              {revealed[currentQ.id] && currentIndex < questions.length - 1 && (
                <Button variant="hero" onClick={goNext} className="flex-1 gap-2">
                  التالي
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
            </div>

            {answeredCount === questions.length && (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
                <p className="text-lg font-bold text-foreground mb-1">أتممت جميع الأسئلة! 🎉</p>
                <p className="text-muted-foreground mb-4">{correctCount} من {questions.length} إجابة صحيحة</p>
                <Button variant="outline" onClick={retry} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  إعادة المراجعة
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="mt-6">
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

export default QuestionBankPage;
