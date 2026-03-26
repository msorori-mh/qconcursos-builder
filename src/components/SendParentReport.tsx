import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Mail, MessageCircle, Send, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SubjectData {
  name: string;
  completionPercent: number;
  avgScore: number;
  completedLessons: number;
  totalLessons: number;
}

interface SendParentReportProps {
  studentName: string;
  overallPercent: number;
  avgScore: number;
  completedLessons: number;
  totalLessons: number;
  subjectsCount: number;
  certificatesCount: number;
  subjects: SubjectData[];
}

const SendParentReport = ({
  studentName,
  overallPercent,
  avgScore,
  completedLessons,
  totalLessons,
  subjectsCount,
  certificatesCount,
  subjects,
}: SendParentReportProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<"email" | "whatsapp" | null>(null);
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentName, setParentName] = useState("");
  const [sending, setSending] = useState(false);

  const buildWhatsAppMessage = () => {
    let msg = `📊 *تقرير تقدم ${studentName} الدراسي*\n\n`;
    msg += `✅ نسبة الإكمال: ${overallPercent}%\n`;
    msg += `📝 معدل الاختبارات: ${avgScore > 0 ? `${avgScore}%` : "—"}\n`;
    msg += `📚 الدروس: ${completedLessons}/${totalLessons}\n`;
    msg += `🏆 الشهادات: ${certificatesCount}\n`;

    if (subjects.length > 0) {
      msg += `\n📋 *تفاصيل المواد:*\n`;
      subjects.slice(0, 6).forEach((sub) => {
        msg += `• ${sub.name}: إكمال ${sub.completionPercent}%`;
        if (sub.avgScore > 0) msg += ` | معدل ${sub.avgScore}%`;
        msg += `\n`;
      });
    }

    msg += `\n_تم الإرسال من منصة طالب مكين_`;
    return encodeURIComponent(msg);
  };

  const sendViaEmail = async () => {
    if (!parentEmail || !user) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "parent-progress-report",
          recipientEmail: parentEmail,
          idempotencyKey: `parent-report-${user.id}-${new Date().toISOString().slice(0, 10)}`,
          templateData: {
            studentName,
            parentName: parentName || undefined,
            overallPercent,
            avgScore,
            completedLessons,
            totalLessons,
            subjectsCount,
            certificatesCount,
            subjects: subjects.slice(0, 8).map((s) => ({
              name: s.name,
              completionPercent: s.completionPercent,
              avgScore: s.avgScore,
              completedLessons: s.completedLessons,
              totalLessons: s.totalLessons,
            })),
          },
        },
      });

      if (error) throw error;

      // Save parent email to profile
      await supabase.from("profiles").update({ parent_email: parentEmail } as any).eq("user_id", user.id);

      toast({ title: "تم إرسال التقرير بنجاح ✉️", description: `تم الإرسال إلى ${parentEmail}` });
      setOpen(false);
    } catch (err: any) {
      toast({ title: "خطأ في الإرسال", description: err.message || "حدث خطأ", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const sendViaWhatsApp = () => {
    const phone = parentPhone.replace(/\s/g, "").replace(/^0/, "967");
    const numericPhone = phone.startsWith("+") ? phone.slice(1) : phone;
    const url = `https://wa.me/${numericPhone}?text=${buildWhatsAppMessage()}`;
    window.open(url, "_blank");

    // Save parent phone to profile
    if (user) {
      supabase.from("profiles").update({ parent_phone: parentPhone } as any).eq("user_id", user.id);
    }

    toast({ title: "تم فتح واتساب 💬", description: "أرسل الرسالة لولي الأمر" });
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Send className="h-4 w-4" />
        إرسال لولي الأمر
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">إرسال التقرير لولي الأمر</DialogTitle>
          </DialogHeader>

          {!method ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-right">
                اختر طريقة إرسال تقرير تقدمك الدراسي لولي أمرك:
              </p>
              <button
                onClick={() => setMethod("email")}
                className="w-full flex items-center gap-3 rounded-xl border border-border p-4 hover:bg-muted/50 transition-colors text-right"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">عبر البريد الإلكتروني</p>
                  <p className="text-xs text-muted-foreground">إرسال تقرير مفصل بتصميم احترافي</p>
                </div>
              </button>
              <button
                onClick={() => setMethod("whatsapp")}
                className="w-full flex items-center gap-3 rounded-xl border border-border p-4 hover:bg-muted/50 transition-colors text-right"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-foreground">عبر واتساب</p>
                  <p className="text-xs text-muted-foreground">فتح واتساب مع رسالة جاهزة للإرسال</p>
                </div>
              </button>
            </div>
          ) : method === "email" ? (
            <div className="space-y-4">
              <button onClick={() => setMethod(null)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <X className="h-3 w-3" /> رجوع
              </button>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5 text-right">اسم ولي الأمر (اختياري)</label>
                  <Input
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="مثال: محمد"
                    dir="rtl"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5 text-right">البريد الإلكتروني لولي الأمر</label>
                  <Input
                    type="email"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    placeholder="parent@example.com"
                    dir="ltr"
                  />
                </div>
              </div>
              <Button
                onClick={sendViaEmail}
                disabled={!parentEmail || sending}
                className="w-full gap-2"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {sending ? "جارِ الإرسال..." : "إرسال التقرير"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <button onClick={() => setMethod(null)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <X className="h-3 w-3" /> رجوع
              </button>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5 text-right">رقم واتساب ولي الأمر</label>
                <Input
                  type="tel"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="مثال: 777123456"
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">أدخل الرقم بدون مفتاح الدولة (سيتم إضافة 967 تلقائياً)</p>
              </div>
              <Button
                onClick={sendViaWhatsApp}
                disabled={!parentPhone}
                className="w-full gap-2 bg-green-600 hover:bg-green-700"
              >
                <MessageCircle className="h-4 w-4" />
                فتح واتساب
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SendParentReport;
