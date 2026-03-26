import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, BookOpen, Lightbulb, Loader2, AlertCircle, Database } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AiSummaryData {
  summary: string;
  keyPoints: { title: string; detail: string }[];
  studyTip: string;
  cached?: boolean;
}

const AiLessonSummary = ({
  lessonId,
  lessonTitle,
  lessonContent,
}: {
  lessonId?: string;
  lessonTitle: string;
  lessonContent: string | null;
}) => {
  const [data, setData] = useState<AiSummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!lessonId);
  const [error, setError] = useState<string | null>(null);

  // Try loading cached summary on mount
  useEffect(() => {
    if (!lessonId) { setInitialLoading(false); return; }
    supabase
      .from("lesson_summaries" as any)
      .select("summary, key_points, study_tip")
      .eq("lesson_id", lessonId)
      .maybeSingle()
      .then(({ data: cached }) => {
        if (cached) {
          setData({
            summary: (cached as any).summary,
            keyPoints: (cached as any).key_points || [],
            studyTip: (cached as any).study_tip || "",
            cached: true,
          });
        }
        setInitialLoading(false);
      });
  }, [lessonId]);

  const generate = async (regenerate = false) => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke(
        "generate-lesson-summary",
        { body: { lessonTitle, lessonContent, lessonId, regenerate } }
      );
      if (fnError) throw fnError;
      if (result?.error) throw new Error(result.error);
      setData(result);
    } catch (e: any) {
      const msg = e?.message || "فشل توليد الملخص";
      setError(msg);
      toast({ title: "خطأ", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
        <Loader2 className="h-6 w-6 text-primary mx-auto mb-2 animate-spin" />
        <p className="text-xs text-muted-foreground">جاري تحميل الملخص...</p>
      </div>
    );
  }

  if (!data && !loading) {
    return (
      <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-6 text-center">
        <Sparkles className="h-8 w-8 text-primary mx-auto mb-3" />
        <h3 className="text-base font-bold text-foreground mb-1">ملخص ذكي بالذكاء الاصطناعي</h3>
        <p className="text-sm text-muted-foreground mb-4">
          دع الذكاء الاصطناعي يلخص لك أهم نقاط الدرس للمراجعة السريعة
        </p>
        <Button onClick={() => generate(false)} className="gap-2">
          <Sparkles className="h-4 w-4" />
          توليد الملخص
        </Button>
        {error && (
          <p className="text-sm text-destructive mt-3 flex items-center justify-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center">
        <Loader2 className="h-8 w-8 text-primary mx-auto mb-3 animate-spin" />
        <p className="text-sm text-muted-foreground">جاري توليد الملخص الذكي...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-card space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold text-card-foreground">ملخص ذكي</h3>
        </div>
        {data.cached && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">
            <Database className="h-3 w-3" />
            محفوظ
          </span>
        )}
      </div>

      {/* Summary */}
      {data.summary && (
        <p className="text-sm text-foreground leading-relaxed bg-muted/50 rounded-xl p-4">
          {data.summary}
        </p>
      )}

      {/* Key Points */}
      {data.keyPoints?.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            النقاط الرئيسية
          </h4>
          <div className="space-y-2">
            {data.keyPoints.map((point, i) => (
              <div key={i} className="rounded-lg border border-border bg-background p-3">
                <p className="text-sm font-semibold text-foreground mb-1 flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary mt-0.5">
                    {i + 1}
                  </span>
                  {point.title}
                </p>
                {point.detail && (
                  <p className="text-xs text-muted-foreground leading-relaxed pr-7">
                    {point.detail}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Study Tip */}
      {data.studyTip && (
        <div className="rounded-lg bg-accent/10 border border-accent/20 p-3 flex items-start gap-2">
          <Lightbulb className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-foreground mb-0.5">نصيحة للمذاكرة</p>
            <p className="text-xs text-muted-foreground">{data.studyTip}</p>
          </div>
        </div>
      )}

      {/* Regenerate */}
      <div className="text-center">
        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => generate(true)} disabled={loading}>
          <Sparkles className="h-3 w-3" />
          إعادة التوليد
        </Button>
      </div>
    </div>
  );
};

export default AiLessonSummary;
