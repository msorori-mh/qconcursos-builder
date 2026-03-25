import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BookOpen, Mail, Phone, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import SEOHead from "@/components/SEOHead";

const AuthPage = () => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, refreshProfile } = useAuth();

  const { data: grades = [] } = useQuery({
    queryKey: ["grades-auth"],
    queryFn: async () => {
      const { data } = await supabase.from("grades").select("id, name, category, sort_order").order("sort_order");
      return data || [];
    },
  });

  useEffect(() => {
    if (user && profile) {
      if (profile.grade_id) {
        navigate(`/grades/${profile.grade_id}/subjects`);
      } else {
        navigate("/grades");
      }
    }
  }, [user, profile, navigate]);

  // Set default grade when grades load
  useEffect(() => {
    if (grades.length > 0 && !gradeId) {
      setGradeId(grades[0].id);
    }
  }, [grades, gradeId]);

  const saveGradeToProfile = async (userId: string) => {
    const updates: any = {};
    if (gradeId) updates.grade_id = gradeId;
    if (referralCode.trim()) updates.referred_by = referralCode.trim().toUpperCase();
    if (Object.keys(updates).length > 0) {
      await supabase.from("profiles").update(updates).eq("user_id", userId);
    }
    // Create referral record if code is valid
    if (referralCode.trim()) {
      const code = referralCode.trim().toUpperCase();
      const { data: referrer } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("referral_code", code)
        .maybeSingle();
      if (referrer && referrer.user_id !== userId) {
        await supabase.from("referrals").insert({
          referrer_id: referrer.user_id,
          referred_id: userId,
          status: "pending",
        });
      }
    }
  };

  const handleEmailAuth = async () => {
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!gradeId) {
          toast({ title: "يرجى اختيار الصف الدراسي", variant: "destructive" });
          setLoading(false);
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (data.user) {
          await saveGradeToProfile(data.user.id);
          await refreshProfile();
        }
        toast({ title: "تم إنشاء الحساب", description: "تحقق من بريدك الإلكتروني لتأكيد الحساب" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneAuth = async () => {
    if (phone.length !== 9) {
      toast({ title: "يرجى إدخال رقم هاتف مكون من 9 أرقام", variant: "destructive" });
      return;
    }
    const fullPhone = `+967${phone}`;
    setLoading(true);
    try {
      if (!otpSent) {
        if (mode === "signup") {
          if (!gradeId) {
            toast({ title: "يرجى اختيار الصف الدراسي", variant: "destructive" });
            setLoading(false);
            return;
          }
          const { error } = await supabase.auth.signUp({ phone: fullPhone, password, options: { data: { full_name: fullName } } });
          if (error) throw error;
        } else {
          const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
          if (error) throw error;
        }
        setOtpSent(true);
        toast({ title: "تم إرسال رمز التحقق", description: "أدخل الرمز المرسل إلى هاتفك" });
      } else {
        const { data, error } = await supabase.auth.verifyOtp({ phone: fullPhone, token: otp, type: "sms" });
        if (error) throw error;
        if (mode === "signup" && data.user) {
          await saveGradeToProfile(data.user.id);
          await refreshProfile();
        }
      }
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (method === "email") handleEmailAuth();
    else handlePhoneAuth();
  };

  const prepGrades = grades.filter((g) => g.category === "إعدادي");
  const secGrades = grades.filter((g) => g.category === "ثانوي");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SEOHead
        title={mode === "login" ? "تسجيل الدخول" : "إنشاء حساب"}
        description="سجل دخولك أو أنشئ حساباً جديداً في منصة تنوير التعليمية للوصول إلى الدروس والاختبارات."
        canonical="/auth"
        noIndex
      />
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-hero-gradient">
            <BookOpen className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">تنوير</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" ? "سجّل دخولك للمتابعة" : "أنشئ حسابك الجديد"}
          </p>
        </div>

        {/* Method Toggle */}
        <div className="mb-6 flex gap-2 rounded-xl border border-border bg-card p-1.5">
          <button
            onClick={() => { setMethod("email"); setOtpSent(false); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              method === "email" ? "bg-hero-gradient text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Mail className="h-4 w-4" />
            البريد الإلكتروني
          </button>
          <button
            onClick={() => { setMethod("phone"); setOtpSent(false); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              method === "phone" ? "bg-hero-gradient text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Phone className="h-4 w-4" />
            رقم الهاتف
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
          {mode === "signup" && (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-card-foreground">الاسم الكامل</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="أدخل اسمك"
                  required
                  className="text-right"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-card-foreground">الصف الدراسي</label>
                <select
                  value={gradeId}
                  onChange={(e) => setGradeId(e.target.value)}
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="" disabled>اختر صفك الدراسي</option>
                  {prepGrades.length > 0 && (
                    <optgroup label="المرحلة الإعدادية">
                      {prepGrades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </optgroup>
                  )}
                  {secGrades.length > 0 && (
                    <optgroup label="المرحلة الثانوية">
                      {secGrades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </optgroup>
                  )}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-card-foreground">رمز الإحالة <span className="text-muted-foreground font-normal">(اختياري)</span></label>
                <Input
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="أدخل رمز الإحالة إن وُجد"
                  dir="ltr"
                  maxLength={8}
                  className="font-mono tracking-wider"
                />
              </div>
            </>
          )}

          {method === "email" ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-card-foreground">البريد الإلكتروني</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
                dir="ltr"
              />
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-card-foreground">رقم الهاتف</label>
              <div className="flex gap-2" dir="ltr">
                <div className="flex items-center rounded-md border border-input bg-muted px-3 text-sm font-medium text-muted-foreground select-none shrink-0">
                  +967
                </div>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 9);
                    setPhone(val);
                  }}
                  placeholder="7XXXXXXXX"
                  required
                  dir="ltr"
                  maxLength={9}
                  inputMode="numeric"
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground text-right">أدخل 9 أرقام بدون كود الدولة</p>
            </div>
          )}

          {(method === "email" || (method === "phone" && mode === "signup" && !otpSent)) && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-card-foreground">كلمة المرور</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {otpSent && method === "phone" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-card-foreground">رمز التحقق</label>
              <Input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="أدخل رمز التحقق"
                required
                dir="ltr"
                maxLength={6}
              />
            </div>
          )}

          <Button type="submit" variant="hero" className="w-full gap-2 py-5" disabled={loading}>
            {loading ? "جاري المعالجة..." : mode === "login" ? "تسجيل الدخول" : "إنشاء الحساب"}
            <ArrowRight className="h-4 w-4" />
          </Button>

          {mode === "login" && method === "email" && (
            <div className="text-center">
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                نسيت كلمة المرور؟
              </Link>
            </div>
          )}
        </form>

        {/* Toggle mode */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "login" ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"}{" "}
          <button
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setOtpSent(false); }}
            className="font-semibold text-primary hover:underline"
          >
            {mode === "login" ? "سجّل الآن" : "سجّل دخولك"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
