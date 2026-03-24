import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface PaymentRequest {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt_url: string | null;
  created_at: string;
  admin_notes: string | null;
  user_id: string;
  subscription_id: string | null;
  profiles?: { full_name: string | null; phone: string | null } | null;
  payment_methods?: { name: string; type: string } | null;
}

const AdminPaymentsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [filter]);

  const loadRequests = async () => {
    let query = supabase
      .from("payment_requests")
      .select("*, profiles!payment_requests_user_id_fkey(full_name, phone), payment_methods(name, type)")
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data } = await query;
    if (data) setRequests(data as any);
  };

  const handleAction = async (action: "approved" | "rejected") => {
    if (!selectedRequest) return;
    setProcessing(true);

    try {
      // Update payment request
      const { error: payErr } = await supabase
        .from("payment_requests")
        .update({
          status: action,
          admin_notes: adminNotes || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user!.id,
        })
        .eq("id", selectedRequest.id);

      if (payErr) throw payErr;

      // If approved, activate subscription
      if (action === "approved" && selectedRequest.subscription_id) {
        const now = new Date();
        const expires = new Date(now);
        expires.setMonth(expires.getMonth() + 6);

        const { error: subErr } = await supabase
          .from("subscriptions")
          .update({
            status: "active",
            starts_at: now.toISOString(),
            expires_at: expires.toISOString(),
          })
          .eq("id", selectedRequest.subscription_id);

        if (subErr) throw subErr;
      }

      toast({
        title: action === "approved" ? "تم قبول الطلب" : "تم رفض الطلب",
        description: action === "approved" ? "تم تفعيل اشتراك الطالب" : "تم إرسال إشعار للطالب",
      });

      setSelectedRequest(null);
      setAdminNotes("");
      loadRequests();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { icon: any; text: string; cls: string }> = {
      pending: { icon: Clock, text: "قيد المراجعة", cls: "bg-accent/15 text-accent" },
      approved: { icon: CheckCircle, text: "مقبول", cls: "bg-success/15 text-success" },
      rejected: { icon: XCircle, text: "مرفوض", cls: "bg-destructive/15 text-destructive" },
    };
    const s = map[status] || map.pending;
    const Icon = s.icon;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}>
        <Icon className="h-3.5 w-3.5" />
        {s.text}
      </span>
    );
  };

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-foreground">إدارة طلبات الدفع</h1>

        {/* Filters */}
        <div className="mb-6 flex gap-2 overflow-x-auto">
          {([
            { key: "pending", label: "قيد المراجعة" },
            { key: "approved", label: "مقبولة" },
            { key: "rejected", label: "مرفوضة" },
            { key: "all", label: "الكل" },
          ] as const).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Requests list */}
        {requests.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
            <p className="text-muted-foreground">لا توجد طلبات {filter !== "all" ? "في هذه الفئة" : ""}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-card-hover"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-card-foreground">
                        {(req as any).profiles?.full_name || "طالب"}
                      </h3>
                      {statusBadge(req.status)}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>المبلغ: <strong className="text-foreground">{req.amount} ر.ي</strong></span>
                      <span>الطريقة: {(req as any).payment_methods?.name || "—"}</span>
                      <span>{new Date(req.created_at).toLocaleDateString("ar-YE")}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {req.receipt_url && (
                      <a href={req.receipt_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          السند
                        </Button>
                      </a>
                    )}
                    {req.status === "pending" && (
                      <Button
                        variant="hero"
                        size="sm"
                        onClick={() => { setSelectedRequest(req); setAdminNotes(""); }}
                      >
                        مراجعة
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>مراجعة طلب الدفع</DialogTitle>
            <DialogDescription>
              {(selectedRequest as any)?.profiles?.full_name || "طالب"} — {selectedRequest?.amount} ر.ي
            </DialogDescription>
          </DialogHeader>

          {selectedRequest?.receipt_url && (
            <a href={selectedRequest.receipt_url} target="_blank" rel="noopener noreferrer">
              <img
                src={selectedRequest.receipt_url}
                alt="سند التحويل"
                className="w-full rounded-lg border border-border"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </a>
          )}

          <textarea
            placeholder="ملاحظات (اختياري)..."
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            className="w-full rounded-lg border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            rows={3}
          />

          <div className="flex gap-3">
            <Button
              variant="hero"
              className="flex-1"
              disabled={processing}
              onClick={() => handleAction("approved")}
            >
              <CheckCircle className="h-4 w-4 ml-1" />
              قبول وتفعيل
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={processing}
              onClick={() => handleAction("rejected")}
            >
              <XCircle className="h-4 w-4 ml-1" />
              رفض
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPaymentsPage;
