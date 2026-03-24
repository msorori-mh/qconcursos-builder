import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Wallet, Upload, CheckCircle, Clock, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";

interface PaymentMethod {
  id: string;
  type: string;
  name: string;
  account_name: string | null;
  account_number: string | null;
  details: string | null;
}

const SUBSCRIPTION_AMOUNT = 5000;

const SubscribePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<"method" | "details" | "upload" | "done">("method");
  const [methodType, setMethodType] = useState<"bank" | "exchange" | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [uploading, setUploading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [existingRequest, setExistingRequest] = useState<any>(null);

  useEffect(() => {
    if (user) {
      checkExistingRequest();
    }
  }, [user]);

  const checkExistingRequest = async () => {
    const { data } = await supabase
      .from("payment_requests")
      .select("*")
      .eq("user_id", user!.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      setExistingRequest(data[0]);
    }
  };

  const loadMethods = async (type: "bank" | "exchange") => {
    setMethodType(type);
    const { data } = await supabase
      .from("payment_methods")
      .select("*")
      .eq("type", type)
      .eq("is_active", true)
      .order("sort_order");
    if (data) setMethods(data);
    setStep("details");
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!receiptFile || !selectedMethod || !user) return;
    setUploading(true);

    try {
      const ext = receiptFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(fileName, receiptFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("receipts")
        .getPublicUrl(fileName);

      // Create subscription first
      const { data: sub, error: subError } = await supabase
        .from("subscriptions")
        .insert({ user_id: user.id, status: "pending" })
        .select()
        .single();

      if (subError) throw subError;

      // Create payment request
      const { error: payError } = await supabase
        .from("payment_requests")
        .insert({
          user_id: user.id,
          subscription_id: sub.id,
          payment_method_id: selectedMethod.id,
          amount: SUBSCRIPTION_AMOUNT,
          receipt_url: urlData.publicUrl,
          status: "pending",
        });

      if (payError) throw payError;

      setStep("done");
      toast({ title: "تم إرسال طلبك بنجاح", description: "سيتم مراجعة سند التحويل خلال 24 ساعة" });
    } catch (err: any) {
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (existingRequest && step !== "done") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto max-w-lg px-4 py-16 text-center">
          <div className="rounded-2xl border border-accent/30 bg-card p-8 shadow-card">
            <Clock className="mx-auto mb-4 h-16 w-16 text-accent" />
            <h2 className="mb-2 text-xl font-bold text-card-foreground">طلب دفع قيد المراجعة</h2>
            <p className="mb-4 text-muted-foreground">
              لديك طلب دفع مقدم بتاريخ{" "}
              {new Date(existingRequest.created_at).toLocaleDateString("ar-YE")}
              <br />
              سيتم مراجعته والرد عليك قريباً
            </p>
            <p className="text-sm text-muted-foreground">
              المبلغ: <span className="font-bold text-foreground">{existingRequest.amount} ر.ي</span>
            </p>
            <Link to="/grades">
              <Button variant="hero" className="mt-6">العودة للصفوف</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-lg px-4 py-10">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" />
          رجوع
        </button>

        <h1 className="mb-2 text-2xl font-bold text-foreground">الاشتراك في المنصة</h1>
        <p className="mb-8 text-muted-foreground">
          رسوم الاشتراك: <span className="font-bold text-primary">{SUBSCRIPTION_AMOUNT.toLocaleString("ar-YE")} ر.ي</span>
        </p>

        {/* Step indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {["طريقة الدفع", "تفاصيل الحساب", "رفع السند"].map((label, i) => {
            const steps = ["method", "details", "upload"];
            const currentIdx = steps.indexOf(step === "done" ? "upload" : step);
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  i <= currentIdx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {i + 1}
                </div>
                <span className={`text-xs ${i <= currentIdx ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
                {i < 2 && <div className={`h-px w-6 ${i < currentIdx ? "bg-primary" : "bg-border"}`} />}
              </div>
            );
          })}
        </div>

        {/* Step 1: Choose method type */}
        {step === "method" && (
          <div className="space-y-4">
            <button
              onClick={() => loadMethods("bank")}
              className="group w-full rounded-2xl border border-border bg-card p-6 text-right shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                  <Building2 className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-card-foreground">تحويل بنكي</h3>
                  <p className="text-sm text-muted-foreground">حوّل من حسابك البنكي مباشرة</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => loadMethods("exchange")}
              className="group w-full rounded-2xl border border-border bg-card p-6 text-right shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/15">
                  <Wallet className="h-7 w-7 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-card-foreground">شركة صرافة</h3>
                  <p className="text-sm text-muted-foreground">حواله داخلية عبر شركات الصرافة</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Step 2: Show account details */}
        {step === "details" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">
              {methodType === "bank" ? "اختر البنك وحوّل للحساب" : "اختر شركة الصرافة"}
            </h2>
            {methods.map((m) => (
              <button
                key={m.id}
                onClick={() => { setSelectedMethod(m); setStep("upload"); }}
                className={`w-full rounded-2xl border bg-card p-5 text-right shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 ${
                  selectedMethod?.id === m.id ? "border-primary" : "border-border"
                }`}
              >
                <h3 className="mb-2 font-bold text-card-foreground">{m.name}</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {m.account_name && (
                    <div className="flex items-center justify-between">
                      <span>اسم الحساب:</span>
                      <span className="font-medium text-foreground">{m.account_name}</span>
                    </div>
                  )}
                  {m.account_number && (
                    <div className="flex items-center justify-between">
                      <span>رقم الحساب:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{m.account_number}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); copyToClipboard(m.account_number!, m.id); }}
                          className="text-muted-foreground hover:text-primary"
                        >
                          {copiedId === m.id ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                  {m.details && <p className="mt-1 text-xs">{m.details}</p>}
                </div>
              </button>
            ))}
            <Button variant="outline" className="w-full" onClick={() => { setStep("method"); setMethodType(null); }}>
              رجوع
            </Button>
          </div>
        )}

        {/* Step 3: Upload receipt */}
        {step === "upload" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h3 className="mb-1 font-bold text-card-foreground">تحويل إلى: {selectedMethod?.name}</h3>
              <p className="text-sm text-muted-foreground">رقم الحساب: {selectedMethod?.account_number}</p>
              <p className="mt-2 text-sm font-bold text-primary">المبلغ: {SUBSCRIPTION_AMOUNT.toLocaleString("ar-YE")} ر.ي</p>
            </div>

            <div className="rounded-2xl border-2 border-dashed border-border bg-card p-8 text-center">
              <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="mb-3 font-semibold text-card-foreground">ارفع سند التحويل</p>
              <p className="mb-4 text-sm text-muted-foreground">صورة واضحة لإيصال التحويل (JPG, PNG, PDF)</p>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
                id="receipt-upload"
              />
              <label htmlFor="receipt-upload">
                <Button variant="outline" asChild className="cursor-pointer">
                  <span>اختر ملف</span>
                </Button>
              </label>
              {receiptFile && (
                <p className="mt-3 text-sm text-success font-medium">✓ {receiptFile.name}</p>
              )}
            </div>

            <Button
              variant="hero"
              className="w-full"
              disabled={!receiptFile || uploading}
              onClick={handleSubmit}
            >
              {uploading ? "جاري الإرسال..." : "إرسال طلب الاشتراك"}
            </Button>

            <Button variant="outline" className="w-full" onClick={() => setStep("details")}>
              رجوع
            </Button>
          </div>
        )}

        {/* Done */}
        {step === "done" && (
          <div className="rounded-2xl border border-success/30 bg-card p-8 text-center shadow-card">
            <CheckCircle className="mx-auto mb-4 h-16 w-16 text-success" />
            <h2 className="mb-2 text-xl font-bold text-card-foreground">تم إرسال طلبك بنجاح!</h2>
            <p className="mb-6 text-muted-foreground">
              سيتم مراجعة سند التحويل وتفعيل اشتراكك خلال 24 ساعة
            </p>
            <Link to="/grades">
              <Button variant="hero">العودة للصفوف</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscribePage;
