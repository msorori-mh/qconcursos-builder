import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Clock, Flag, CheckCircle, XCircle, Trophy, Target,
  AlertTriangle, ArrowLeft, ArrowRight, RotateCcw,
  BookOpen, Send, Eye, ChevronLeft, ChevronRight,
  Timer, Hash, Award, TrendingUp, Zap, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface ExamQuestion {
  id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
}

interface ExamSimulatorProps {
  questions: ExamQuestion[];
  title: string;
  subtitle?: string;
  /** Duration in minutes. 0 = no timer */
  durationMinutes?: number;
  /** Show instant feedback per question (practice mode) */
  practiceMode?: boolean;
  /** Shuffle questions on start */
  shuffle?: boolean;
  onFinish?: (result: ExamResult) => void;
  onExit?: () => void;
}

export interface ExamResult {
  score: number;
  total: number;
  percentage: number;
  timeSpent: number; // seconds
  answers: Record<string, number | null>;
  flagged: Set<string>;
}

// Fisher-Yates shuffle
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type ExamPhase = "intro" | "active" | "results";

const ExamSimulator = ({
  questions: rawQuestions,
  title,
  subtitle,
  durationMinutes = 0,
  practiceMode = false,
  shuffle = true,
  onFinish,
  onExit,
}: ExamSimulatorProps) => {
  const [phase, setPhase] = useState<ExamPhase>("intro");
  const [questions, setQuestions] = useState<ExamQuestion[]>(rawQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [timeSpent, setTimeSpent] = useState(0);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showNavPanel, setShowNavPanel] = useState(false);
  const startTimeRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentQ = questions[currentIndex];
  const answeredCount = Object.values(answers).filter((a) => a !== null && a !== undefined).length;
  const unansweredCount = questions.length - answeredCount;

  // Memoize result computation
  const result = useMemo<ExamResult>(() => {
    const correct = questions.filter((q) => answers[q.id] === q.correct_index).length;
    return {
      score: correct,
      total: questions.length,
      percentage: questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0,
      timeSpent,
      answers,
      flagged,
    };
  }, [questions, answers, timeSpent, flagged]);

  // Timer
  useEffect(() => {
    if (phase !== "active") return;
    if (durationMinutes <= 0) {
      // Count up instead
      timerRef.current = setInterval(() => setTimeSpent((t) => t + 1), 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          handleSubmit();
          return 0;
        }
        return t - 1;
      });
      setTimeSpent((t) => t + 1);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, durationMinutes]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const startExam = () => {
    const q = shuffle ? shuffleArray(rawQuestions) : [...rawQuestions];
    setQuestions(q);
    setAnswers({});
    setFlagged(new Set());
    setRevealed({});
    setCurrentIndex(0);
    setTimeLeft(durationMinutes * 60);
    setTimeSpent(0);
    startTimeRef.current = Date.now();
    setPhase("active");
  };

  const handleAnswer = useCallback((optionIndex: number) => {
    if (!currentQ) return;
    if (practiceMode && revealed[currentQ.id]) return;
    setAnswers((prev) => ({ ...prev, [currentQ.id]: optionIndex }));
    if (practiceMode) {
      setRevealed((prev) => ({ ...prev, [currentQ.id]: true }));
    }
  }, [currentQ, practiceMode, revealed]);

  const toggleFlag = useCallback(() => {
    if (!currentQ) return;
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(currentQ.id)) next.delete(currentQ.id);
      else next.add(currentQ.id);
      return next;
    });
  }, [currentQ]);

  const goTo = (idx: number) => {
    setCurrentIndex(idx);
    setShowNavPanel(false);
  };

  const goNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex((i) => i + 1);
  };
  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const handleSubmit = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("results");
    onFinish?.(result);
  }, [result, onFinish]);

  const attemptSubmit = () => {
    if (unansweredCount > 0) {
      setShowSubmitDialog(true);
    } else {
      handleSubmit();
    }
  };

  const retry = () => {
    setPhase("intro");
  };

  // ─── INTRO SCREEN ───
  if (phase === "intro") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-lg animate-fade-in-up">
          <div className="rounded-3xl border-2 border-primary/20 bg-card p-8 md:p-10 shadow-card text-center">
            {/* Icon */}
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-hero-gradient shadow-lg">
              <BookOpen className="h-12 w-12 text-primary-foreground" />
            </div>

            <h2 className="text-2xl font-black text-foreground mb-2">{title}</h2>
            {subtitle && <p className="text-muted-foreground mb-6">{subtitle}</p>}

            {/* Exam Info */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="rounded-xl bg-primary/5 p-4">
                <Hash className="mx-auto mb-1 h-5 w-5 text-primary" />
                <p className="text-xl font-bold text-foreground">{rawQuestions.length}</p>
                <p className="text-xs text-muted-foreground">سؤال</p>
              </div>
              <div className="rounded-xl bg-amber-500/5 p-4">
                <Timer className="mx-auto mb-1 h-5 w-5 text-amber-500" />
                <p className="text-xl font-bold text-foreground">
                  {durationMinutes > 0 ? `${durationMinutes} د` : "مفتوح"}
                </p>
                <p className="text-xs text-muted-foreground">المدة</p>
              </div>
            </div>

            {/* Rules */}
            <div className="rounded-xl bg-muted p-4 mb-8 text-start">
              <h3 className="text-sm font-semibold text-foreground mb-2">📋 تعليمات الاختبار:</h3>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  {practiceMode ? "ستظهر الإجابة الصحيحة مباشرة بعد كل سؤال" : "لن تظهر الإجابات حتى تسليم الاختبار"}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  يمكنك التنقل بين الأسئلة بحرية
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  استخدم 🚩 لتعليم الأسئلة للمراجعة لاحقاً
                </li>
                {durationMinutes > 0 && (
                  <li className="flex items-start gap-2">
                    <span className="text-destructive mt-0.5">•</span>
                    سيتم تسليم الاختبار تلقائياً عند انتهاء الوقت
                  </li>
                )}
              </ul>
            </div>

            <Button variant="hero" size="lg" className="w-full py-6 text-lg gap-2" onClick={startExam}>
              <Zap className="h-5 w-5" />
              ابدأ الاختبار
            </Button>

            {onExit && (
              <Button variant="ghost" className="mt-3 w-full text-muted-foreground gap-2" onClick={onExit}>
                <ArrowRight className="h-4 w-4" />
                العودة
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── RESULTS SCREEN ───
  if (phase === "results") {
    const { score, total, percentage } = result;
    const grade =
      percentage >= 90 ? { label: "ممتاز 🏆", color: "text-green-600 dark:text-green-400", bg: "border-green-500/40 bg-green-500/5", iconBg: "bg-green-500/15" } :
      percentage >= 75 ? { label: "جيد جداً 🎉", color: "text-blue-600 dark:text-blue-400", bg: "border-blue-500/40 bg-blue-500/5", iconBg: "bg-blue-500/15" } :
      percentage >= 60 ? { label: "جيد 💪", color: "text-amber-600 dark:text-amber-400", bg: "border-amber-500/40 bg-amber-500/5", iconBg: "bg-amber-500/15" } :
      percentage >= 50 ? { label: "مقبول 📖", color: "text-orange-600 dark:text-orange-400", bg: "border-orange-500/40 bg-orange-500/5", iconBg: "bg-orange-500/15" } :
      { label: "راجع دروسك 📚", color: "text-destructive", bg: "border-destructive/40 bg-destructive/5", iconBg: "bg-destructive/15" };

    return (
      <div className="container mx-auto max-w-3xl px-4 py-6 space-y-6 animate-fade-in-up">
        {/* Score Hero */}
        <div className={`rounded-3xl border-2 p-8 text-center ${grade.bg}`}>
          <div className={`mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full ${grade.iconBg}`}>
            <Trophy className={`h-12 w-12 ${grade.color}`} />
          </div>
          <h2 className={`text-2xl font-black mb-1 ${grade.color}`}>{grade.label}</h2>
          <p className="text-5xl font-black text-foreground my-4">{percentage}%</p>
          <p className="text-muted-foreground">{score} من {total} إجابة صحيحة</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <Clock className="mx-auto mb-1 h-5 w-5 text-primary" />
            <p className="text-lg font-bold text-foreground">{formatTime(timeSpent)}</p>
            <p className="text-xs text-muted-foreground">الوقت المستغرق</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <TrendingUp className="mx-auto mb-1 h-5 w-5 text-green-500" />
            <p className="text-lg font-bold text-foreground">{score}</p>
            <p className="text-xs text-muted-foreground">إجابة صحيحة</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <Flag className="mx-auto mb-1 h-5 w-5 text-amber-500" />
            <p className="text-lg font-bold text-foreground">{flagged.size}</p>
            <p className="text-xs text-muted-foreground">سؤال مُعلّم</p>
          </div>
        </div>

        {/* Answer Review */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="text-sm font-semibold text-card-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            مراجعة الإجابات
          </h3>
          <div className="space-y-3">
            {questions.map((q, qi) => {
              const userAnswer = answers[q.id];
              const isCorrect = userAnswer === q.correct_index;
              const isUnanswered = userAnswer === null || userAnswer === undefined;

              return (
                <div
                  key={q.id}
                  className={`rounded-xl border p-4 ${
                    isUnanswered ? "border-muted bg-muted/30" :
                    isCorrect ? "border-green-500/30 bg-green-500/5" :
                    "border-destructive/30 bg-destructive/5"
                  }`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground mt-0.5">
                      {qi + 1}
                    </span>
                    {isUnanswered ? (
                      <AlertTriangle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    ) : isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    )}
                    <p className="font-medium text-card-foreground text-sm">{q.question_text}</p>
                  </div>

                  {/* Show user's wrong answer */}
                  {!isUnanswered && !isCorrect && userAnswer !== undefined && (
                    <p className="text-sm text-destructive/80 mr-8 mb-1">
                      ✗ إجابتك: {q.options[userAnswer]}
                    </p>
                  )}

                  {/* Show correct answer */}
                  {(!isCorrect || isUnanswered) && (
                    <p className="text-sm text-green-600 dark:text-green-400 mr-8 mb-1">
                      ✓ الإجابة الصحيحة: {q.options[q.correct_index]}
                    </p>
                  )}

                  {q.explanation && (
                    <p className="text-sm text-muted-foreground mr-8 mt-1 bg-muted rounded-lg p-2.5">
                      💡 {q.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="hero" size="lg" className="flex-1 py-6 gap-2" onClick={retry}>
            <RotateCcw className="h-5 w-5" />
            إعادة الاختبار
          </Button>
          {onExit && (
            <Button variant="outline" size="lg" className="flex-1 py-6 gap-2" onClick={onExit}>
              <ArrowRight className="h-5 w-5" />
              العودة
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ─── ACTIVE EXAM ───
  const isAnswered = answers[currentQ?.id] !== undefined && answers[currentQ?.id] !== null;
  const isFlagged = flagged.has(currentQ?.id);
  const timerWarning = durationMinutes > 0 && timeLeft < 120;
  const timerDanger = durationMinutes > 0 && timeLeft < 30;

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Top Bar */}
      <div className={`sticky top-0 z-40 border-b backdrop-blur-md ${
        timerDanger ? "border-destructive/50 bg-destructive/5" :
        timerWarning ? "border-amber-500/50 bg-amber-500/5" :
        "border-border bg-background/90"
      }`}>
        <div className="container mx-auto flex items-center justify-between px-4 py-2.5 max-w-4xl">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => setShowNavPanel(!showNavPanel)}
            >
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">الأسئلة</span>
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded-md font-mono">
                {answeredCount}/{questions.length}
              </span>
            </Button>
          </div>

          {/* Timer */}
          <div className={`flex items-center gap-1.5 font-mono text-lg font-bold ${
            timerDanger ? "text-destructive animate-pulse" :
            timerWarning ? "text-amber-500" :
            "text-foreground"
          }`}>
            <Clock className="h-4 w-4" />
            {durationMinutes > 0 ? formatTime(timeLeft) : formatTime(timeSpent)}
          </div>

          <Button
            variant={unansweredCount === 0 ? "hero" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={attemptSubmit}
          >
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">تسليم</span>
          </Button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(answeredCount / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Navigation Panel */}
      {showNavPanel && (
        <>
          <div className="fixed inset-0 z-30 bg-black/40" onClick={() => setShowNavPanel(false)} />
          <div className="fixed top-[52px] right-0 left-0 z-30 mx-auto max-w-lg animate-fade-in-up">
            <div className="mx-4 rounded-2xl border border-border bg-card p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-card-foreground">لوحة الأسئلة</h3>
                <div className="flex gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> مُجاب
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> مُعلّم
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-sm bg-muted border border-border" /> فارغ
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5">
                {questions.map((q, i) => {
                  const answered = answers[q.id] !== undefined && answers[q.id] !== null;
                  const marked = flagged.has(q.id);
                  const isCurrent = i === currentIndex;

                  return (
                    <button
                      key={q.id}
                      onClick={() => goTo(i)}
                      className={`relative flex h-9 w-full items-center justify-center rounded-lg text-xs font-bold transition-all ${
                        isCurrent ? "ring-2 ring-primary scale-110" :
                        marked ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40" :
                        answered ? "bg-primary/15 text-primary border border-primary/30" :
                        "bg-muted text-muted-foreground border border-border hover:border-primary/40"
                      }`}
                    >
                      {i + 1}
                      {marked && (
                        <span className="absolute -top-1 -right-1 text-[8px]">🚩</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Question Content */}
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <div className="space-y-4">
          {/* Question Header */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              السؤال <span className="text-foreground font-bold">{currentIndex + 1}</span> من {questions.length}
            </span>
            <Button
              variant={isFlagged ? "default" : "ghost"}
              size="sm"
              className={`gap-1.5 ${isFlagged ? "bg-amber-500 hover:bg-amber-600 text-white" : "text-muted-foreground"}`}
              onClick={toggleFlag}
            >
              <Flag className="h-3.5 w-3.5" />
              {isFlagged ? "مُعلّم" : "علّم"}
            </Button>
          </div>

          {/* Question Card */}
          <div className="rounded-2xl border-2 border-border bg-card p-6 shadow-card">
            <p className="text-lg font-semibold text-card-foreground leading-relaxed mb-6">
              {currentQ.question_text}
            </p>

            <div className="space-y-3">
              {currentQ.options.map((option, oi) => {
                const isSelected = answers[currentQ.id] === oi;

                // Practice mode visuals
                const showResult = practiceMode && revealed[currentQ.id];
                const isCorrectOpt = showResult && oi === currentQ.correct_index;
                const isWrongOpt = showResult && isSelected && oi !== currentQ.correct_index;

                return (
                  <button
                    key={oi}
                    onClick={() => handleAnswer(oi)}
                    disabled={practiceMode && !!revealed[currentQ.id]}
                    className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-sm transition-all text-start ${
                      isCorrectOpt ? "border-green-500 bg-green-500/10 scale-[1.01]" :
                      isWrongOpt ? "border-destructive bg-destructive/10" :
                      isSelected ? "border-primary bg-primary/5 shadow-sm" :
                      showResult ? "border-border opacity-50" :
                      "border-border hover:border-primary/40 hover:bg-primary/5 active:scale-[0.99]"
                    }`}
                  >
                    {/* Option indicator */}
                    {isCorrectOpt ? (
                      <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
                    ) : isWrongOpt ? (
                      <XCircle className="h-5 w-5 shrink-0 text-destructive" />
                    ) : (
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30 text-muted-foreground"
                      }`}>
                        {String.fromCharCode(1571 + oi) /* أ ب ت ث */}
                      </div>
                    )}
                    <span className={`flex-1 ${
                      isCorrectOpt ? "text-green-600 dark:text-green-400 font-semibold" :
                      isWrongOpt ? "text-destructive" :
                      isSelected ? "text-foreground font-medium" :
                      "text-card-foreground"
                    }`}>
                      {option}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Practice mode explanation */}
            {practiceMode && revealed[currentQ.id] && currentQ.explanation && (
              <div className="mt-5 rounded-xl bg-muted p-4 text-sm text-muted-foreground animate-fade-in-up">
                💡 {currentQ.explanation}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="flex-1 gap-2"
            >
              <ChevronRight className="h-4 w-4" />
              السابق
            </Button>
            <Button
              variant={isAnswered || practiceMode ? "hero" : "outline"}
              onClick={currentIndex === questions.length - 1 ? attemptSubmit : goNext}
              className="flex-1 gap-2"
            >
              {currentIndex === questions.length - 1 ? (
                <>
                  <Send className="h-4 w-4" />
                  تسليم الاختبار
                </>
              ) : (
                <>
                  التالي
                  <ChevronLeft className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              تأكيد التسليم
            </AlertDialogTitle>
            <AlertDialogDescription>
              {unansweredCount > 0 ? (
                <>
                  لديك <strong className="text-foreground">{unansweredCount}</strong> سؤال بدون إجابة.
                  هل تريد تسليم الاختبار؟
                </>
              ) : (
                "هل أنت متأكد من تسليم الاختبار؟"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>مراجعة الأسئلة</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} className="bg-primary text-primary-foreground">
              تسليم الآن
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExamSimulator;
