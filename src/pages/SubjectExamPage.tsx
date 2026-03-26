import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Lock, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import SEOHead from "@/components/SEOHead";
import ExamSimulator, { type ExamQuestion } from "@/components/ExamSimulator";

const SubjectExamPage = () => {
  const { gradeId, subjectId } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

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

  const handleExit = () => {
    navigate(`/grades/${gradeId}/subjects/${subjectId}/lessons`);
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

  // Gate: require subscription
  if (!hasSubscription && !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 shadow-card">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
              <Lock className="h-8 w-8 text-accent" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-card-foreground">الاختبار الشامل متاح للمشتركين</h2>
            <p className="mb-6 text-muted-foreground">اشترك الآن للوصول إلى اختبارات المحاكاة لجميع المواد.</p>
            <Button variant="hero" onClick={() => navigate("/subscribe")} className="w-full">اشترك الآن</Button>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHead
          title={`اختبار محاكاة - ${subject?.name || "المادة"}`}
          description="اختبار محاكاة شامل يحاكي الاختبار النهائي."
          canonical={`/grades/${gradeId}/subjects/${subjectId}/exam`}
        />
        <Navbar />
        <div className="container mx-auto px-4 py-10">
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-semibold text-card-foreground mb-2">لم تُضف أسئلة للاختبار الشامل بعد</p>
            <p className="text-muted-foreground mb-6">سيتم إضافة أسئلة الاختبار قريباً</p>
            <Button variant="outline" onClick={handleExit} className="gap-2">
              <ArrowRight className="h-4 w-4" />
              العودة للدروس
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate duration: ~1.5 min per question, min 15, max 120
  const autoDuration = Math.min(120, Math.max(15, Math.round(questions.length * 1.5)));

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`اختبار محاكاة - ${subject?.name || "المادة"}`}
        description="اختبار محاكاة شامل يحاكي الاختبار النهائي الحقيقي مع مؤقت ولوحة أسئلة."
        canonical={`/grades/${gradeId}/subjects/${subjectId}/exam`}
      />
      <ExamSimulator
        questions={questions}
        title={`اختبار محاكاة — ${subject?.name || "المادة"}`}
        subtitle="اختبار شامل يحاكي الاختبار النهائي الحقيقي"
        durationMinutes={autoDuration}
        practiceMode={false}
        shuffle={true}
        onExit={handleExit}
      />
    </div>
  );
};

export default SubjectExamPage;
