import { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import {
  ArrowLeft, ArrowRight, FileText, Play, BookOpen, Lock,
  ChevronRight, ChevronLeft, Download, Maximize2, CheckCircle2,
  Clock, Eye, Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import SEOHead, { courseJsonLd } from "@/components/SEOHead";
import LessonQuiz from "@/components/LessonQuiz";
import { getEmbedUrl, getCdnUrl } from "@/lib/cdn";
import { Progress } from "@/components/ui/progress";
const AiTutorChat = lazy(() => import("@/components/AiTutorChat"));

/* ─── Video Player ─── */
const VideoPlayer = ({ url }: { url: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const embedUrl = getEmbedUrl(url);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-black shadow-card">
      <div className="aspect-video relative">
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 backdrop-blur-sm">
                <Play className="h-7 w-7 text-primary fill-primary" />
              </div>
              <p className="text-sm text-muted-foreground">جاري تحميل الفيديو...</p>
            </div>
          </div>
        )}
        <iframe
          src={embedUrl}
          className="absolute inset-0 h-full w-full"
          allowFullScreen
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        />
      </div>
    </div>
  );
};

const VideoPlaceholder = () => (
  <div className="overflow-hidden rounded-2xl border border-border bg-muted shadow-card">
    <div className="aspect-video flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Play className="h-10 w-10 text-primary" />
        </div>
        <p className="text-lg font-semibold text-foreground">شرح فيديو للدرس</p>
        <p className="text-sm text-muted-foreground mt-1">سيتم إضافة الفيديو قريباً</p>
      </div>
    </div>
  </div>
);

/* ─── PDF Viewer ─── */
const PdfViewer = ({ url }: { url: string }) => {
  const cdnUrl = getCdnUrl(url);
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-2 text-sm font-medium text-card-foreground">
            <FileText className="h-4 w-4 text-primary" />
            <span>ملف الملخص</span>
          </div>
          <div className="flex gap-2">
            <a href={cdnUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                <Maximize2 className="h-3.5 w-3.5" />
                فتح
              </Button>
            </a>
            <a href={cdnUrl} download>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" />
                تحميل
              </Button>
            </a>
          </div>
        </div>
        <div className="aspect-[3/4] sm:aspect-[4/3] md:aspect-[16/10]">
          <iframe
            src={`${cdnUrl}#toolbar=0&navpanes=0`}
            className="h-full w-full"
            title="ملف PDF"
          />
        </div>
      </div>
    </div>
  );
};

