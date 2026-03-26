import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Brain, Target, TrendingUp, TrendingDown, BookOpen, Zap,
  CheckCircle2, AlertTriangle, ArrowLeft, Sparkles, Star,
  ChevronLeft, RefreshCw, Loader2, Trophy, Lightbulb,
} from "lucide-react";

interface SubjectPerf {
  subjectId: string;
  subjectName: string;
  totalLessons: number;
  completedCount: number;
  completionPct: number;
  avgScore: number | null;
  weakLessonsCount: number;
  nextLesson: { id: string; title: string } | null;
  reviewPriority: { id: string; title: string; score: number | null; questionsCount: number }[];
}

interface AiRecs {
  overallAssessment: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: { type: string; subject: string; action: string; priority: string }[];
  motivationalMessage: string;
}

interface AdaptiveData {
  performance: {
    totalSubjects: number;
    overallCompletion: number;
    subjects: SubjectPerf[];
  };
  ai: AiRecs | null;
}

const priorityColors: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-accent/10 text-accent border-accent/20",
  low: "bg-primary/10 text-primary border-primary/20",
};

const typeIcons: Record<string, typeof Brain> = {
  review: RefreshCw,
  practice: Target,
  advance: TrendingUp,
};

const AdaptiveLearningPage = () => {
  const { user, profile } = useAuth();
  const gradeId = profile?.grade_id;

  const { data, isLoading, refetch, isFetching } = useQuery<AdaptiveData>({
    queryKey: ["adaptive-recommendations", user?.id],
    queryFn: async () => {
      const { data: result, error } = await supabase.functions.invoke("adaptive-recommendations");
      if (error) throw error;
      return result;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  const perf = data?.performance;
  const ai = data?.ai;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="التعلم التكيفي" description="نظام تعلم ذكي يحلل أداءك ويقترح خطة مراجعة مخصصة" />
      <Navbar />
      <div className="container mx-auto px-4 py-6 md:py-10 max-w-3xl">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground md:text-2xl">التعلم التكيفي</h1>
              <p className="text-sm text-muted-foreground">تحليل ذكي لأدائك وتوصيات مخصصة</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">جاري تحليل أدائك...</p>
          </div>
        ) : !perf ? (
          <div className="text-center py-16 text-muted-foreground">لا توجد بيانات كافية للتحليل</div>
        ) : (
          <div className="space-y-6">
            {/* Overall Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "المواد", value: perf.totalSubjects, icon: BookOpen, color: "text-primary" },
                { label: "الإنجاز", value: `${perf.overallCompletion}%`, icon: CheckCircle2, color: "text-green-600" },
                {
                  label: "متوسط الدرجات",
                  value: perf.subjects.filter(s => s.avgScore != null).length > 0
                    ? `${Math.round(perf.subjects.filter(s => s.avgScore != null).reduce((a, s) => a + (s.avgScore || 0), 0) / perf.subjects.filter(s => s.avgScore != null).length)}%`
                    : "—",
                  icon: Target,
                  color: "text-accent",
                },
                {
                  label: "تحتاج مراجعة",
                  value: perf.subjects.reduce((a, s) => a + s.weakLessonsCount, 0),
                  icon: AlertTriangle,
                  color: "text-destructive",
                },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-border bg-card p-3 text-center shadow-card">
                  <stat.icon className={`h-5 w-5 mx-auto mb-1 ${stat.color}`} />
                  <p className="text-lg font-bold text-card-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* AI Assessment */}
            {ai && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h2 className="text-base font-bold text-foreground">تحليل الذكاء الاصطناعي</h2>
                </div>

                {ai.overallAssessment && (
                  <p className="text-sm text-foreground leading-relaxed bg-card rounded-xl p-4 border border-border">
                    {ai.overallAssessment}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Strengths */}
                  {ai.strengths?.length > 0 && (
                    <div className="rounded-xl bg-green-500/5 border border-green-500/20 p-4">
                      <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 flex items-center gap-1.5 mb-2">
                        <TrendingUp className="h-4 w-4" />
                        نقاط القوة
                      </h3>
                      <ul className="space-y-1.5">
                        {ai.strengths.map((s, i) => (
                          <li key={i} className="text-xs text-foreground flex items-start gap-2">
                            <Star className="h-3 w-3 text-green-600 shrink-0 mt-0.5" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Weaknesses */}
                  {ai.weaknesses?.length > 0 && (
                    <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-4">
                      <h3 className="text-sm font-semibold text-destructive flex items-center gap-1.5 mb-2">
                        <TrendingDown className="h-4 w-4" />
                        نقاط تحتاج تحسين
                      </h3>
                      <ul className="space-y-1.5">
                        {ai.weaknesses.map((w, i) => (
                          <li key={i} className="text-xs text-foreground flex items-start gap-2">
                            <AlertTriangle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* AI Recommendations */}
                {ai.recommendations?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-3">
                      <Lightbulb className="h-4 w-4 text-accent" />
                      التوصيات
                    </h3>
                    <div className="space-y-2">
                      {ai.recommendations.map((rec, i) => {
                        const Icon = typeIcons[rec.type] || Lightbulb;
                        return (
                          <div
                            key={i}
                            className={`rounded-lg border p-3 flex items-start gap-3 ${priorityColors[rec.priority] || priorityColors.low}`}
                          >
                            <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-semibold">{rec.subject}</p>
                              <p className="text-xs opacity-80">{rec.action}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Motivational */}
                {ai.motivationalMessage && (
                  <div className="rounded-lg bg-accent/10 border border-accent/20 p-3 text-center">
                    <Trophy className="h-5 w-5 text-accent mx-auto mb-1" />
                    <p className="text-xs text-foreground font-medium">{ai.motivationalMessage}</p>
                  </div>
                )}
              </div>
            )}

            {/* Subject Cards */}
            <div>
              <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                تحليل المواد
              </h2>
              <div className="space-y-3">
                {perf.subjects.map((subject) => (
                  <div key={subject.subjectId} className="rounded-xl border border-border bg-card p-4 shadow-card">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-card-foreground">{subject.subjectName}</h3>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        subject.completionPct >= 80 ? "bg-green-500/10 text-green-600" :
                        subject.completionPct >= 40 ? "bg-accent/10 text-accent" :
                        "bg-destructive/10 text-destructive"
                      }`}>
                        {subject.completionPct}%
                      </span>
                    </div>

                    <Progress value={subject.completionPct} className="h-1.5 mb-3" />

                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      <span>{subject.completedCount}/{subject.totalLessons} درس</span>
                      {subject.avgScore != null && (
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          المعدل: {subject.avgScore}%
                        </span>
                      )}
                      {subject.weakLessonsCount > 0 && (
                        <span className="flex items-center gap-1 text-destructive">
                          <AlertTriangle className="h-3 w-3" />
                          {subject.weakLessonsCount} درس ضعيف
                        </span>
                      )}
                    </div>

                    {/* Review Priority Lessons */}
                    {subject.reviewPriority.length > 0 && (
                      <div className="mb-3 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground mb-1">دروس تحتاج مراجعة:</p>
                        {subject.reviewPriority.map((lesson) => (
                          <Link
                            key={lesson.id}
                            to={`/grades/${gradeId}/subjects/${subject.subjectId}/lessons/${lesson.id}`}
                            className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 hover:bg-muted transition-colors text-xs"
                          >
                            <span className="text-foreground font-medium">{lesson.title}</span>
                            <span className={`font-semibold ${
                              lesson.score == null ? "text-muted-foreground" :
                              lesson.score < 50 ? "text-destructive" :
                              lesson.score < 80 ? "text-accent" : "text-green-600"
                            }`}>
                              {lesson.score != null ? `${lesson.score}%` : "لم يُختبر"}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      {subject.nextLesson && (
                        <Link
                          to={`/grades/${gradeId}/subjects/${subject.subjectId}/lessons/${subject.nextLesson.id}`}
                          className="flex-1"
                        >
                          <Button variant="outline" size="sm" className="w-full gap-1 text-xs">
                            <ChevronLeft className="h-3 w-3" />
                            أكمل: {subject.nextLesson.title}
                          </Button>
                        </Link>
                      )}
                      <Link to={`/grades/${gradeId}/subjects/${subject.subjectId}/review`}>
                        <Button variant="ghost" size="sm" className="gap-1 text-xs">
                          <Zap className="h-3 w-3" />
                          مراجعة سريعة
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdaptiveLearningPage;
