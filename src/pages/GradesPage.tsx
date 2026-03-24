import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
import Navbar from "@/components/Navbar";

const grades = [
  { id: "7", name: "الصف السابع", stage: "إعدادي", subjects: 8 },
  { id: "8", name: "الصف الثامن", stage: "إعدادي", subjects: 8 },
  { id: "9", name: "الصف التاسع", stage: "إعدادي", subjects: 8 },
  { id: "10", name: "الصف الأول الثانوي", stage: "ثانوي", subjects: 9 },
  { id: "11", name: "الصف الثاني الثانوي", stage: "ثانوي", subjects: 9 },
  { id: "12", name: "الصف الثالث الثانوي", stage: "ثانوي", subjects: 9, special: true },
];

const GradesPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        <div className="mb-10 text-center">
          <h1 className="mb-3 text-3xl font-bold text-foreground">الصفوف الدراسية</h1>
          <p className="text-muted-foreground">اختر صفك الدراسي للوصول إلى المحتوى التعليمي</p>
        </div>

        {/* إعدادي */}
        <div className="mb-10">
          <h2 className="mb-4 text-lg font-bold text-foreground">المرحلة الإعدادية</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {grades.filter(g => g.stage === "إعدادي").map((grade, i) => (
              <Link
                key={grade.id}
                to={`/grades/${grade.id}/subjects`}
                className="group opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                        <BookOpen className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-card-foreground">{grade.name}</h3>
                        <p className="text-sm text-muted-foreground">{grade.subjects} مواد دراسية</p>
                      </div>
                    </div>
                    <ArrowLeft className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:-translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ثانوي */}
        <div>
          <h2 className="mb-4 text-lg font-bold text-foreground">المرحلة الثانوية</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {grades.filter(g => g.stage === "ثانوي").map((grade, i) => (
              <Link
                key={grade.id}
                to={`/grades/${grade.id}/subjects`}
                className="group opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className={`rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 ${grade.special ? "ring-2 ring-accent" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${grade.special ? "bg-accent/20" : "bg-primary/10"}`}>
                        <BookOpen className={`h-6 w-6 ${grade.special ? "text-accent" : "text-primary"}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-card-foreground">{grade.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {grade.subjects} مواد دراسية
                          {grade.special && <span className="mr-2 text-accent font-semibold">• نماذج وزارية</span>}
                        </p>
                      </div>
                    </div>
                    <ArrowLeft className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:-translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GradesPage;
