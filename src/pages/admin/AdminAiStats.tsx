import { useEffect, useState, useMemo } from "react";
import { Brain, Bot, FileText, Lightbulb, Compass, TrendingUp, AlertTriangle, Users, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--success))", "hsl(var(--destructive))", "#8b5cf6"];

const FEATURE_LABELS: Record<string, string> = {
  ai_tutor: "المساعد الذكي",
  lesson_summary: "ملخصات الدروس",
  study_plan: "خطط المراجعة",
  adaptive_recommendations: "التوصيات التكيفية",
};

const FEATURE_ICONS: Record<string, typeof Brain> = {
  ai_tutor: Bot,
  lesson_summary: FileText,
  study_plan: Lightbulb,
  adaptive_recommendations: Compass,
};

interface AiLog {
  id: string;
  user_id: string;
  feature: string;
  model: string | null;
  tokens_used: number;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

const AdminAiStats = () => {
  const [logs, setLogs] = useState<AiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data } = await supabase
      .from("ai_usage_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000) as { data: AiLog[] | null };

    const logData = data || [];
    setLogs(logData);

    // Load profile names
    const userIds = [...new Set(logData.map(l => l.user_id))];
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.user_id] = p.full_name || "بدون اسم"; });
      setProfiles(map);
    }
    setLoading(false);
  };

  const stats = useMemo(() => {
    const total = logs.length;
    const successful = logs.filter(l => l.success).length;
    const failed = total - successful;
    const uniqueUsers = new Set(logs.map(l => l.user_id)).size;

    // Per feature
    const byFeature: Record<string, number> = {};
    logs.forEach(l => { byFeature[l.feature] = (byFeature[l.feature] || 0) + 1; });

    const featureChart = Object.entries(byFeature).map(([feature, count]) => ({
      name: FEATURE_LABELS[feature] || feature,
      value: count,
    }));

    // Daily usage (last 14 days)
    const dailyMap: Record<string, number> = {};
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dailyMap[d.toISOString().split("T")[0]] = 0;
    }
    logs.forEach(l => {
      const day = l.created_at.split("T")[0];
      if (day in dailyMap) dailyMap[day]++;
    });
    const dailyChart = Object.entries(dailyMap).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString("ar-YE", { month: "short", day: "numeric" }),
      count,
    }));

    // Top users
    const userCounts: Record<string, number> = {};
    logs.forEach(l => { userCounts[l.user_id] = (userCounts[l.user_id] || 0) + 1; });
    const topUsers = Object.entries(userCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Error rate by feature
    const errorByFeature: Record<string, { total: number; errors: number }> = {};
    logs.forEach(l => {
      if (!errorByFeature[l.feature]) errorByFeature[l.feature] = { total: 0, errors: 0 };
      errorByFeature[l.feature].total++;
      if (!l.success) errorByFeature[l.feature].errors++;
    });

    return { total, successful, failed, uniqueUsers, featureChart, dailyChart, topUsers, errorByFeature, byFeature };
  }, [logs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const summaryCards = [
    { label: "إجمالي الطلبات", value: stats.total, icon: Activity, color: "text-primary", bg: "bg-primary/10" },
    { label: "طلبات ناجحة", value: stats.successful, icon: TrendingUp, color: "text-success", bg: "bg-success/10" },
    { label: "طلبات فاشلة", value: stats.failed, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "مستخدمون فريدون", value: stats.uniqueUsers, icon: Users, color: "text-accent", bg: "bg-accent/10" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">إحصائيات الذكاء الاصطناعي</h1>
          <p className="text-xs text-muted-foreground">تتبع استخدام ميزات الذكاء الاصطناعي في المنصة</p>
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
                <p className="text-lg font-bold text-card-foreground">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Feature breakdown cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {Object.entries(stats.byFeature).map(([feature, count]) => {
          const Icon = FEATURE_ICONS[feature] || Brain;
          return (
            <div key={feature} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <Icon className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-bold text-foreground">{count}</p>
                <p className="text-[11px] text-muted-foreground">{FEATURE_LABELS[feature] || feature}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Daily usage line chart */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-4 text-sm font-bold text-card-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            الاستخدام اليومي (آخر 14 يوم)
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats.dailyChart}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Feature distribution pie */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-4 text-sm font-bold text-card-foreground flex items-center gap-2">
            <Brain className="h-4 w-4 text-accent" />
            توزيع الاستخدام حسب الميزة
          </h2>
          {stats.featureChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={stats.featureChart} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}>
                  {stats.featureChart.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">لا توجد بيانات بعد</p>
          )}
        </div>
      </div>

      {/* Error rates per feature */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="mb-4 text-sm font-bold text-card-foreground flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          معدل الأخطاء حسب الميزة
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(stats.errorByFeature).map(([feature, data]) => {
            const rate = data.total > 0 ? Math.round((data.errors / data.total) * 100) : 0;
            return (
              <div key={feature} className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">{FEATURE_LABELS[feature] || feature}</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-lg font-bold ${rate > 10 ? "text-destructive" : "text-success"}`}>{rate}%</span>
                  <span className="text-[11px] text-muted-foreground">{data.errors}/{data.total}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top users table */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="mb-4 text-sm font-bold text-card-foreground flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          أكثر الطلاب استخداماً
        </h2>
        {stats.topUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">لا توجد بيانات بعد</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">#</TableHead>
                <TableHead className="text-right">الطالب</TableHead>
                <TableHead className="text-right">عدد الطلبات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.topUsers.map(([userId, count], i) => (
                <TableRow key={userId}>
                  <TableCell className="font-medium">{i + 1}</TableCell>
                  <TableCell>{profiles[userId] || "بدون اسم"}</TableCell>
                  <TableCell>{count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Recent logs */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="mb-4 text-sm font-bold text-card-foreground flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent" />
          آخر الطلبات
        </h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الطالب</TableHead>
                <TableHead className="text-right">الميزة</TableHead>
                <TableHead className="text-right">النموذج</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.slice(0, 20).map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">{profiles[log.user_id] || "بدون اسم"}</TableCell>
                  <TableCell className="text-sm">{FEATURE_LABELS[log.feature] || log.feature}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{log.model?.split("/")[1] || "-"}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      log.success ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                    }`}>
                      {log.success ? "نجاح" : "فشل"}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleDateString("ar-YE")} {new Date(log.created_at).toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit" })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default AdminAiStats;
