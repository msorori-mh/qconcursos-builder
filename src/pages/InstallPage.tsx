import { useState, useEffect } from "react";
import { Download, Smartphone, Monitor, CheckCircle2, Share, MoreVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import SEOHead from "@/components/SEOHead";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallPage = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="تثبيت التطبيق" description="ثبّت تطبيق تنوير على جهازك للوصول السريع والعمل بدون إنترنت" />
      <Navbar />
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <div className="text-center mb-10">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <Download className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">ثبّت تطبيق تنوير</h1>
          <p className="mt-2 text-muted-foreground">احصل على تجربة أسرع مع إمكانية العمل بدون إنترنت</p>
        </div>

        {isInstalled ? (
          <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-8 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-green-600" />
            <h2 className="text-xl font-bold text-foreground">التطبيق مثبّت بالفعل! 🎉</h2>
            <p className="mt-2 text-muted-foreground">يمكنك فتحه من الشاشة الرئيسية لجهازك</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Auto install button for supported browsers */}
            {deferredPrompt && (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
                <Button variant="hero" size="lg" className="gap-2 text-lg px-8" onClick={handleInstall}>
                  <Download className="h-5 w-5" />
                  تثبيت التطبيق الآن
                </Button>
              </div>
            )}

            {/* iOS Instructions */}
            {isIOS && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <div className="flex items-center gap-3 mb-4">
                  <Smartphone className="h-6 w-6 text-primary" />
                  <h2 className="text-lg font-bold text-card-foreground">التثبيت على iPhone / iPad</h2>
                </div>
                <ol className="space-y-4 text-card-foreground">
                  <li className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">1</span>
                    <span>اضغط على زر <Share className="inline h-4 w-4 mx-1" /> المشاركة في أسفل المتصفح</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">2</span>
                    <span>مرر للأسفل واختر <Plus className="inline h-4 w-4 mx-1" /> "إضافة إلى الشاشة الرئيسية"</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">3</span>
                    <span>اضغط "إضافة" في الأعلى</span>
                  </li>
                </ol>
              </div>
            )}

            {/* Android Instructions */}
            {!isIOS && !deferredPrompt && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <div className="flex items-center gap-3 mb-4">
                  <Smartphone className="h-6 w-6 text-primary" />
                  <h2 className="text-lg font-bold text-card-foreground">التثبيت على Android</h2>
                </div>
                <ol className="space-y-4 text-card-foreground">
                  <li className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">1</span>
                    <span>اضغط على <MoreVertical className="inline h-4 w-4 mx-1" /> القائمة في أعلى المتصفح</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">2</span>
                    <span>اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">3</span>
                    <span>اضغط "تثبيت" للتأكيد</span>
                  </li>
                </ol>
              </div>
            )}

            {/* Desktop */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-center gap-3 mb-4">
                <Monitor className="h-6 w-6 text-primary" />
                <h2 className="text-lg font-bold text-card-foreground">التثبيت على الكمبيوتر</h2>
              </div>
              <p className="text-card-foreground">
                في متصفح Chrome أو Edge، اضغط على أيقونة التثبيت <Download className="inline h-4 w-4 mx-1" /> في شريط العنوان، ثم اضغط "تثبيت".
              </p>
            </div>

            {/* Features */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h2 className="text-lg font-bold text-card-foreground mb-4">مميزات التطبيق المثبّت</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  "فتح فوري بدون متصفح",
                  "يعمل بدون إنترنت",
                  "تحميل أسرع",
                  "إشعارات فورية",
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm text-card-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstallPage;
