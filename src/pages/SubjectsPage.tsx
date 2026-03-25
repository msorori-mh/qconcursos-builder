import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Calculator, Globe, FlaskConical, Atom, BookText, Dumbbell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import SEOHead, { breadcrumbJsonLd } from "@/components/SEOHead";

const iconMap: Record<string, any> = {
  Calculator, Globe, FlaskConical, Atom, BookText, BookOpen, Dumbbell,
};

interface SubjectItem {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  lessons_count: number | null;
}

const SubjectGrid = ({ subjects, gradeId }: { subjects: SubjectItem[]; gradeId: string }) => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {subjects.map((subject, i) => {
      const IconComp = iconMap[subject.icon || "BookOpen"] || BookOpen;
      const color = subject.color || "#3b82f6";
      return (
        <Link
          key={subject.id}
          to={`/grades/${gradeId}/subjects/${subject.id}/lessons`}
          className="group opacity-0 animate-fade-in-up"
          style={{ animationDelay: `${i * 0.08}s` }}
        >
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl" style={{ backgroundColor: color + "18" }}>
                <IconComp className="h-7 w-7" style={{ color }} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-card-foreground">{subject.name}</h3>
                <p className="text-sm text-muted-foreground">{subject.lessons_count || 0} درس</p>
              </div>
              <ArrowLeft className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:-translate-x-1" />
            </div>
          </div>
        </Link>
      );
    })}
  </div>
);

const SubjectsPage = () => {
  const { gradeId } = useParams();

  const { data: grade } = useQuery({
    queryKey: ["grade", gradeId],
    queryFn: async () => {
      const { data, error } = await supabase.from("grades").select("id, name, slug, category").eq("id", gradeId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!gradeId,
  });

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ["subjects", gradeId],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id, name, slug, icon, color, lessons_count").eq("grade_id", gradeId!).order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!gradeId,
  });

  const gradeName = grade?.name || "الصف الدراسي";
  const isThirdSec = grade?.slug === "grade-12";
  const hasBranches = grade?.slug === "grade-11" || grade?.slug === "grade-12";

  const sciSubjects = subjects.filter((s) => s.slug.endsWith("-sci") || (!s.slug.endsWith("-lit") && hasBranches && !s.slug.endsWith("-lit")));
  const litSubjects = subjects.filter((s) => s.slug.endsWith("-lit"));

  // For grades with branches, split scientific (non -lit slugs) from literary (-lit slugs)
  const sciOnly = hasBranches ? subjects.filter((s) => !s.slug.endsWith("-lit")) : [];
  const litOnly = hasBranches ? subjects.filter((s) => s.slug.endsWith("-lit")) : [];

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
        title={`مواد ${gradeName}`}
        description={`تصفح المواد الدراسية المتاحة لـ${gradeName} في منصة تنوير التعليمية.`}
        canonical={`/grades/${gradeId}/subjects`}
        jsonLd={breadcrumbJsonLd([
          { name: "الصفوف", url: "/grades" },
          { name: gradeName, url: `/grades/${gradeId}/subjects` },
        ])}
      />
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        <div className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/grades" className="hover:text-primary transition-colors">الصفوف</Link>
          <ArrowLeft className="h-3 w-3" />
          <span className="text-foreground font-medium">{gradeName}</span>
        </div>

        <div className="mb-10">
          <h1 className="mb-2 text-2xl font-bold text-foreground md:text-3xl">{gradeName}</h1>
          <p className="text-muted-foreground">اختر المادة الدراسية للبدء</p>
        </div>

        {subjects.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
            <p className="text-muted-foreground">لم تُضاف مواد لهذا الصف بعد</p>
          </div>
        ) : hasBranches ? (
          <>
            {sciOnly.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-4 text-lg font-bold text-foreground flex items-center gap-2">
                  <Atom className="h-5 w-5 text-primary" />
                  الفرع العلمي
                </h2>
                <SubjectGrid subjects={sciOnly} gradeId={gradeId!} />
              </div>
            )}
            {litOnly.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-4 text-lg font-bold text-foreground flex items-center gap-2">
                  <BookText className="h-5 w-5 text-accent" />
                  الفرع الأدبي
                </h2>
                <SubjectGrid subjects={litOnly} gradeId={gradeId!} />
              </div>
            )}
          </>
        ) : (
          <SubjectGrid subjects={subjects} gradeId={gradeId!} />
        )}

        {isThirdSec && (
          <div className="mt-10 rounded-2xl border-2 border-accent/30 bg-accent/5 p-6 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
                <BookOpen className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-bold text-foreground">النماذج الوزارية والاختبارات التجريبية</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">راجع نماذج الاختبارات الوزارية للسنوات السابقة واختبر نفسك باختبارات محاكاة</p>
            <Link to={`/grades/${gradeId}/exams`}>
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
