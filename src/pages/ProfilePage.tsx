import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  User, BookOpen, Award, Clock, CheckCircle2, CreditCard,
  Pencil, Save, X, Lock, Share2, Copy, Check, Users,
  TrendingUp, Target, GraduationCap, Download, Activity,
  Calendar, Trophy, Zap,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRef } from "react";

/* ─── Types ─── */
const YEMEN_GOVERNORATES = [
  "أمانة العاصمة", "عدن", "تعز", "الحديدة", "إب", "ذمار", "حجة", "صعدة",
  "صنعاء", "عمران", "المحويت", "ريمة", "البيضاء", "لحج", "أبين", "الضالع",
  "شبوة", "حضرموت", "المهرة", "سقطرى", "مأرب", "الجوف",
];

interface Profile {
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  grade_id: string | null;
  referral_code: string | null;
  governorate: string | null;
  school_name: string | null;
}

interface Subscription {
  id: string;
  status: string;
  starts_at: string | null;
  expires_at: string | null;
  grades?: { name: string } | null;
}

interface ProgressItem {
  lesson_id: string;
  completed: boolean | null;
  quiz_score: number | null;
  completed_at: string | null;
  lessons?: { title: string; subjects?: { name: string; grades?: { name: string } } } | null;
}

interface SubjectProgress {
  subjectId: string;
  subjectName: string;
  gradeName: string;
  totalLessons: number;
  completedLessons: number;
  quizScores: number[];
  avgScore: number;
  completionPercent: number;
}

interface Certificate {
  id: string;
  subject_id: string;
  issued_at: string;
  subjects?: { name: string; grades?: { name: string } } | null;
}

/* ─── Tabs ─── */
type TabId = "overview" | "progress" | "certificates" | "settings";