/* ─── Text Content ─── */
const TextContent = ({ text }: { text: string }) => (
  <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-card">
    <div className="prose prose-lg max-w-none" style={{ direction: "rtl" }}>
      {text.split("\n").map((line, i) => {
        if (!line.trim()) return <br key={i} />;
        // Bold lines that look like headings (start with # or are short and bold-looking)
        const isHeading = line.startsWith("#");
        const cleanLine = line.replace(/^#+\s*/, "");
        if (isHeading) {
          return (
            <h3 key={i} className="mb-3 mt-6 text-lg font-bold text-card-foreground first:mt-0">
              {cleanLine}
            </h3>
          );
        }
        return (
          <p key={i} className="mb-3 text-card-foreground leading-[1.9] text-[15px]">
            {line}
          </p>
        );
      })}
    </div>
  </div>
);

/* ─── Lesson Navigation ─── */
const LessonNav = ({
  prevLesson,
  nextLesson,
  gradeId,
  subjectId,
}: {
  prevLesson: { id: string; title: string } | null;
  nextLesson: { id: string; title: string } | null;
  gradeId: string;
  subjectId: string;
}) => (
  <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
    {prevLesson ? (
      <Link
        to={`/grades/${gradeId}/subjects/${subjectId}/lessons/${prevLesson.id}`}
        className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:shadow-card hover:border-primary/30 group"
      >
        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-1" />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">الدرس السابق</p>
          <p className="truncate text-sm font-semibold text-card-foreground">{prevLesson.title}</p>
        </div>
      </Link>
    ) : (
      <div />
    )}
    {nextLesson ? (
      <Link
        to={`/grades/${gradeId}/subjects/${subjectId}/lessons/${nextLesson.id}`}
        className="flex items-center justify-end gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:shadow-card hover:border-primary/30 group text-left"
      >
        <div className="min-w-0 text-left">
          <p className="text-xs text-muted-foreground">الدرس التالي</p>
          <p className="truncate text-sm font-semibold text-card-foreground">{nextLesson.title}</p>
        </div>
        <ChevronLeft className="h-5 w-5 text-muted-foreground shrink-0 transition-transform group-hover:-translate-x-1" />
      </Link>
    ) : (
      <div />
    )}
  </div>
);

/* ─── Main Page ─── */
const LessonPage = () => {
  const { gradeId, subjectId, lessonId } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Determine default tab based on lesson content
  const [activeTab, setActiveTab] = useState<"video" | "content" | "quiz" | "ai">("video");

  const { data: lesson, isLoading: lessonLoading, error: lessonError } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, video_url, content_text, content_pdf_url, is_free, duration, sort_order, subject_id")
        .eq("id", lessonId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!lessonId,
  });

  // Fetch adjacent lessons for navigation
  const { data: adjacentLessons } = useQuery({
    queryKey: ["adjacent-lessons", subjectId, lesson?.sort_order],
    queryFn: async () => {
      const { data: allLessons } = await supabase
        .from("lessons")
        .select("id, title, sort_order")
        .eq("subject_id", subjectId!)
        .order("sort_order");
      if (!allLessons) return { prev: null, next: null };
      const idx = allLessons.findIndex((l) => l.id === lessonId);
      return {
        prev: idx > 0 ? allLessons[idx - 1] : null,
        next: idx < allLessons.length - 1 ? allLessons[idx + 1] : null,
      };
    },
    enabled: !!subjectId && !!lesson,
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

  // User progress for this lesson
  const { data: userProgress } = useQuery({
    queryKey: ["lesson-progress", lessonId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_progress")
        .select("completed, quiz_score")
        .eq("lesson_id", lessonId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!lessonId && !isAdmin,
  });

  const markComplete = useMutation({
    mutationFn: async () => {
      const { data: existing } = await supabase
        .from("user_progress")
        .select("id")
        .eq("lesson_id", lessonId!)
        .eq("user_id", user!.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("user_progress")
          .update({ completed: true, completed_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("user_progress")
          .insert({ lesson_id: lessonId!, user_id: user!.id, completed: true, completed_at: new Date().toISOString() });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-progress", lessonId] });
      queryClient.invalidateQueries({ queryKey: ["subject-progress"] });
    },
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["lesson-questions", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("id, question_text, options, correct_index, explanation")
        .eq("lesson_id", lessonId!)
        .order("sort_order");
      if (error) throw error;
      return (data || []).map((q: any) => ({
        ...q,
        options: typeof q.options === "string" ? JSON.parse(q.options) : q.options,
      }));
    },
    enabled: !!lessonId,
  });

  // Set default tab based on available content
  useEffect(() => {
    if (lesson) {
      if (lesson.video_url) setActiveTab("video");
      else if (lesson.content_text || lesson.content_pdf_url) setActiveTab("content");
      else if (questions.length > 0) setActiveTab("quiz");
    }
  }, [lesson?.id]);

  const tabs = [
    ...(lesson?.video_url ? [{ id: "video" as const, label: "الفيديو", icon: Play }] : []),
    ...(lesson?.content_text || lesson?.content_pdf_url
      ? [{ id: "content" as const, label: "الملخص", icon: FileText }]
      : []),
    ...(questions.length > 0 ? [{ id: "quiz" as const, label: `الأسئلة (${questions.length})`, icon: BookOpen }] : []),
    { id: "ai" as const, label: "المساعد الذكي", icon: Bot },
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

  const isCompleted = !!userProgress?.completed;

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
      <div className="container mx-auto px-4 py-6 md:py-10">
        {/* Breadcrumb */}
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link to={`/grades/${gradeId}/subjects`} className="hover:text-primary transition-colors">المواد</Link>
          <ArrowLeft className="h-3 w-3" />
          <Link to={`/grades/${gradeId}/subjects/${subjectId}/lessons`} className="hover:text-primary transition-colors">الدروس</Link>
          <ArrowLeft className="h-3 w-3" />
          <span className="text-foreground font-medium">{lesson.title}</span>
        </div>

        {/* Header with title + meta */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground md:text-2xl">{lesson.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {lesson.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {lesson.duration}
                </span>
              )}
              {lesson.is_free && (
                <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                  مجاني
                </span>
              )}
              {isCompleted && (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  مكتمل
                </span>
              )}
            </div>
          </div>
          {user && !isAdmin && !isCompleted && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0 border-green-500/30 text-green-600 hover:bg-green-500/10 hover:text-green-700"
              onClick={() => markComplete.mutate()}
              disabled={markComplete.isPending}
            >
              <CheckCircle2 className="h-4 w-4" />
              {markComplete.isPending ? "جاري..." : "وضع علامة مكتمل"}
            </Button>
          )}
        </div>

        {/* Tabs */}
        {tabs.length > 1 && (
          <div className="mb-6 flex gap-1.5 rounded-xl border border-border bg-card p-1.5 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-hero-gradient text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="animate-fade-in-up">
          {activeTab === "video" && (
            lesson.video_url ? <VideoPlayer url={lesson.video_url} /> : <VideoPlaceholder />
          )}

          {activeTab === "content" && (
            <div className="space-y-6">
              {lesson.content_text && <TextContent text={lesson.content_text} />}
              {lesson.content_pdf_url && <PdfViewer url={lesson.content_pdf_url} />}
              {!lesson.content_text && !lesson.content_pdf_url && (
                <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
                  <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="text-muted-foreground">لم يُضف محتوى بعد</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "quiz" && (
            <LessonQuiz questions={questions} lessonId={lessonId!} userId={user?.id} />
          )}

          {activeTab === "ai" && (
            <Suspense fallback={<div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
              <AiTutorChat
                inline
                lessonContext={{
                  lessonTitle: lesson.title,
                  lessonContent: lesson.content_text || undefined,
                }}
              />
            </Suspense>
          )}
        </div>

        {/* Navigation */}
        <LessonNav
          prevLesson={adjacentLessons?.prev || null}
          nextLesson={adjacentLessons?.next || null}
          gradeId={gradeId!}
          subjectId={subjectId!}
        />
      </div>
    </div>
  );
};

export default LessonPage;
