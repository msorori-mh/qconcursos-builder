import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Wallet, Upload, CheckCircle, Clock, Copy, Check, CalendarDays, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import SEOHead from "@/components/SEOHead";

interface PaymentMethod {
  id: string;
  type: string;
  name: string;
  account_name: string | null;
  account_number: string | null;
  details: string | null;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  duration_type: string;
  duration_months: number;
  price: number;
  currency: string;
}

const SubscribePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<"plan" | "semester" | "method" | "details" | "upload" | "done">("plan");
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  const [methodType, setMethodType] = useState<"bank" | "exchange" | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [uploading, setUploading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [referralDiscount, setReferralDiscount] = useState<number>(0);
  const [referralId, setReferralId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      checkExistingRequest();
      loadPlans();
      checkReferralDiscount();
    }
  }, [user]);

  const checkReferralDiscount = async () => {
    if (!user) return;
    // Check if this user was referred and hasn't used the discount yet
    const { data } = await supabase
      .from("referrals")
      .select("id, discount_percent, referred_reward_applied")
      .eq("referred_id", user.id)
      .eq("status", "pending")
      .eq("referred_reward_applied", false)
      .limit(1);
    if (data && data.length > 0) {
      setReferralDiscount(data[0].discount_percent);
      setReferralId(data[0].id);
    }
  };

  const checkExistingRequest = async () => {
    const { data } = await supabase
      .from("payment_requests")
      .select("*")
      .eq("user_id", user!.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1);
    if (data && data.length > 0) setExistingRequest(data[0]);
  };

  const loadPlans = async () => {
    const { data } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    if (data) setPlans(data as any);
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
    if (e.target.files?.[0]) setReceiptFile(e.target.files[0]);
  };

  const handleSubmit = async () => {
    if (!receiptFile || !selectedMethod || !selectedPlan || !user) return;
    setUploading(true);

    try {
      const ext = receiptFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("receipts").upload(fileName, receiptFile);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(fileName);

      // Calculate discounted amount
      const discountedAmount = referralDiscount > 0
        ? Math.round(selectedPlan.price * (1 - referralDiscount / 100))
        : selectedPlan.price;

      const { data: sub, error: subError } = await supabase
        .from("subscriptions")
        .insert({ user_id: user.id, status: "pending", plan_id: selectedPlan.id, semester: selectedSemester })
        .select()
        .single();
      if (subError) throw subError;

      const { error: payError } = await supabase
        .from("payment_requests")
        .insert({
          user_id: user.id,
          subscription_id: sub.id,
          payment_method_id: selectedMethod.id,
          plan_id: selectedPlan.id,
          amount: discountedAmount,
          currency: selectedPlan.currency,
          receipt_url: urlData.publicUrl,
          status: "pending",
          admin_notes: referralDiscount > 0 ? `خصم إحالة ${referralDiscount}% — المبلغ الأصلي: ${selectedPlan.price}` : null,
        });
      if (payError) throw payError;

      // Mark referral as completed if discount was applied
      if (referralId && referralDiscount > 0) {
        await supabase
          .from("referrals")
          .update({ status: "completed", referred_reward_applied: true, completed_at: new Date().toISOString() })
          .eq("id", referralId);
      }

      setStep("done");
      toast({ title: "تم إرسال طلبك بنجاح", description: "سيتم مراجعة سند التحويل خلال 24 ساعة" });
    } catch (err: any) {
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const discountedPrice = selectedPlan && referralDiscount > 0
    ? Math.round(selectedPlan.price * (1 - referralDiscount / 100))
    : null;

  const stepLabels = selectedPlan?.duration_type === "semester"
    ? ["اختيار الخطة", "اختيار الفصل", "طريقة الدفع", "تفاصيل الحساب", "رفع السند"]
    : ["اختيار الخطة", "طريقة الدفع", "تفاصيل الحساب", "رفع السند"];
  const stepKeys = selectedPlan?.duration_type === "semester"
    ? ["plan", "semester", "method", "details", "upload"]
    : ["plan", "method", "details", "upload"];
  const currentIdx = stepKeys.indexOf(step === "done" ? "upload" : step);

  if (existingRequest && step !== "done") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto max-w-lg px-4 py-16 text-center">
          <div className="rounded-2xl border border-accent/30 bg-card p-8 shadow-card">
            <Clock className="mx-auto mb-4 h-16 w-16 text-accent" />
            <h2 className="mb-2 text-xl font-bold text-card-foreground">طلب دفع قيد المراجعة</h2>
            <p className="mb-4 text-muted-foreground">
              لديك طلب دفع مقدم بتاريخ {new Date(existingRequest.created_at).toLocaleDateString("ar-YE")}
              <br />سيتم مراجعته والرد عليك قريباً
            </p>
            <p className="text-sm text-muted-foreground">
              المبلغ: <span className="font-bold text-foreground">{existingRequest.amount} {existingRequest.currency || "ر.ي"}</span>
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
      <SEOHead title="الاشتراك" description="اشترك في منصة تنوير التعليمية للوصول لجميع الدروس والاختبارات." canonical="/subscribe" noIndex />
      <Navbar />
      <div className="container mx-auto max-w-lg px-4 py-10">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" /> رجوع
        </button>

        <h1 className="mb-2 text-2xl font-bold text-foreground">الاشتراك في المنصة</h1>
        {referralDiscount > 0 && (
          <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/5 px-4 py-3 text-sm text-green-700 dark:text-green-400">
            🎉 لديك خصم إحالة <strong>{referralDiscount}%</strong> على اشتراكك!
          </div>
        )}
        {selectedPlan && (
          <p className="mb-8 text-muted-foreground">
            الخطة: <span className="font-bold text-primary">{selectedPlan.name}</span>
            {selectedSemester && ` — الفصل ${selectedSemester === 1 ? "الأول" : "الثاني"}`}
            {" — "}
            {discountedPrice ? (
              <>
                <span className="line-through text-muted-foreground">{selectedPlan.price.toLocaleString("ar-YE")}</span>
                {" "}
                <span className="font-bold text-green-600">{discountedPrice.toLocaleString("ar-YE")}</span>
              </>
            ) : (
              <>{selectedPlan.price.toLocaleString("ar-YE")}</>
            )}
            {" "}{selectedPlan.currency}
          </p>
        )}

        {/* Step indicator */}
        <div className="mb-8 flex items-center justify-center gap-1.5">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                i <= currentIdx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>{i + 1}</div>
              <span className={`text-[11px] hidden sm:inline ${i <= currentIdx ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
              {i < stepLabels.length - 1 && <div className={`h-px w-4 ${i < currentIdx ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        {/* Step 0: Choose plan */}
        {step === "plan" && (
          <div className="space-y-4">
            {plans.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
                <p className="text-muted-foreground">لا توجد خطط اشتراك متاحة حالياً</p>
              </div>
            ) : (
              plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => {
                    setSelectedPlan(plan);
                    setSelectedSemester(null);
                    if (plan.duration_type === "semester") {
                      setStep("semester");
                    } else {
                      setStep("method");
                    }
                  }}
                  className="group w-full rounded-2xl border border-border bg-card p-6 text-right shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${plan.duration_type === "annual" ? "bg-primary/10" : "bg-accent/15"}`}>
                      {plan.duration_type === "annual"
                        ? <Calendar className="h-7 w-7 text-primary" />
                        : <CalendarDays className="h-7 w-7 text-accent" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-card-foreground">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {plan.duration_type === "semester" ? "الوصول لمحتوى فصل دراسي واحد" : "الوصول لمحتوى الفصلين الدراسيين"}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-lg font-bold text-primary">{plan.price.toLocaleString("ar-YE")}</p>
                      <p className="text-xs text-muted-foreground">{plan.currency}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Step: Choose semester (for semester plans) */}
        {step === "semester" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">اختر الفصل الدراسي</h2>
            <p className="text-sm text-muted-foreground mb-2">ستتمكن من الوصول لمحتوى مواد الفصل الذي تختاره فقط</p>
            {[1, 2].map((sem) => (
              <button
                key={sem}
                onClick={() => { setSelectedSemester(sem); setStep("method"); }}
                className="group w-full rounded-2xl border border-border bg-card p-6 text-right shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                    <CalendarDays className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-card-foreground">الفصل الدراسي {sem === 1 ? "الأول" : "الثاني"}</h3>
                    <p className="text-sm text-muted-foreground">الوصول لجميع مواد الفصل {sem === 1 ? "الأول" : "الثاني"}</p>
                  </div>
                </div>
              </button>
            ))}
            <Button variant="outline" className="w-full" onClick={() => { setStep("plan"); setSelectedPlan(null); }}>رجوع</Button>
          </div>
        )}

        {/* Step: Choose method type */}
        {step === "method" && (
          <div className="space-y-4">
            <button onClick={() => loadMethods("bank")} className="group w-full rounded-2xl border border-border bg-card p-6 text-right shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5">
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
            <button onClick={() => loadMethods("exchange")} className="group w-full rounded-2xl border border-border bg-card p-6 text-right shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5">
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
            <Button variant="outline" className="w-full" onClick={() => {
              if (selectedPlan?.duration_type === "semester") {
                setStep("semester");
              } else {
                setStep("plan"); setSelectedPlan(null);
              }
            }}>رجوع</Button>
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
                        <button onClick={(e) => { e.stopPropagation(); copyToClipboard(m.account_number!, m.id); }} className="text-muted-foreground hover:text-primary">
                          {copiedId === m.id ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                  {m.details && <p className="mt-1 text-xs">{m.details}</p>}
                </div>
              </button>
            ))}
            <Button variant="outline" className="w-full" onClick={() => { setStep("method"); setMethodType(null); }}>رجوع</Button>
          </div>
        )}

        {/* Step 3: Upload receipt */}
        {step === "upload" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h3 className="mb-1 font-bold text-card-foreground">تحويل إلى: {selectedMethod?.name}</h3>
              <p className="text-sm text-muted-foreground">رقم الحساب: {selectedMethod?.account_number}</p>
              <p className="mt-2 text-sm font-bold text-primary">المبلغ: {selectedPlan?.price.toLocaleString("ar-YE")} {selectedPlan?.currency}</p>
            </div>

            <div className="rounded-2xl border-2 border-dashed border-border bg-card p-8 text-center">
              <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="mb-3 font-semibold text-card-foreground">ارفع سند التحويل</p>
              <p className="mb-4 text-sm text-muted-foreground">صورة واضحة لإيصال التحويل (JPG, PNG, PDF)</p>
              <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" id="receipt-upload" />
              <label htmlFor="receipt-upload">
                <Button variant="outline" asChild className="cursor-pointer"><span>اختر ملف</span></Button>
              </label>
              {receiptFile && <p className="mt-3 text-sm text-success font-medium">✓ {receiptFile.name}</p>}
            </div>

            <Button variant="hero" className="w-full" disabled={!receiptFile || uploading} onClick={handleSubmit}>
              {uploading ? "جاري الإرسال..." : "إرسال طلب الاشتراك"}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setStep("details")}>رجوع</Button>
          </div>
        )}

        {/* Done */}
        {step === "done" && (
          <div className="rounded-2xl border border-success/30 bg-card p-8 text-center shadow-card">
            <CheckCircle className="mx-auto mb-4 h-16 w-16 text-success" />
            <h2 className="mb-2 text-xl font-bold text-card-foreground">تم إرسال طلبك بنجاح!</h2>
            <p className="mb-6 text-muted-foreground">سيتم مراجعة سند التحويل وتفعيل اشتراكك خلال 24 ساعة</p>
            <Link to="/grades"><Button variant="hero">العودة للصفوف</Button></Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscribePage;
