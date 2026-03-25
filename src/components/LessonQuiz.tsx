import { useState, useCallback } from "react";
import { CheckCircle, XCircle, RotateCcw, Trophy, Target, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
}

interface LessonQuizProps {
  questions: Question[];
  lessonId: string;
  userId?: string;
}

const LessonQuiz = ({ questions, lessonId, userId }: LessonQuizProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [quizFinished, setQuizFinished] = useState(false);

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progressPercent = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  const correctCount = questions.filter((q) => answers[q.id] === q.correct_index).length;
  const scorePercent = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  const handleAnswer = useCallback((optionIndex: number) => {
    if (revealed[currentQ.id]) return;
    setAnswers((prev) => ({ ...prev, [currentQ.id]: optionIndex }));
    setRevealed((prev) => ({ ...prev, [currentQ.id]: true }));
  }, [currentQ?.id, revealed]);

  const goNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      finishQuiz();
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const finishQuiz = async () => {
    setQuizFinished(true);
    if (userId && lessonId) {
      const score = correctCount;
      const { data: existing } = await supabase
        .from("user_progress")
        .select("id")
        .eq("user_id", userId)
        .eq("lesson_id", lessonId)
        .limit(1);

      const payload = { completed: true, completed_at: new Date().toISOString(), quiz_score: score };

      if (existing && existing.length > 0) {
        await supabase.from("user_progress").update(payload).eq("id", existing[0].id);
      } else {
        await supabase.from("user_progress").insert({ user_id: userId, lesson_id: lessonId, ...payload });
      }
      queryClient.invalidateQueries({ queryKey: ["user-progress"] });
      toast({ title: "تم حفظ تقدمك ✓" });
    }
  };

  const retry = () => {
    setAnswers({});
    setRevealed({});
    setCurrentIndex(0);
    setQuizFinished(false);
  };

  if (questions.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
        <p className="text-muted-foreground">لم تُضف أسئلة لهذا الدرس بعد</p>
      </div>
    );
  }

  if (quizFinished) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        {/* Score Card */}
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

        {/* Review Answers */}
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

        <Button variant="hero" size="lg" className="w-full py-6 gap-2" onClick={retry}>
          <RotateCcw className="h-5 w-5" />
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  // Active quiz - single question view
  const isAnswered = revealed[currentQ.id];
  const selectedAnswer = answers[currentQ.id];

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Progress header */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            السؤال {currentIndex + 1} من {questions.length}
          </span>
          <span className="text-sm font-bold text-primary">{answeredCount}/{questions.length}</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Question card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <p className="text-lg font-semibold text-card-foreground mb-5">{currentQ.question_text}</p>
        <div className="space-y-3">
          {currentQ.options.map((option, oi) => {
            const isSelected = selectedAnswer === oi;
            const isCorrect = isAnswered && oi === currentQ.correct_index;
            const isWrong = isAnswered && isSelected && oi !== currentQ.correct_index;

            return (
              <button
                key={oi}
                onClick={() => handleAnswer(oi)}
                disabled={!!isAnswered}
                className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-sm transition-all text-start ${
                  isCorrect ? "border-success bg-success/10 scale-[1.02]"
                  : isWrong ? "border-destructive bg-destructive/10"
                  : isSelected ? "border-primary bg-primary/5"
                  : isAnswered ? "border-border opacity-60"
                  : "border-border hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98]"
                }`}
              >
                {isCorrect && <CheckCircle className="h-5 w-5 shrink-0 text-success" />}
                {isWrong && <XCircle className="h-5 w-5 shrink-0 text-destructive" />}
                {!isCorrect && !isWrong && (
                  <div className={`h-5 w-5 shrink-0 rounded-full border-2 transition-colors ${
                    isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                  }`} />
                )}
                <span className={`${isCorrect ? "text-success font-semibold" : isWrong ? "text-destructive" : "text-card-foreground"}`}>
                  {option}
                </span>
              </button>
            );
          })}
        </div>

        {/* Instant explanation */}
        {isAnswered && currentQ.explanation && (
          <div className="mt-4 rounded-xl bg-muted p-4 text-sm text-muted-foreground animate-fade-in-up">
            💡 {currentQ.explanation}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={goPrev} disabled={currentIndex === 0} className="flex-1 gap-2">
          <ArrowRight className="h-4 w-4" />
          السابق
        </Button>
        {isAnswered && (
          <Button
            variant="hero"
            onClick={goNext}
            className="flex-1 gap-2"
          >
            {currentIndex === questions.length - 1 ? "عرض النتيجة" : "التالي"}
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default LessonQuiz;