const ProfilePage = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [recentProgress, setRecentProgress] = useState<ProgressItem[]>([]);
  const [subjectProgress, setSubjectProgress] = useState<SubjectProgress[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // Edit states
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: "", phone: "", grade_id: "", governorate: "", school_name: "" });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPass: "", confirm: "" });
  const [savingPassword, setSavingPassword] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Certificate dialog
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const certRef = useRef<HTMLDivElement>(null);

  const { data: grades = [] } = useQuery({
    queryKey: ["grades-profile"],
    queryFn: async () => {
      const { data } = await supabase.from("grades").select("id, name, category").order("sort_order");
      return data || [];
    },
  });

  const { data: referralStats } = useQuery({
    queryKey: ["referral-stats", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("referrals").select("id, status").eq("referrer_id", user!.id);
      return { total: data?.length || 0, completed: data?.filter((r: any) => r.status === "completed").length || 0 };
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (user) loadAllData();
  }, [user]);

  const loadAllData = async () => {
    if (!user) return;
    const [profileRes, subsRes, progressRes, certsRes, lessonsRes, subjectsRes, gradesRes] = await Promise.all([
      supabase.from("profiles").select("full_name, phone, avatar_url, grade_id, referral_code, governorate, school_name").eq("user_id", user.id).maybeSingle(),
      supabase.from("subscriptions").select("id, status, starts_at, expires_at, grades(name)").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("user_progress").select("lesson_id, completed, quiz_score, completed_at, lessons(title, subjects(name, grades(name)))").eq("user_id", user.id).order("completed_at", { ascending: false }).limit(50),
      supabase.from("certificates" as any).select("id, subject_id, issued_at, subjects(name, grades(name))").eq("user_id", user.id).order("issued_at", { ascending: false }),
      supabase.from("lessons").select("id, subject_id"),
      supabase.from("subjects").select("id, name, grade_id"),
      supabase.from("grades").select("id, name"),
    ]);

    if (profileRes.data) {
      setProfile(profileRes.data as Profile);
      setEditForm({ full_name: profileRes.data.full_name || "", phone: profileRes.data.phone || "", grade_id: profileRes.data.grade_id || "", governorate: (profileRes.data as any).governorate || "", school_name: (profileRes.data as any).school_name || "" });
    }
    setSubscriptions((subsRes.data as any) || []);
    setRecentProgress((progressRes.data as any) || []);
    setCertificates((certsRes.data as any) || []);

    // Build subject progress
    const progressData = progressRes.data || [];
    const lessonsData = lessonsRes.data || [];
    const subjectsData = subjectsRes.data || [];
    const gradeMap = Object.fromEntries((gradesRes.data || []).map((g: any) => [g.id, g.name]));
    const progressMap = new Map(progressData.map((p: any) => [p.lesson_id, p]));

    const spResult: SubjectProgress[] = subjectsData
      .map((sub: any) => {
        const subLessons = lessonsData.filter((l: any) => l.subject_id === sub.id);
        if (subLessons.length === 0) return null;
        const completedLessons = subLessons.filter((l: any) => progressMap.get(l.id)?.completed).length;
        const quizScores = subLessons.map((l: any) => progressMap.get(l.id)?.quiz_score).filter((s: any) => s != null) as number[];
        const avgScore = quizScores.length > 0 ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length) : 0;
        return { subjectId: sub.id, subjectName: sub.name, gradeName: gradeMap[sub.grade_id] || "", totalLessons: subLessons.length, completedLessons, quizScores, avgScore, completionPercent: Math.round((completedLessons / subLessons.length) * 100) };
      })
      .filter(Boolean)
      .filter((s: any) => s.completedLessons > 0 || s.quizScores.length > 0) as SubjectProgress[];
    spResult.sort((a, b) => b.completionPercent - a.completionPercent);
    setSubjectProgress(spResult);
    setLoading(false);
  };

  /* ─── Handlers ─── */
  const saveProfile = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ full_name: editForm.full_name || null, phone: editForm.phone || null, grade_id: editForm.grade_id || null, governorate: editForm.governorate || null, school_name: editForm.school_name || null }).eq("user_id", user.id);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    setProfile((p) => p ? { ...p, full_name: editForm.full_name, phone: editForm.phone, grade_id: editForm.grade_id, governorate: editForm.governorate, school_name: editForm.school_name } : p);
    setEditing(false);
    await refreshProfile();
    toast({ title: "تم تحديث الملف الشخصي" });
  };

  const changePassword = async () => {
    if (!passwordForm.newPass || passwordForm.newPass.length < 6) { toast({ title: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" }); return; }
    if (passwordForm.newPass !== passwordForm.confirm) { toast({ title: "كلمتا المرور غير متطابقتين", variant: "destructive" }); return; }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: passwordForm.newPass });
    setSavingPassword(false);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    toast({ title: "تم تغيير كلمة المرور بنجاح" });
    setChangingPassword(false);
    setPasswordForm({ newPass: "", confirm: "" });
  };

  const copyReferralCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      toast({ title: "تم نسخ رمز الإحالة" });
    }
  };

  const shareReferral = () => {
    if (profile?.referral_code && navigator.share) {
      navigator.share({ title: "انضم لمنصة تنوير التعليمية", text: `سجّل في منصة تنوير باستخدام رمز الإحالة: ${profile.referral_code} واحصل على خصم!`, url: window.location.origin + "/auth" }).catch(() => {});
    } else copyReferralCode();
  };

  const downloadCertificate = () => {
    if (!certRef.current) return;
    const el = certRef.current;
    const pw = window.open("", "_blank");
    if (pw) {
      pw.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/><title>شهادة إتمام</title><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Cairo',sans-serif}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>${el.outerHTML}</body><script>setTimeout(()=>{window.print();window.close()},500)<\/script></html>`);
      pw.document.close();
    }
  };

  /* ─── Computed ─── */
  const completedCount = recentProgress.filter((p) => p.completed).length;
  const allScores = recentProgress.filter((p) => p.quiz_score != null).map((p) => p.quiz_score!);
  const avgScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
  const activeSub = subscriptions.find((s) => s.status === "active");
  const totalSubjectLessons = subjectProgress.reduce((s, sub) => s + sub.totalLessons, 0);
  const totalSubjectCompleted = subjectProgress.reduce((s, sub) => s + sub.completedLessons, 0);
  const overallPercent = totalSubjectLessons > 0 ? Math.round((totalSubjectCompleted / totalSubjectLessons) * 100) : 0;

  const scoreColor = (score: number) => score >= 80 ? "text-green-600 dark:text-green-400" : score >= 50 ? "text-accent" : "text-destructive";

  const statusLabels: Record<string, { label: string; className: string }> = {
    active: { label: "فعّال", className: "bg-green-500/10 text-green-600 dark:text-green-400" },
    pending: { label: "قيد الانتظار", className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
    expired: { label: "منتهي", className: "bg-destructive/10 text-destructive" },
  };

  const tabs: { id: TabId; label: string; icon: typeof User }[] = [
    { id: "overview", label: "نظرة عامة", icon: Activity },
    { id: "progress", label: "التقدم", icon: TrendingUp },
    { id: "certificates", label: `الشهادات${certificates.length ? ` (${certificates.length})` : ""}`, icon: GraduationCap },
    { id: "settings", label: "الإعدادات", icon: User },
  ];

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead title="الملف الشخصي" description="عرض وتعديل ملفك الشخصي وتتبع تقدمك الدراسي في منصة تنوير التعليمية." noIndex />
      <Navbar />
      <div className="container mx-auto max-w-4xl px-4 py-6 md:py-10 space-y-6">

        {/* ─── Hero Header ─── */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="absolute inset-0 bg-hero-gradient opacity-[0.06]" />
          <div className="relative p-6 md:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-18 w-18 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/5" style={{ width: 72, height: 72 }}>
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-card-foreground md:text-2xl">
                    {profile?.full_name || "طالب"}
                  </h1>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  {profile?.grade_id && (
                    <p className="mt-1 text-xs font-medium text-primary">
                      {grades.find((g) => g.id === profile.grade_id)?.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Quick stats */}
              <div className="flex gap-3">
                <div className="rounded-xl bg-primary/5 px-4 py-2.5 text-center">
                  <p className="text-lg font-bold text-primary">{completedCount}</p>
                  <p className="text-[10px] text-muted-foreground">درس مكتمل</p>
                </div>
                <div className="rounded-xl bg-accent/5 px-4 py-2.5 text-center">
                  <p className="text-lg font-bold text-accent">{certificates.length}</p>
                  <p className="text-[10px] text-muted-foreground">شهادة</p>
                </div>
                <div className="rounded-xl bg-green-500/5 px-4 py-2.5 text-center">
                  <p className={`text-lg font-bold ${avgScore > 0 ? scoreColor(avgScore) : "text-muted-foreground"}`}>
                    {avgScore > 0 ? `${avgScore}%` : "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">معدل</p>
                </div>
              </div>
            </div>

            {/* Subscription banner */}
            {activeSub ? (
              <div className="mt-5 flex items-center gap-2 rounded-xl bg-green-500/5 border border-green-500/15 px-4 py-2.5 text-sm">
                <Zap className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                <span className="text-green-700 dark:text-green-400 font-medium">اشتراك فعّال</span>
                {activeSub.expires_at && (
                  <span className="text-green-600/70 dark:text-green-400/70 text-xs mr-auto">
                    حتى {new Date(activeSub.expires_at).toLocaleDateString("ar-YE")}
                  </span>
                )}
              </div>
            ) : (
              <div className="mt-5 flex items-center justify-between rounded-xl bg-accent/5 border border-accent/15 px-4 py-2.5">
                <span className="text-sm text-muted-foreground">لم تشترك بعد</span>
                <Button variant="hero" size="sm" onClick={() => navigate("/subscribe")} className="text-xs">اشترك الآن</Button>
              </div>
            )}
          </div>
        </div>

        {/* ─── Tab Navigation ─── */}
        <div className="flex gap-1.5 rounded-xl border border-border bg-card p-1.5 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-hero-gradient text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ─── Tab Content ─── */}
        <div className="animate-fade-in-up">
          {/* ═══ OVERVIEW ═══ */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Progress ring + stats */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-6 shadow-card text-center">
                  <div className="relative mx-auto mb-3" style={{ width: 120, height: 120 }}>
                    <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                      <circle cx="60" cy="60" r="52" fill="none" strokeWidth="10" className="stroke-muted" />
                      <circle
                        cx="60" cy="60" r="52" fill="none" strokeWidth="10"
                        className="stroke-primary"
                        strokeLinecap="round"
                        strokeDasharray={`${overallPercent * 3.267} ${326.7 - overallPercent * 3.267}`}
                        style={{ transition: "stroke-dasharray 0.8s ease" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-card-foreground">{overallPercent}%</span>
                      <span className="text-[10px] text-muted-foreground">إكمال كلي</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{totalSubjectCompleted} / {totalSubjectLessons} درس مكتمل</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: BookOpen, label: "دروس مكتملة", value: completedCount, color: "text-primary" },
                    { icon: Trophy, label: "شهادات", value: certificates.length, color: "text-accent" },
                    { icon: Target, label: "معدل الاختبارات", value: avgScore > 0 ? `${avgScore}%` : "—", color: avgScore > 0 ? scoreColor(avgScore) : "text-muted-foreground" },
                    { icon: CreditCard, label: "الاشتراك", value: activeSub ? "فعّال" : "—", color: activeSub ? "text-green-600 dark:text-green-400" : "text-muted-foreground" },
                  ].map((s, i) => (
                    <div key={i} className="rounded-xl border border-border bg-card p-4 text-center shadow-card">
                      <s.icon className={`mx-auto mb-1.5 h-5 w-5 ${s.color}`} />
                      <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Referral card */}
              {profile?.referral_code && (
                <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="flex items-center gap-2 font-bold text-card-foreground">
                      <Users className="h-5 w-5 text-primary" /> دعوة الأصدقاء
                    </h3>
                    {referralStats && referralStats.total > 0 && (
                      <span className="text-xs text-muted-foreground">{referralStats.completed} إحالة ناجحة</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">شارك رمزك واحصلا معاً على خصم 10%!</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-lg border border-border bg-muted/50 px-4 py-2.5 text-center font-mono text-base font-bold tracking-widest text-foreground" dir="ltr">
                      {profile.referral_code}
                    </div>
                    <Button variant="outline" size="icon" onClick={copyReferralCode} className="shrink-0">
                      {copiedCode ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="icon" onClick={shareReferral} className="shrink-0">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Recent activity */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <h3 className="mb-4 flex items-center gap-2 font-bold text-card-foreground">
                  <Activity className="h-5 w-5 text-primary" /> آخر النشاطات
                </h3>
                {recentProgress.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">لم تبدأ أي درس بعد</p>
                ) : (
                  <div className="space-y-2">
                    {recentProgress.slice(0, 8).map((p) => (
                      <div key={p.lesson_id} className="flex items-center justify-between rounded-xl border border-border p-3 transition-colors hover:bg-muted/30">
                        <div className="flex items-center gap-3 min-w-0">
                          {p.completed ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                          ) : (
                            <Clock className="h-4 w-4 shrink-0 text-yellow-500" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-card-foreground truncate">{(p as any).lessons?.title || "درس"}</p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {(p as any).lessons?.subjects?.grades?.name} — {(p as any).lessons?.subjects?.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {p.quiz_score != null && (
                            <span className={`text-xs font-bold ${scoreColor(p.quiz_score)}`}>{p.quiz_score}%</span>
                          )}
                          {p.completed_at && (
                            <span className="text-[10px] text-muted-foreground hidden sm:block">
                              {new Date(p.completed_at).toLocaleDateString("ar-YE")}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ PROGRESS ═══ */}
          {activeTab === "progress" && (
            <div className="space-y-6">
              {/* Overall summary */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-border bg-card p-4 text-center shadow-card">
                  <Target className="mx-auto mb-1.5 h-5 w-5 text-primary" />
                  <p className="text-xl font-bold text-card-foreground">{overallPercent}%</p>
                  <p className="text-[10px] text-muted-foreground">نسبة الإكمال</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center shadow-card">
                  <BookOpen className="mx-auto mb-1.5 h-5 w-5 text-primary" />
                  <p className="text-xl font-bold text-card-foreground">{totalSubjectCompleted}</p>
                  <p className="text-[10px] text-muted-foreground">درس مكتمل</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center shadow-card">
                  <Award className="mx-auto mb-1.5 h-5 w-5 text-accent" />
                  <p className={`text-xl font-bold ${avgScore > 0 ? scoreColor(avgScore) : "text-muted-foreground"}`}>
                    {avgScore > 0 ? `${avgScore}%` : "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">معدل الدرجات</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center shadow-card">
                  <TrendingUp className="mx-auto mb-1.5 h-5 w-5 text-green-600 dark:text-green-400" />
                  <p className="text-xl font-bold text-card-foreground">{subjectProgress.length}</p>
                  <p className="text-[10px] text-muted-foreground">مادة نشطة</p>
                </div>
              </div>

              {/* Per-subject */}
              {subjectProgress.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
                  <TrendingUp className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-muted-foreground">لم تبدأ أي مادة بعد. ابدأ التعلم الآن!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {subjectProgress.map((sub) => (
                    <div key={sub.subjectId} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                            <BookOpen className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-card-foreground truncate">{sub.subjectName}</p>
                            <p className="text-xs text-muted-foreground">{sub.gradeName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {sub.avgScore > 0 && (
                            <div className="text-left">
                              <p className={`text-sm font-bold ${scoreColor(sub.avgScore)}`}>{sub.avgScore}%</p>
                              <p className="text-[10px] text-muted-foreground">معدل</p>
                            </div>
                          )}
                          {sub.completionPercent === 100 && (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{sub.completedLessons}/{sub.totalLessons} درس</span>
                          <span className="font-medium text-card-foreground">{sub.completionPercent}%</span>
                        </div>
                        <Progress value={sub.completionPercent} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ CERTIFICATES ═══ */}
          {activeTab === "certificates" && (
            <div>
              {certificates.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
                  <GraduationCap className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
                  <h3 className="mb-1 text-lg font-bold text-card-foreground">لا توجد شهادات بعد</h3>
                  <p className="text-sm text-muted-foreground">أكمل جميع دروس أي مادة للحصول على شهادة إتمام!</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {certificates.map((cert) => (
                    <div
                      key={cert.id}
                      onClick={() => setSelectedCert(cert)}
                      className="group cursor-pointer rounded-2xl border border-accent/20 bg-gradient-to-br from-card to-accent/5 p-6 transition-all hover:shadow-card-hover hover:border-accent/40 hover:-translate-y-0.5"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/15 transition-colors group-hover:bg-accent/25">
                          <Award className="h-7 w-7 text-accent" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-card-foreground truncate">{(cert as any).subjects?.name || "مادة"}</p>
                          <p className="text-xs text-muted-foreground">{(cert as any).subjects?.grades?.name}</p>
                          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(cert.issued_at).toLocaleDateString("ar-YE")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Certificate Dialog */}
              <Dialog open={!!selectedCert} onOpenChange={() => setSelectedCert(null)}>
                <DialogContent className="max-w-2xl p-0 overflow-hidden">
                  <DialogHeader className="p-4 pb-0">
                    <DialogTitle className="text-right">شهادة إتمام</DialogTitle>
                  </DialogHeader>
                  {selectedCert && (
                    <div className="p-4 space-y-4">
                      <div
                        ref={certRef}
                        className="relative mx-auto aspect-[1.414] w-full max-w-lg rounded-2xl border-4 border-accent/30 bg-gradient-to-br from-card via-background to-accent/5 p-6 sm:p-10 text-center"
                        style={{ fontFamily: "'Cairo', sans-serif" }}
                      >
                        <div className="absolute top-3 right-3 h-8 w-8 border-t-4 border-r-4 border-accent/40 rounded-tr-xl" />
                        <div className="absolute top-3 left-3 h-8 w-8 border-t-4 border-l-4 border-accent/40 rounded-tl-xl" />
                        <div className="absolute bottom-3 right-3 h-8 w-8 border-b-4 border-r-4 border-accent/40 rounded-br-xl" />
                        <div className="absolute bottom-3 left-3 h-8 w-8 border-b-4 border-l-4 border-accent/40 rounded-bl-xl" />
                        <div className="flex flex-col items-center justify-center h-full gap-3 sm:gap-4">
                          <Award className="h-12 w-12 sm:h-16 sm:w-16 text-accent" />
                          <h3 className="text-base sm:text-xl font-bold text-accent">شهادة إتمام</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">تشهد منصة تنوير التعليمية بأن</p>
                          <p className="text-lg sm:text-2xl font-extrabold text-card-foreground border-b-2 border-accent/30 pb-1 px-4">{profile?.full_name || "طالب"}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">قد أتمّ بنجاح جميع دروس مادة</p>
                          <p className="text-base sm:text-xl font-bold text-primary">{(selectedCert as any).subjects?.name}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">{(selectedCert as any).subjects?.grades?.name}</p>
                          <div className="mt-2 sm:mt-4 text-[10px] sm:text-xs text-muted-foreground">
                            <p>تاريخ الإصدار: {new Date(selectedCert.issued_at).toLocaleDateString("ar-YE")}</p>
                            <p className="mt-1 font-medium text-accent">منصة تنوير التعليمية</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <Button variant="hero" size="sm" className="gap-2" onClick={downloadCertificate}>
                          <Download className="h-4 w-4" /> طباعة الشهادة
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* ═══ SETTINGS ═══ */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              {/* Profile info */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="flex items-center gap-2 font-bold text-card-foreground">
                    <User className="h-5 w-5 text-primary" /> المعلومات الشخصية
                  </h3>
                  {!editing ? (
                    <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="gap-1.5">
                      <Pencil className="h-3.5 w-3.5" /> تعديل
                    </Button>
                  ) : (
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X className="h-4 w-4" /></Button>
                      <Button size="sm" onClick={saveProfile} className="gap-1.5"><Save className="h-3.5 w-3.5" /> حفظ</Button>
                    </div>
                  )}
                </div>
                {editing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-card-foreground">الاسم الكامل</label>
                      <Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} placeholder="أدخل اسمك" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-card-foreground">رقم الهاتف</label>
                      <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="رقم الهاتف" dir="ltr" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-card-foreground">الصف الدراسي</label>
                      <select value={editForm.grade_id} onChange={(e) => setEditForm({ ...editForm, grade_id: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value="">اختر الصف</option>
                        {grades.filter((g) => g.category === "إعدادي").length > 0 && (
                          <optgroup label="المرحلة الإعدادية">
                            {grades.filter((g) => g.category === "إعدادي").map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                          </optgroup>
                        )}
                        {grades.filter((g) => g.category === "ثانوي").length > 0 && (
                          <optgroup label="المرحلة الثانوية">
                            {grades.filter((g) => g.category === "ثانوي").map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                          </optgroup>
                        )}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[
                      { label: "الاسم", value: profile?.full_name || "—" },
                      { label: "البريد الإلكتروني", value: user?.email || "—" },
                      { label: "الهاتف", value: profile?.phone || "—" },
                      { label: "الصف", value: grades.find((g) => g.id === profile?.grade_id)?.name || "—" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                        <span className="text-sm font-medium text-card-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Password */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <h3 className="mb-4 flex items-center gap-2 font-bold text-card-foreground">
                  <Lock className="h-5 w-5 text-primary" /> كلمة المرور
                </h3>
                {changingPassword ? (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium">كلمة المرور الجديدة</label>
                      <Input type="password" value={passwordForm.newPass} onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })} placeholder="6 أحرف على الأقل" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">تأكيد كلمة المرور</label>
                      <Input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="hero" size="sm" onClick={changePassword} disabled={savingPassword}>{savingPassword ? "جاري الحفظ..." : "حفظ"}</Button>
                      <Button variant="outline" size="sm" onClick={() => { setChangingPassword(false); setPasswordForm({ newPass: "", confirm: "" }); }}>إلغاء</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setChangingPassword(true)} className="gap-2">
                    <Lock className="h-4 w-4" /> تغيير كلمة المرور
                  </Button>
                )}
              </div>

              {/* Subscriptions */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <h3 className="mb-4 flex items-center gap-2 font-bold text-card-foreground">
                  <CreditCard className="h-5 w-5 text-primary" /> الاشتراكات
                </h3>
                {subscriptions.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground mb-3">لا توجد اشتراكات بعد</p>
                    <Button variant="hero" size="sm" onClick={() => navigate("/subscribe")}>اشترك الآن</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {subscriptions.map((sub) => {
                      const s = statusLabels[sub.status] || { label: sub.status, className: "bg-muted text-muted-foreground" };
                      return (
                        <div key={sub.id} className="flex items-center justify-between rounded-xl border border-border p-4">
                          <div>
                            <p className="font-medium text-card-foreground">{(sub as any).grades?.name || "عام"}</p>
                            {sub.expires_at && <p className="text-xs text-muted-foreground">ينتهي: {new Date(sub.expires_at).toLocaleDateString("ar-YE")}</p>}
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${s.className}`}>{s.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ProfilePage;
