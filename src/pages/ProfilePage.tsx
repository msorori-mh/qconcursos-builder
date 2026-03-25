import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  User, BookOpen, Award, Clock, CheckCircle2, CreditCard, Pencil, Save, X, Lock,
} from "lucide-react";
import StudentProgressDashboard from "@/components/StudentProgressDashboard";
import CertificatesList from "@/components/CertificatesList";

interface Profile {
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  grade_id: string | null;
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

const ProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: "", phone: "" });
  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const [profileRes, subsRes, progressRes] = await Promise.all([
      supabase.from("profiles").select("full_name, phone, avatar_url, grade_id").eq("user_id", user.id).maybeSingle(),
      supabase.from("subscriptions").select("id, status, starts_at, expires_at, grades(name)").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("user_progress").select("lesson_id, completed, quiz_score, completed_at, lessons(title, subjects(name, grades(name)))").eq("user_id", user.id).order("completed_at", { ascending: false }).limit(50),
    ]);
    if (profileRes.data) {
      setProfile(profileRes.data as Profile);
      setEditForm({ full_name: profileRes.data.full_name || "", phone: profileRes.data.phone || "" });
    }
    if (subsRes.data) setSubscriptions(subsRes.data as any);
    if (progressRes.data) setProgress(progressRes.data as any);
    setLoading(false);
  };

  const saveProfile = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({
      full_name: editForm.full_name || null,
      phone: editForm.phone || null,
    }).eq("user_id", user.id);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    setProfile((p) => p ? { ...p, ...editForm } : p);
    setEditing(false);
    toast({ title: "تم تحديث الملف الشخصي" });
  };

  const changePassword = async () => {
    if (!passwordForm.newPass || passwordForm.newPass.length < 6) {
      toast({ title: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    if (passwordForm.newPass !== passwordForm.confirm) {
      toast({ title: "كلمتا المرور غير متطابقتين", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: passwordForm.newPass });
    setSavingPassword(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "تم تغيير كلمة المرور بنجاح" });
    setChangingPassword(false);
    setPasswordForm({ current: "", newPass: "", confirm: "" });
  };
  const completedCount = progress.filter((p) => p.completed).length;
  const avgScore = progress.filter((p) => p.quiz_score != null).reduce((acc, p, _, arr) => acc + (p.quiz_score || 0) / arr.length, 0);
  const activeSub = subscriptions.find((s) => s.status === "active");

  const statusLabels: Record<string, { label: string; className: string }> = {
    active: { label: "فعّال", className: "bg-green-500/10 text-green-600" },
    pending: { label: "قيد الانتظار", className: "bg-yellow-500/10 text-yellow-600" },
    expired: { label: "منتهي", className: "bg-red-500/10 text-red-600" },
  };

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
      <Navbar />
      <div className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Header card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                {editing ? (
                  <div className="space-y-2">
                    <Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} placeholder="الاسم الكامل" className="h-8" />
                    <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="رقم الهاتف" dir="ltr" className="h-8" />
                  </div>
                ) : (
                  <>
                    <h1 className="text-xl font-bold text-card-foreground">{profile?.full_name || "طالب"}</h1>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    {profile?.phone && <p className="text-sm text-muted-foreground" dir="ltr">{profile.phone}</p>}
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {editing ? (
                <>
                  <Button size="icon" variant="ghost" onClick={() => setEditing(false)}><X className="h-4 w-4" /></Button>
                  <Button size="icon" onClick={saveProfile}><Save className="h-4 w-4" /></Button>
                </>
              ) : (
                <Button size="icon" variant="ghost" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /></Button>
              )}
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-card-foreground">
            <Lock className="h-5 w-5 text-primary" /> كلمة المرور
          </h2>
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
                <Button variant="hero" size="sm" onClick={changePassword} disabled={savingPassword}>
                  {savingPassword ? "جاري الحفظ..." : "حفظ"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setChangingPassword(false); setPasswordForm({ current: "", newPass: "", confirm: "" }); }}>إلغاء</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setChangingPassword(true)} className="gap-2">
              <Lock className="h-4 w-4" /> تغيير كلمة المرور
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { icon: CheckCircle2, label: "دروس مكتملة", value: completedCount },
            { icon: Award, label: "معدل الاختبارات", value: avgScore > 0 ? `${Math.round(avgScore)}%` : "—" },
            { icon: CreditCard, label: "الاشتراك", value: activeSub ? "فعّال" : "غير مشترك" },
          ].map((stat, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-3 sm:p-4 text-center shadow-card">
              <stat.icon className="mx-auto mb-1.5 sm:mb-2 h-5 w-5 text-primary" />
              <p className="text-base sm:text-lg font-bold text-card-foreground">{stat.value}</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Subscriptions */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-card-foreground">
            <CreditCard className="h-5 w-5 text-primary" /> الاشتراكات
          </h2>
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
                  <div key={sub.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                    <div>
                      <p className="font-medium text-card-foreground">{(sub as any).grades?.name || "عام"}</p>
                      {sub.expires_at && (
                        <p className="text-xs text-muted-foreground">
                          ينتهي: {new Date(sub.expires_at).toLocaleDateString("ar-YE")}
                        </p>
                      )}
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${s.className}`}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Certificates */}
        <CertificatesList />

        {/* Student Progress Dashboard */}
        <StudentProgressDashboard />

        {/* Progress */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-card-foreground">
            <BookOpen className="h-5 w-5 text-primary" /> آخر النشاطات
          </h2>
          {progress.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">لم تبدأ أي درس بعد</p>
          ) : (
            <div className="space-y-2">
              {progress.slice(0, 10).map((p) => (
                <div key={p.lesson_id} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div className="flex items-center gap-3">
                    {p.completed ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                    ) : (
                      <Clock className="h-4 w-4 shrink-0 text-yellow-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{(p as any).lessons?.title || "درس"}</p>
                      <p className="text-xs text-muted-foreground">
                        {(p as any).lessons?.subjects?.grades?.name} — {(p as any).lessons?.subjects?.name}
                      </p>
                    </div>
                  </div>
                  {p.quiz_score != null && (
                    <span className="text-xs font-medium text-primary">{p.quiz_score}%</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ProfilePage;
