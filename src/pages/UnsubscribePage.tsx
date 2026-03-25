import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { MailX, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error";

const UnsubscribePage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(
        `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`,
        { headers: { apikey: anonKey } }
      );
      const data = await res.json();
      if (data.valid === false && data.reason === "already_unsubscribed") {
        setStatus("already");
      } else if (data.valid) {
        setStatus("valid");
      } else {
        setStatus("invalid");
      }
    } catch {
      setStatus("invalid");
    }
  };

  const handleUnsubscribe = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      if (data?.success) {
        setStatus("success");
      } else if (data?.reason === "already_unsubscribed") {
        setStatus("already");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
    setProcessing(false);
  };

  const content: Record<Status, { icon: React.ReactNode; title: string; desc: string }> = {
    loading: {
      icon: <Loader2 className="h-10 w-10 animate-spin text-primary" />,
      title: "جاري التحقق...",
      desc: "يرجى الانتظار بينما نتحقق من طلبك.",
    },
    valid: {
      icon: <MailX className="h-10 w-10 text-destructive" />,
      title: "إلغاء الاشتراك في الرسائل",
      desc: "هل أنت متأكد من إلغاء اشتراكك في رسائل البريد الإلكتروني؟",
    },
    already: {
      icon: <CheckCircle className="h-10 w-10 text-muted-foreground" />,
      title: "تم إلغاء الاشتراك مسبقاً",
      desc: "لقد قمت بإلغاء اشتراكك في الرسائل بالفعل.",
    },
    invalid: {
      icon: <AlertCircle className="h-10 w-10 text-destructive" />,
      title: "رابط غير صالح",
      desc: "هذا الرابط غير صالح أو منتهي الصلاحية.",
    },
    success: {
      icon: <CheckCircle className="h-10 w-10 text-green-600" />,
      title: "تم إلغاء الاشتراك",
      desc: "لن تتلقى رسائل بريد إلكتروني منا بعد الآن.",
    },
    error: {
      icon: <AlertCircle className="h-10 w-10 text-destructive" />,
      title: "حدث خطأ",
      desc: "لم نتمكن من معالجة طلبك. يرجى المحاولة لاحقاً.",
    },
  };

  const c = content[status];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-10 text-center shadow-card">
          <div className="mb-4 flex justify-center">{c.icon}</div>
          <h1 className="mb-2 text-xl font-bold text-card-foreground">{c.title}</h1>
          <p className="mb-6 text-muted-foreground">{c.desc}</p>
          {status === "valid" && (
            <Button
              variant="destructive"
              onClick={handleUnsubscribe}
              disabled={processing}
              className="w-full"
            >
              {processing ? "جاري المعالجة..." : "تأكيد إلغاء الاشتراك"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnsubscribePage;
