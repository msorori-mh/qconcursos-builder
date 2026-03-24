import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Calculator, Globe, FlaskConical, Atom, BookText, Palette, Dumbbell } from "lucide-react";
import Navbar from "@/components/Navbar";

const subjectsByGrade: Record<string, { id: string; name: string; icon: any; lessons: number; color: string }[]> = {
  "7": [
    { id: "math", name: "الرياضيات", icon: Calculator, lessons: 24, color: "bg-blue-500/10 text-blue-600" },
    { id: "arabic", name: "اللغة العربية", icon: BookText, lessons: 20, color: "bg-emerald-500/10 text-emerald-600" },
    { id: "english", name: "اللغة الإنجليزية", icon: Globe, lessons: 18, color: "bg-purple-500/10 text-purple-600" },
    { id: "science", name: "العلوم", icon: FlaskConical, lessons: 22, color: "bg-amber-500/10 text-amber-600" },
    { id: "islamic", name: "التربية الإسلامية", icon: BookOpen, lessons: 16, color: "bg-teal-500/10 text-teal-600" },
    { id: "social", name: "الدراسات الاجتماعية", icon: Globe, lessons: 14, color: "bg-rose-500/10 text-rose-600" },
  ],
  "12": [
    { id: "math", name: "الرياضيات", icon: Calculator, lessons: 30, color: "bg-blue-500/10 text-blue-600" },
    { id: "arabic", name: "اللغة العربية", icon: BookText, lessons: 25, color: "bg-emerald-500/10 text-emerald-600" },
    { id: "english", name: "اللغة الإنجليزية", icon: Globe, lessons: 22, color: "bg-purple-500/10 text-purple-600" },
    { id: "physics", name: "الفيزياء", icon: Atom, lessons: 28, color: "bg-amber-500/10 text-amber-600" },
    { id: "chemistry", name: "الكيمياء", icon: FlaskConical, lessons: 26, color: "bg-teal-500/10 text-teal-600" },
    { id: "biology", name: "الأحياء", icon: Dumbbell, lessons: 24, color: "bg-rose-500/10 text-rose-600" },
  ],
};

// Default subjects for grades without specific data
const defaultSubjects = [
  { id: "math", name: "الرياضيات", icon: Calculator, lessons: 24, color: "bg-blue-500/10 text-blue-600" },
  { id: "arabic", name: "اللغة العربية", icon: BookText, lessons: 20, color: "bg-emerald-500/10 text-emerald-600" },
  { id: "english", name: "اللغة الإنجليزية", icon: Globe, lessons: 18, color: "bg-purple-500/10 text-purple-600" },
  { id: "science", name: "العلوم", icon: FlaskConical, lessons: 22, color: "bg-amber-500/10 text-amber-600" },
  { id: "islamic", name: "التربية الإسلامية", icon: BookOpen, lessons: 16, color: "bg-teal-500/10 text-teal-600" },
  { id: "social", name: "الدراسات الاجتماعية", icon: Globe, lessons: 14, color: "bg-rose-500/10 text-rose-600" },
];

const gradeNames: Record<string, string> = {
  "7": "الصف السابع",
  "8": "الصف الثامن",
  "9": "الصف التاسع",
  "10": "الصف الأول الثانوي",
  "11": "الصف الثاني الثانوي",
  "12": "الصف الثالث الثانوي",
};

const SubjectsPage = () => {
  const { gradeId } = useParams();
  const subjects = subjectsByGrade[gradeId || ""] || defaultSubjects;
  const gradeName = gradeNames[gradeId || ""] || "الصف الدراسي";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/grades" className="hover:text-primary transition-colors">الصفوف</Link>
          <ArrowLeft className="h-3 w-3" />
          <span className="text-foreground font-medium">{gradeName}</span>
        </div>

        <div className="mb-10">
          <h1 className="mb-2 text-2xl font-bold text-foreground md:text-3xl">{gradeName}</h1>
          <p className="text-muted-foreground">اختر المادة الدراسية للبدء</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject, i) => (
            <Link
              key={subject.id}
              to={`/grades/${gradeId}/subjects/${subject.id}/lessons`}
              className="group opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1">
                <div className="flex items-center gap-4">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${subject.color.split(" ")[0]}`}>
                    <subject.icon className={`h-7 w-7 ${subject.color.split(" ")[1]}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-card-foreground">{subject.name}</h3>
                    <p className="text-sm text-muted-foreground">{subject.lessons} درس</p>
                  </div>
                  <ArrowLeft className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:-translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {gradeId === "12" && (
          <div className="mt-10 rounded-2xl border-2 border-accent/30 bg-accent/5 p-6 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
                <BookOpen className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-bold text-foreground">النماذج الوزارية والاختبارات التجريبية</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">راجع نماذج الاختبارات الوزارية للسنوات السابقة واختبر نفسك باختبارات محاكاة</p>
            <Link to={`/grades/12/exams`}>
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
