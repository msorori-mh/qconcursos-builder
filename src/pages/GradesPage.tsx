import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import SEOHead, { breadcrumbJsonLd } from "@/components/SEOHead";

interface Grade {
  id: string;
  name: string;
  slug: string;
  category: string;
  sort_order: number;
}

const fetchGrades = async (): Promise<Grade[]> => {
  const { data, error } = await supabase
    .from("grades")
    .select("id, name, slug, category, sort_order")
    .order("sort_order");
  if (error) throw error;
  return data || [];
};

const GradeCard = ({ grade, i, special }: { grade: Grade; i: number; special?: boolean }) => (
  <Link
    to={`/grades/${grade.id}/subjects`}
    className="group opacity-0 animate-fade-in-up"
    style={{ animationDelay: `${i * 0.1}s` }}
  >
    <div className={`rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 ${special ? "ring-2 ring-accent" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${special ? "bg-accent/20" : "bg-primary/10"}`}>
            <BookOpen className={`h-6 w-6 ${special ? "text-accent" : "text-primary"}`} />
          </div>
          <div>
            <h3 className="font-bold text-card-foreground">{grade.name}</h3>
            {special && <span className="text-sm text-accent font-semibold">نماذج وزارية</span>}
          </div>
        </div>
        <ArrowLeft className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:-translate-x-1" />
      </div>
    </div>
  </Link>
);

const GradesPage = () => {
  const { profile, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const { data: grades = [], isLoading } = useQuery({
    queryKey: ["grades"],
    queryFn: fetchGrades,
  });

  // Redirect non-admin students to their grade directly
  useEffect(() => {
    if (!authLoading && !isAdmin && profile?.grade_id) {
      navigate(`/grades/${profile.grade_id}/subjects`, { replace: true });
    }
  }, [authLoading, isAdmin, profile, navigate]);

  const prep = grades.filter((g) => g.category === "إعدادي");
  const sec = grades.filter((g) => g.category === "ثانوي");
  const isThirdSec = (g: Grade) => g.sort_order === 6;

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  // If non-admin student with grade_id, they'll be redirected above
  // Show grades page only for admins or students without grade_id
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="الصفوف الدراسية"
        description="اختر صفك الدراسي للوصول إلى المواد والدروس التعليمية في منصة تنوير. المرحلة الإعدادية والثانوية."
        canonical="/grades"
        jsonLd={breadcrumbJsonLd([{ name: "الصفوف", url: "/grades" }])}
      />
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        <div className="mb-10 text-center">
          <h1 className="mb-3 text-3xl font-bold text-foreground">الصفوف الدراسية</h1>
          <p className="text-muted-foreground">اختر صفك الدراسي للوصول إلى المحتوى التعليمي</p>
        </div>

        {prep.length > 0 && (
          <div className="mb-10">
            <h2 className="mb-4 text-lg font-bold text-foreground">المرحلة الإعدادية</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {prep.map((g, i) => <GradeCard key={g.id} grade={g} i={i} />)}
            </div>
          </div>
        )}

        {sec.length > 0 && (
          <div>
            <h2 className="mb-4 text-lg font-bold text-foreground">المرحلة الثانوية</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sec.map((g, i) => <GradeCard key={g.id} grade={g} i={i} special={isThirdSec(g)} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GradesPage;
