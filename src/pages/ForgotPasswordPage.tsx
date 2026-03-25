import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SEOHead from "@/components/SEOHead";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-hero-gradient">
            <BookOpen className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">استعادة كلمة المرور</h1>
          <p className="mt-1 text-sm text-muted-foreground">أدخل بريدك الإلكتروني لإرسال رابط إعادة التعيين</p>
        </div>

        {sent ? (
          <div className="rounded-2xl border border-success/30 bg-card p-6 text-center shadow-card">
            <Mail className="mx-auto mb-3 h-12 w-12 text-success" />
            <h2 className="mb-2 text-lg font-bold text-card-foreground">تم إرسال الرابط</h2>
            <p className="text-sm text-muted-foreground mb-4">
              تحقق من بريدك الإلكتروني <strong className="text-foreground">{email}</strong> واتبع الرابط لإعادة تعيين كلمة المرور
            </p>
            <Link to="/auth">
              <Button variant="outline" className="gap-2">
                <ArrowRight className="h-4 w-4" />
                العودة لتسجيل الدخول
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
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
            <Button type="submit" variant="hero" className="w-full gap-2 py-5" disabled={loading}>
              {loading ? "جاري الإرسال..." : "إرسال رابط الاستعادة"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/auth" className="font-semibold text-primary hover:underline">
            العودة لتسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
