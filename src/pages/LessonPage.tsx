import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, FileText, Play, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

const lessonContent = {
  title: "المعادلات من الدرجة الأولى",
  videoUrl: "",
  summary: `المعادلة من الدرجة الأولى هي معادلة جبرية يكون فيها أعلى أُس للمتغير هو 1. الصيغة العامة: ax + b = 0 حيث a ≠ 0.

خطوات الحل:
١. نقل الحدود الثابتة إلى الطرف الآخر
٢. قسمة الطرفين على معامل المتغير
٣. التحقق من الحل بالتعويض

مثال: حل المعادلة 3x + 6 = 0
الحل: 3x = -6 → x = -2`,
};

const questions = [
  {
    id: 1,
    question: "ما هو حل المعادلة: 2x + 4 = 10؟",
    options: ["x = 2", "x = 3", "x = 4", "x = 7"],
    correct: 1,
    explanation: "2x + 4 = 10 → 2x = 6 → x = 3",
  },
  {
    id: 2,
    question: "أي من التالي يمثل معادلة من الدرجة الأولى؟",
    options: ["x² + 3 = 0", "2x + 5 = 11", "x³ = 8", "√x = 4"],
    correct: 1,
    explanation: "المعادلة 2x + 5 = 11 هي معادلة من الدرجة الأولى لأن أعلى أس للمتغير هو 1",
  },
  {
    id: 3,
    question: "إذا كان 5x - 15 = 0، فما قيمة x؟",
    options: ["x = 5", "x = 3", "x = -3", "x = 15"],
    correct: 1,
    explanation: "5x = 15 → x = 15/5 = 3",
  },
];

const LessonPage = () => {
  const { gradeId, subjectId, lessonId } = useParams();
  const [activeTab, setActiveTab] = useState<"video" | "content" | "quiz">("video");
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);

  const handleAnswer = (questionId: number, optionIndex: number) => {
    if (showResults) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = () => {
    setShowResults(true);
  };

  const correctCount = questions.filter((q) => answers[q.id] === q.correct).length;

  const tabs = [
    { id: "video" as const, label: "الفيديو", icon: Play },
    { id: "content" as const, label: "الشرح", icon: FileText },
    { id: "quiz" as const, label: "الأسئلة", icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link to={`/grades/${gradeId}/subjects`} className="hover:text-primary transition-colors">المواد</Link>
          <ArrowLeft className="h-3 w-3" />
          <Link to={`/grades/${gradeId}/subjects/${subjectId}/lessons`} className="hover:text-primary transition-colors">الدروس</Link>
          <ArrowLeft className="h-3 w-3" />
          <span className="text-foreground font-medium">{lessonContent.title}</span>
        </div>

        <h1 className="mb-6 text-2xl font-bold text-foreground">{lessonContent.title}</h1>

        {/* Tabs */}
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

        {/* Video Tab */}
        {activeTab === "video" && (
          <div className="animate-fade-in-up">
            <div className="aspect-video overflow-hidden rounded-2xl border border-border bg-muted flex items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Play className="h-8 w-8 text-primary" />
                </div>
                <p className="text-lg font-semibold text-foreground">شرح فيديو للدرس</p>
                <p className="text-sm text-muted-foreground mt-1">سيتم إضافة الفيديو قريباً</p>
              </div>
            </div>
          </div>
        )}

        {/* Content Tab */}
        {activeTab === "content" && (
          <div className="animate-fade-in-up">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="prose prose-lg max-w-none" style={{ direction: "rtl" }}>
                {lessonContent.summary.split("\n").map((line, i) => (
                  <p key={i} className="mb-3 text-card-foreground leading-relaxed">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quiz Tab */}
        {activeTab === "quiz" && (
          <div className="space-y-4 animate-fade-in-up">
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

            {questions.map((q, qi) => (
              <div key={q.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <p className="mb-4 font-semibold text-card-foreground">
                  {qi + 1}. {q.question}
                </p>
                <div className="space-y-2">
                  {q.options.map((option, oi) => {
                    const isSelected = answers[q.id] === oi;
                    const isCorrect = showResults && oi === q.correct;
                    const isWrong = showResults && isSelected && oi !== q.correct;

                    return (
                      <button
                        key={oi}
                        onClick={() => handleAnswer(q.id, oi)}
                        className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-sm transition-all text-start ${
                          isCorrect
                            ? "border-success/50 bg-success/10"
                            : isWrong
                            ? "border-destructive/50 bg-destructive/10"
                            : isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30 hover:bg-primary/5"
                        }`}
                      >
                        {isCorrect && <CheckCircle className="h-5 w-5 shrink-0 text-success" />}
                        {isWrong && <XCircle className="h-5 w-5 shrink-0 text-destructive" />}
                        {!isCorrect && !isWrong && (
                          <div className={`h-5 w-5 shrink-0 rounded-full border-2 ${
                            isSelected ? "border-primary bg-primary" : "border-border"
                          }`} />
                        )}
                        <span className={isCorrect ? "text-success font-medium" : isWrong ? "text-destructive" : "text-card-foreground"}>
                          {option}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {showResults && (
                  <p className="mt-3 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                    💡 {q.explanation}
                  </p>
                )}
              </div>
            ))}

            {!showResults && Object.keys(answers).length === questions.length && (
              <Button variant="hero" size="lg" className="w-full py-6" onClick={handleSubmit}>
                إرسال الإجابات
              </Button>
            )}

            {showResults && (
              <Button
                variant="outline"
                size="lg"
                className="w-full py-6"
                onClick={() => {
                  setAnswers({});
                  setShowResults(false);
                }}
              >
                إعادة المحاولة
              </Button>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <Link to={`/grades/${gradeId}/subjects/${subjectId}/lessons`}>
            <Button variant="outline" className="gap-2">
              <ArrowRight className="h-4 w-4" />
              العودة للدروس
            </Button>
          </Link>
          <Button variant="hero" className="gap-2">
            الدرس التالي
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LessonPage;
