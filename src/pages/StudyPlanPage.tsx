import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  Brain, BookOpen, Clock, Sparkles, RefreshCw, CalendarDays,
  Target, Lightbulb, ChevronLeft, ChevronRight, Trophy,
} from "lucide-react";

interface StudyBlock {
  subject: string;
  duration: string;
  method: string;
  tips: string;
  priority: "high" | "medium" | "low";
}

interface StudyPlan {
  greeting: string;
  summary: string;
  studyBlocks: StudyBlock[];
  motivationalTip: string;
  examSuggestion: string;
}

interface ScheduleItem {
  period: number;
  subject: string;
}

const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const priorityConfig = {
  high: { label: "أولوية عالية", className: "bg-destructive/10 text-destructive border-destructive/20" },
  medium: { label: "أولوية متوسطة", className: "bg-accent/10 text-accent-foreground border-accent/20" },
  low: { label: "أولوية منخفضة", className: "bg-muted text-muted-foreground border-border" },
};

const StudyPlanPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [hasPlan, setHasPlan] = useState(false);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [dayName, setDayName] = useState("");
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [noScheduleMsg, setNoScheduleMsg] = useState("");

  const fetchPlan = async (day: number) => {
    if (!user) return;
    setGenerating(true);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-study-plan", {
        body: { dayOfWeek: day },
      });

      if (error) throw error;

      if (data.hasPlan) {
        setPlan(data.plan);
        setSchedule(data.schedule);
        setDayName(data.dayName);
        setHasPlan(true);
        setNoScheduleMsg("");
      } else {
        setHasPlan(false);
        setNoScheduleMsg(data.message);
        setPlan(null);
        setSchedule([]);
        setDayName(DAY_NAMES[day]);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("حدث خطأ أثناء توليد الخطة");
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchPlan(selectedDay);
  }, [user]);

  const changeDay = (delta: number) => {
    const newDay = ((selectedDay + delta) % 7 + 7) % 7;
    setSelectedDay(newDay);
    fetchPlan(newDay);
  };

  if (loading && !generating) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Brain className="h-10 w-10 text-primary animate-pulse" />
            <p className="text-muted-foreground text-sm">المساعد الذكي يحلل جدولك...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-hero-gradient shadow-lg">
              <Brain className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">المساعد الذكي للدراسة</h1>
              <p className="text-sm text-muted-foreground">خطة مراجعة مخصصة لك بالذكاء الاصطناعي</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchPlan(selectedDay)}
            disabled={generating}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
            {generating ? "جارٍ التوليد..." : "تحديث الخطة"}
          </Button>
        </div>

        {/* Day Selector */}
        <div className="mb-6 flex items-center justify-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => changeDay(-1)} disabled={generating}>
            <ChevronRight className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 rounded-xl bg-card border border-border px-6 py-3 shadow-sm">
            <CalendarDays className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold text-foreground">
              {DAY_NAMES[selectedDay]}
            </span>
            {selectedDay === new Date().getDay() && (
              <Badge variant="secondary" className="text-xs">اليوم</Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={() => changeDay(1)} disabled={generating}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>

        {/* No Schedule */}
        {!hasPlan && (
          <Card className="text-center py-12">
            <CardContent className="flex flex-col items-center gap-4">
              <CalendarDays className="h-16 w-16 text-muted-foreground/30" />
              <p className="text-muted-foreground">{noScheduleMsg || "لا يوجد جدول لهذا اليوم"}</p>
              <Link to="/schedule">
                <Button variant="hero" size="sm">إعداد جدول الحصص</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Plan Content */}
        {hasPlan && plan && (
          <div className="space-y-6">
            {/* Greeting Card */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-lg font-semibold text-foreground">{plan.greeting}</p>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{plan.summary}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Today's Schedule Overview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="h-5 w-5 text-primary" />
                  حصص اليوم
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {schedule.map((item) => (
                    <div
                      key={item.period}
                      className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {item.period}
                      </span>
                      <span className="text-sm font-medium text-foreground">{item.subject}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Study Blocks */}
            <div>
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                خطة المراجعة المقترحة
              </h2>
              <div className="grid gap-4">
                {plan.studyBlocks.map((block, i) => {
                  const pConfig = priorityConfig[block.priority] || priorityConfig.medium;
                  return (
                    <Card key={i} className="overflow-hidden">
                      <CardContent className="pt-5">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                          <div className="flex items-center gap-3 sm:min-w-[200px]">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
                              {i + 1}
                            </span>
                            <div>
                              <p className="font-bold text-foreground">{block.subject}</p>
                              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                {block.duration}
                              </div>
                            </div>
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={pConfig.className}>
                                {pConfig.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-foreground">
                              <span className="font-medium">الأسلوب:</span> {block.method}
                            </p>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              <Lightbulb className="inline h-3.5 w-3.5 text-accent ml-1" />
                              {block.tips}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Exam Suggestion */}
            {plan.examSuggestion && (
              <Card className="border-accent/20 bg-accent/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Trophy className="h-6 w-6 text-accent shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground">اقتراح اختبار</p>
                      <p className="text-sm text-muted-foreground mt-1">{plan.examSuggestion}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Motivational */}
            {plan.motivationalTip && (
              <div className="rounded-xl bg-hero-gradient p-6 text-center">
                <Sparkles className="h-6 w-6 text-primary-foreground mx-auto mb-2" />
                <p className="text-primary-foreground font-medium leading-relaxed">
                  {plan.motivationalTip}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyPlanPage;
