import { useParams, useNavigate } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import SEOHead from "@/components/SEOHead";
import ExamSimulator, { type ExamQuestion } from "@/components/ExamSimulator";

const QuestionBankPage = () => {
  const { gradeId, subjectId } = useParams();
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

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHead
          title={`بنك أسئلة - ${subject?.name || "المادة"}`}
          description="أسئلة مراجعة شاملة مع إجابات نموذجية."
          canonical={`/grades/${gradeId}/subjects/${subjectId}/quiz`}
        />
        <Navbar />
        <div className="container mx-auto px-4 py-10">
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-semibold text-card-foreground mb-2">لم تُضف أسئلة لبنك الأسئلة بعد</p>
            <p className="text-muted-foreground mb-6">سيتم إضافة أسئلة المراجعة قريباً</p>
            <Button variant="outline" onClick={handleExit} className="gap-2">العودة للدروس</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`بنك أسئلة - ${subject?.name || "المادة"}`}
        description="أسئلة تدريبية مع تصحيح فوري وشرح مفصل لكل سؤال."
        canonical={`/grades/${gradeId}/subjects/${subjectId}/quiz`}
      />
      <ExamSimulator
        questions={questions}
        title={`بنك أسئلة — ${subject?.name || "المادة"}`}
        subtitle="تدرّب على الأسئلة مع تصحيح فوري وشرح مفصل"
        durationMinutes={0}
        practiceMode={true}
        shuffle={false}
        onExit={handleExit}
      />
    </div>
  );
};

export default QuestionBankPage;
