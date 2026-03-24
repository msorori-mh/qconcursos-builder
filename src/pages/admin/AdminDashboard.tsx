import { useEffect, useState } from "react";
import {
  GraduationCap, BookOpen, FileText, HelpCircle, CreditCard,
  Users, TrendingUp, DollarSign, UserCheck, Clock, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--success))", "hsl(var(--destructive))"];

const AdminDashboard = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    grades: 0, subjects: 0, lessons: 0, questions: 0,
    pendingPayments: 0, totalStudents: 0,
    activeSubscriptions: 0, pendingSubscriptions: 0, expiredSubscriptions: 0,
    totalRevenue: 0, approvedPayments: 0, rejectedPayments: 0,
  });
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [exporting, setExporting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllStats();
  }, []);

  const loadAllStats = async () => {
    const [
      grades, subjects, lessons, questions,
      pendingPay, approvedPay, rejectedPay,
      students, activeSubs, pendingSubs, expiredSubs,
      revenueData, recentPay,
    ] = await Promise.all([
      supabase.from("grades").select("id", { count: "exact", head: true }),
      supabase.from("subjects").select("id", { count: "exact", head: true }),
      supabase.from("lessons").select("id", { count: "exact", head: true }),
      supabase.from("questions").select("id", { count: "exact", head: true }),
      supabase.from("payment_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("payment_requests").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("payment_requests").select("id", { count: "exact", head: true }).eq("status", "rejected"),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "expired"),
      supabase.from("payment_requests").select("amount").eq("status", "approved"),
      supabase.from("payment_requests").select("amount, status, created_at, profiles!payment_requests_user_id_fkey(full_name)").order("created_at", { ascending: false }).limit(5),
    ]);

    const revenue = (revenueData.data || []).reduce((sum: number, r: any) => sum + Number(r.amount), 0);

    setStats({
      grades: grades.count || 0,
      subjects: subjects.count || 0,
      lessons: lessons.count || 0,
      questions: questions.count || 0,
      pendingPayments: pendingPay.count || 0,
      approvedPayments: approvedPay.count || 0,
      rejectedPayments: rejectedPay.count || 0,
      totalStudents: students.count || 0,
      activeSubscriptions: activeSubs.count || 0,
      pendingSubscriptions: pendingSubs.count || 0,
      expiredSubscriptions: expiredSubs.count || 0,
      totalRevenue: revenue,
    });
    setRecentPayments(recentPay.data || []);
    setLoading(false);
  };

  const summaryCards = [
    { label: "إجمالي الطلاب", value: stats.totalStudents, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "الاشتراكات النشطة", value: stats.activeSubscriptions, icon: UserCheck, color: "text-success", bg: "bg-success/10" },
    { label: "إجمالي الإيرادات", value: `${stats.totalRevenue.toLocaleString("ar-YE")} ر.ي`, icon: DollarSign, color: "text-accent", bg: "bg-accent/10" },
    { label: "طلبات معلقة", value: stats.pendingPayments, icon: Clock, color: "text-destructive", bg: "bg-destructive/10" },
  ];

  const contentCards = [
    { label: "الصفوف", value: stats.grades, icon: GraduationCap, color: "text-primary", bg: "bg-primary/10" },
    { label: "المواد", value: stats.subjects, icon: BookOpen, color: "text-accent", bg: "bg-accent/10" },
    { label: "الدروس", value: stats.lessons, icon: FileText, color: "text-success", bg: "bg-success/10" },
    { label: "الأسئلة", value: stats.questions, icon: HelpCircle, color: "text-primary", bg: "bg-primary/10" },
  ];

  const subscriptionChartData = [
    { name: "نشط", value: stats.activeSubscriptions },
    { name: "معلق", value: stats.pendingSubscriptions },
    { name: "منتهي", value: stats.expiredSubscriptions },
  ].filter((d) => d.value > 0);

  const paymentChartData = [
    { name: "مقبولة", count: stats.approvedPayments },
    { name: "معلقة", count: stats.pendingPayments },
    { name: "مرفوضة", count: stats.rejectedPayments },
  ];

  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const bom = "\uFEFF";
    const csv = bom + [headers.join(","), ...rows.map((r) => r.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportStudents = async () => {
    setExporting("students");
    try {
      const { data } = await supabase.from("profiles").select("full_name, phone, created_at");
      if (!data?.length) { toast({ title: "لا توجد بيانات للتصدير" }); return; }
      downloadCSV("students.csv", ["الاسم", "الهاتف", "تاريخ التسجيل"], data.map((p: any) => [
        p.full_name || "", p.phone || "", new Date(p.created_at).toLocaleDateString("ar-YE"),
      ]));
      toast({ title: "تم تصدير بيانات الطلاب" });
    } finally { setExporting(null); }
  };

  const exportSubscriptions = async () => {
    setExporting("subs");
    try {
      const { data } = await supabase.from("subscriptions").select("user_id, status, starts_at, expires_at, created_at");
      if (!data?.length) { toast({ title: "لا توجد بيانات للتصدير" }); return; }
      // Fetch profile names separately
      const userIds = [...new Set(data.map((s: any) => s.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const nameMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p.full_name]));
      downloadCSV("subscriptions.csv", ["الطالب", "الحالة", "تاريخ البدء", "تاريخ الانتهاء"], data.map((s: any) => [
        nameMap[s.user_id] || "", s.status, s.starts_at ? new Date(s.starts_at).toLocaleDateString("ar-YE") : "", s.expires_at ? new Date(s.expires_at).toLocaleDateString("ar-YE") : "",
      ]));
      toast({ title: "تم تصدير بيانات الاشتراكات" });
    } finally { setExporting(null); }
  };

  const exportPayments = async () => {
    setExporting("payments");
    try {
      const { data } = await supabase.from("payment_requests").select("amount, status, created_at, profiles!payment_requests_user_id_fkey(full_name), payment_methods(name)").order("created_at", { ascending: false });
      if (!data?.length) { toast({ title: "لا توجد بيانات للتصدير" }); return; }
      downloadCSV("payments.csv", ["الطالب", "المبلغ", "الطريقة", "الحالة", "التاريخ"], data.map((p: any) => [
        p.profiles?.full_name || "", String(p.amount), p.payment_methods?.name || "", p.status, new Date(p.created_at).toLocaleDateString("ar-YE"),
      ]));
      toast({ title: "تم تصدير بيانات المدفوعات" });
    } finally { setExporting(null); }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-accent/15 text-accent",
      approved: "bg-success/15 text-success",
      rejected: "bg-destructive/15 text-destructive",
    };
    const labels: Record<string, string> = { pending: "معلق", approved: "مقبول", rejected: "مرفوض" };
    return (
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${map[status] || ""}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-foreground">لوحة الإحصائيات</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" disabled={!!exporting} onClick={exportStudents}>
            <Download className="h-3.5 w-3.5" />
            {exporting === "students" ? "جاري التصدير..." : "تصدير الطلاب"}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" disabled={!!exporting} onClick={exportSubscriptions}>
            <Download className="h-3.5 w-3.5" />
            {exporting === "subs" ? "جاري التصدير..." : "تصدير الاشتراكات"}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" disabled={!!exporting} onClick={exportPayments}>
            <Download className="h-3.5 w-3.5" />
            {exporting === "payments" ? "جاري التصدير..." : "تصدير المدفوعات"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-card-foreground truncate">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Payment Status Bar Chart */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-4 text-sm font-bold text-card-foreground flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            طلبات الدفع
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={paymentChartData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {paymentChartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Subscription Pie Chart */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-4 text-sm font-bold text-card-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            توزيع الاشتراكات
          </h2>
          {subscriptionChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={subscriptionChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {subscriptionChartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">لا توجد اشتراكات بعد</p>
          )}
        </div>
      </div>

      {/* Content Stats + Recent Payments */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Content Cards */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-4 text-sm font-bold text-card-foreground">المحتوى التعليمي</h2>
          <div className="grid grid-cols-2 gap-3">
            {contentCards.map((card) => (
              <div key={card.label} className="flex items-center gap-2.5 rounded-xl bg-muted/50 p-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.bg}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{card.value}</p>
                  <p className="text-[11px] text-muted-foreground">{card.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-4 text-sm font-bold text-card-foreground">آخر طلبات الدفع</h2>
          {recentPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">لا توجد طلبات</p>
          ) : (
            <div className="space-y-3">
              {recentPayments.map((p: any) => (
                <div key={p.created_at} className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {p.profiles?.full_name || "طالب"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("ar-YE")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{Number(p.amount).toLocaleString("ar-YE")}</span>
                    {statusBadge(p.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
