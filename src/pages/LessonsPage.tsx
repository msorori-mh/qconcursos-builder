import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Play, FileText, HelpCircle, CheckCircle, Clock, Lock } from "lucide-react";
import Navbar from "@/components/Navbar";

const lessons = [
  { id: "1", title: "مقدمة في المعادلات", duration: "15 دقيقة", completed: true, free: true },
  { id: "2", title: "المعادلات من الدرجة الأولى", duration: "22 دقيقة", completed: true, free: true },
  { id: "3", title: "حل المعادلات بخطوتين", duration: "18 دقيقة", completed: false, free: true },
  { id: "4", title: "المعادلات ذات المتغيرين", duration: "25 دقيقة", completed: false, free: false },
  { id: "5", title: "تطبيقات على المعادلات", duration: "20 دقيقة", completed: false, free: false },
  { id: "6", title: "مسائل كلامية", duration: "30 دقيقة", completed: false, free: false },
  { id: "7", title: "مراجعة شاملة للوحدة", duration: "35 دقيقة", completed: false, free: false },
];

const LessonsPage = () => {
  const { gradeId, subjectId } = useParams();
  const completedCount = lessons.filter(l => l.completed).length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <div className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link to="/grades" className="hover:text-primary transition-colors">الصفوف</Link>
          <ArrowLeft className="h-3 w-3" />
          <Link to={`/grades/${gradeId}/subjects`} className="hover:text-primary transition-colors">المواد</Link>
          <ArrowLeft className="h-3 w-3" />
          <span className="text-foreground font-medium">الرياضيات</span>
        </div>

        <div className="mb-8">
          <h1 className="mb-2 text-2xl font-bold text-foreground">الرياضيات — الوحدة الأولى: المعادلات</h1>
          <p className="text-muted-foreground">7 دروس • {completedCount} مكتمل</p>
        </div>

        {/* Progress bar */}
        <div className="mb-8 rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">التقدم في الوحدة</span>
            <span className="font-semibold text-primary">{Math.round((completedCount / lessons.length) * 100)}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-hero-gradient transition-all duration-500"
              style={{ width: `${(completedCount / lessons.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Lessons list */}
        <div className="space-y-3">
          {lessons.map((lesson, i) => (
            <Link
              key={lesson.id}
              to={`/grades/${gradeId}/subjects/${subjectId}/lessons/${lesson.id}`}
              className="block opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className={`group rounded-2xl border bg-card p-5 transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5 ${
                lesson.completed ? "border-success/30" : "border-border"
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    lesson.completed ? "bg-success/10" : lesson.free ? "bg-primary/10" : "bg-muted"
                  }`}>
                    {lesson.completed ? (
                      <CheckCircle className="h-5 w-5 text-success" />
                    ) : lesson.free ? (
                      <Play className="h-5 w-5 text-primary" />
                    ) : (
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold ${lesson.completed ? "text-muted-foreground" : "text-card-foreground"}`}>
                      {lesson.title}
                    </h3>
                    <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {lesson.duration}
                      </span>
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
                  {!lesson.free && (
                    <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">مدفوع</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Actions */}
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
