import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Award, Download, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Certificate {
  id: string;
  subject_id: string;
  issued_at: string;
  subjects?: { name: string; grades?: { name: string } } | null;
}

const CertificatesList = () => {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Certificate | null>(null);
  const [profileName, setProfileName] = useState("");
  const certRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) loadCertificates();
  }, [user]);

  const loadCertificates = async () => {
    if (!user) return;
    const [certsRes, profileRes] = await Promise.all([
      supabase
        .from("certificates" as any)
        .select("id, subject_id, issued_at, subjects(name, grades(name))")
        .eq("user_id", user.id)
        .order("issued_at", { ascending: false }),
      supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
    ]);
    setCertificates((certsRes.data as any) || []);
    setProfileName(profileRes.data?.full_name || "طالب");
    setLoading(false);
  };

  const downloadCertificate = () => {
    if (!certRef.current) return;
    const el = certRef.current;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>شهادة إتمام</title>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Cairo', sans-serif; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>${el.outerHTML}</body>
        <script>setTimeout(() => { window.print(); window.close(); }, 500);<\/script>
        </html>
      `);
      printWindow.document.close();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (certificates.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-card-foreground">
        <GraduationCap className="h-5 w-5 text-accent" /> شهادات الإتمام
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        {certificates.map((cert) => (
          <div
            key={cert.id}
            onClick={() => setSelected(cert)}
            className="cursor-pointer rounded-xl border border-accent/20 bg-accent/5 p-4 transition-all hover:shadow-md hover:border-accent/40"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15">
                <Award className="h-6 w-6 text-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-card-foreground truncate">
                  {(cert as any).subjects?.name || "مادة"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {(cert as any).subjects?.grades?.name || ""}
                  {" • "}
                  {new Date(cert.issued_at).toLocaleDateString("ar-YE")}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Certificate Preview Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="text-right">شهادة إتمام</DialogTitle>
          </DialogHeader>
          
          {selected && (
            <div className="p-4 space-y-4">
              {/* Certificate Design */}
              <div
                ref={certRef}
                className="relative mx-auto aspect-[1.414] w-full max-w-lg rounded-2xl border-4 border-accent/30 bg-gradient-to-br from-card via-background to-accent/5 p-6 sm:p-10 text-center"
                style={{ fontFamily: "'Cairo', sans-serif" }}
              >
                {/* Decorative corners */}
                <div className="absolute top-3 right-3 h-8 w-8 border-t-4 border-r-4 border-accent/40 rounded-tr-xl" />
                <div className="absolute top-3 left-3 h-8 w-8 border-t-4 border-l-4 border-accent/40 rounded-tl-xl" />
                <div className="absolute bottom-3 right-3 h-8 w-8 border-b-4 border-r-4 border-accent/40 rounded-br-xl" />
                <div className="absolute bottom-3 left-3 h-8 w-8 border-b-4 border-l-4 border-accent/40 rounded-bl-xl" />

                <div className="flex flex-col items-center justify-center h-full gap-3 sm:gap-4">
                  <Award className="h-12 w-12 sm:h-16 sm:w-16 text-accent" />
                  
                  <h3 className="text-base sm:text-xl font-bold text-accent">شهادة إتمام</h3>
                  
                  <p className="text-xs sm:text-sm text-muted-foreground">تشهد منصة مَسار التعليمية بأن</p>
                  
                  <p className="text-lg sm:text-2xl font-extrabold text-card-foreground border-b-2 border-accent/30 pb-1 px-4">
                    {profileName}
                  </p>
                  
                  <p className="text-xs sm:text-sm text-muted-foreground">قد أتمّ بنجاح جميع دروس مادة</p>
                  
                  <p className="text-base sm:text-xl font-bold text-primary">
                    {(selected as any).subjects?.name}
                  </p>
                  
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {(selected as any).subjects?.grades?.name}
                  </p>
                  
                  <div className="mt-2 sm:mt-4 text-[10px] sm:text-xs text-muted-foreground">
                    <p>تاريخ الإصدار: {new Date(selected.issued_at).toLocaleDateString("ar-YE")}</p>
                    <p className="mt-1 font-medium text-accent">منصة مَسار التعليمية</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <Button variant="hero" size="sm" className="gap-2" onClick={downloadCertificate}>
                  <Download className="h-4 w-4" />
                  طباعة الشهادة
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CertificatesList;
