import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, FileText, Play, BookOpen, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import SEOHead, { courseJsonLd } from "@/components/SEOHead";
import LazyMedia from "@/components/LazyMedia";
import LessonQuiz from "@/components/LessonQuiz";
import { getEmbedUrl, getCdnUrl } from "@/lib/cdn";

const LessonPage = () => {
  const { gradeId, subjectId, lessonId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"video" | "content" | "quiz">("video");

  const { data: lesson, isLoading: lessonLoading, error: lessonError } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase.from("lessons").select("id, title, video_url, content_text, content_pdf_url, is_free").eq("id", lessonId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!lessonId,
  });

  const { data: hasSubscription = false } = useQuery({
    queryKey: ["subscription-check", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .limit(1);
      return !!data && data.length > 0;
    },
    enabled: !!user,
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["lesson-questions", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase.from("questions").select("id, question_text, options, correct_index, explanation").eq("lesson_id", lessonId!).order("sort_order");
      if (error) throw error;
      return (data || []).map((q: any) => ({
        ...q,
        options: typeof q.options === "string" ? JSON.parse(q.options) : q.options,
      }));
    },
    enabled: !!lessonId,
  });


  const tabs = [
    { id: "video" as const, label: "الفيديو", icon: Play },
    { id: "content" as const, label: "الشرح", icon: FileText },
    { id: "quiz" as const, label: "الأسئلة", icon: BookOpen },
  ];

  if (lessonLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!lesson || lessonError) {
    // If RLS blocked access, show subscription prompt
    const isBlocked = lessonError && !lesson;
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          {isBlocked ? (
            <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 shadow-card">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                <Lock className="h-8 w-8 text-accent" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-card-foreground">محتوى مدفوع</h2>
              <p className="mb-6 text-muted-foreground">هذا الدرس متاح فقط للمشتركين. اشترك الآن للوصول لجميع الدروس.</p>
              <Button variant="hero" onClick={() => navigate("/subscribe")} className="w-full">اشترك الآن</Button>
            </div>
          ) : (
            <p className="text-muted-foreground">الدرس غير موجود</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={lesson.title}
        description={`درس ${lesson.title} - شرح فيديو واختبارات تفاعلية في منصة تنوير التعليمية.`}
        canonical={`/grades/${gradeId}/subjects/${subjectId}/lessons/${lessonId}`}
        type="course"
        jsonLd={courseJsonLd(lesson.title, `درس ${lesson.title}`, `/grades/${gradeId}/subjects/${subjectId}/lessons/${lessonId}`)}
      />
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link to={`/grades/${gradeId}/subjects`} className="hover:text-primary transition-colors">المواد</Link>
          <ArrowLeft className="h-3 w-3" />
          <Link to={`/grades/${gradeId}/subjects/${subjectId}/lessons`} className="hover:text-primary transition-colors">الدروس</Link>
          <ArrowLeft className="h-3 w-3" />
          <span className="text-foreground font-medium">{lesson.title}</span>
        </div>

        <h1 className="mb-6 text-2xl font-bold text-foreground">{lesson.title}</h1>

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

        {activeTab === "video" && (
          <div className="animate-fade-in-up">
            {lesson.video_url ? (
              <LazyMedia
                className="aspect-video overflow-hidden rounded-2xl border border-border"
                placeholder={
                  <div className="aspect-video rounded-2xl border border-border bg-muted flex items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                }
              >
                <iframe
                  src={getEmbedUrl(lesson.video_url)}
                  className="h-full w-full"
                  allowFullScreen
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </LazyMedia>
            ) : (
              <div className="aspect-video overflow-hidden rounded-2xl border border-border bg-muted flex items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Play className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-lg font-semibold text-foreground">شرح فيديو للدرس</p>
                  <p className="text-sm text-muted-foreground mt-1">سيتم إضافة الفيديو قريباً</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "content" && (
          <div className="animate-fade-in-up">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              {lesson.content_text ? (
                <div className="prose prose-lg max-w-none" style={{ direction: "rtl" }}>
                  {lesson.content_text.split("\n").map((line, i) => (
                    <p key={i} className="mb-3 text-card-foreground leading-relaxed">{line}</p>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">لم يُضف محتوى نصي بعد</p>
              )}
              {lesson.content_pdf_url && (
                <a href={getCdnUrl(lesson.content_pdf_url)} target="_blank" rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                  <FileText className="h-4 w-4" />
                  تحميل ملف PDF
                </a>
              )}
            </div>
          </div>
        )}

        {activeTab === "quiz" && (
          <LessonQuiz questions={questions} lessonId={lessonId!} userId={user?.id} />
        )}

        <div className="mt-8 flex justify-between">
          <Link to={`/grades/${gradeId}/subjects/${subjectId}/lessons`}>
            <Button variant="outline" className="gap-2">
              <ArrowRight className="h-4 w-4" />
              العودة للدروس
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LessonPage;
