import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BookOpen, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import SEOHead from "@/components/SEOHead";

const AuthPage = () => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate("/grades");
  }, [user, navigate]);

  const handleEmailAuth = async () => {
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({ title: "تم إنشاء الحساب", description: "تحقق من بريدك الإلكتروني لتأكيد الحساب" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/grades");
      }
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleEmailAuth();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SEOHead
        title={mode === "login" ? "تسجيل الدخول" : "إنشاء حساب"}
        description="سجل دخولك أو أنشئ حساباً جديداً في منصة مَسار التعليمية للوصول إلى الدروس والاختبارات."
        canonical="/auth"
        noIndex
      />
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-hero-gradient">
            <BookOpen className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">مَسار</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" ? "سجّل دخولك للمتابعة" : "أنشئ حسابك الجديد"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
          {mode === "signup" && (
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
          )}

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

          <Button type="submit" variant="hero" className="w-full gap-2 py-5" disabled={loading}>
            {loading ? "جاري المعالجة..." : mode === "login" ? "تسجيل الدخول" : "إنشاء الحساب"}
            <ArrowRight className="h-4 w-4" />
          </Button>

          {mode === "login" && (
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
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
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
