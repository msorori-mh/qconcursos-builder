import { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, PieChart, Pie, Cell,
} from "recharts";
import {
  TrendingUp, DollarSign, Users, BookOpen, FileText, HelpCircle,
  GraduationCap, Calendar,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--success))",
  "hsl(var(--destructive))", "hsl(var(--warning, 40 96% 50%))",
];

const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

interface MonthlyData { month: string; revenue: number; students: number; }
interface ContentData { name: string; count: number; }
interface GradeSubData { grade: string; subjects: number; lessons: number; }

const AdminReports = () => {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [contentData, setContentData] = useState<ContentData[]>([]);
  const [gradeData, setGradeData] = useState<GradeSubData[]>([]);
  const [subStatusData, setSubStatusData] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    const [payments, profiles, grades, subjects, lessons, questions, subscriptions] = await Promise.all([
      supabase.from("payment_requests").select("amount, status, created_at").eq("status", "approved"),
      supabase.from("profiles").select("created_at"),
      supabase.from("grades").select("id, name"),
      supabase.from("subjects").select("id, grade_id"),
      supabase.from("lessons").select("id, subject_id"),
      supabase.from("questions").select("id", { count: "exact", head: true }),
      supabase.from("subscriptions").select("status"),
    ]);

    // Monthly revenue + student growth (last 12 months)
    const now = new Date();
    const monthly: MonthlyData[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${MONTHS_AR[d.getMonth()]} ${d.getFullYear() % 100}`;

      const rev = (payments.data || [])
        .filter((p: any) => p.created_at?.startsWith(yearMonth))
        .reduce((s: number, p: any) => s + Number(p.amount), 0);

      const stu = (profiles.data || [])
        .filter((p: any) => p.created_at?.startsWith(yearMonth)).length;

      monthly.push({ month: label, revenue: rev, students: stu });
    }
    setMonthlyData(monthly);

    // Content overview
    setContentData([
      { name: "الصفوف", count: grades.data?.length || 0 },
      { name: "المواد", count: subjects.data?.length || 0 },
      { name: "الدروس", count: lessons.data?.length || 0 },
      { name: "الأسئلة", count: questions.count || 0 },
    ]);

    // Grade breakdown
    const gradeBreakdown: GradeSubData[] = (grades.data || []).map((g: any) => {
      const gradeSubjects = (subjects.data || []).filter((s: any) => s.grade_id === g.id);
      const subjectIds = new Set(gradeSubjects.map((s: any) => s.id));
      const gradeLessons = (lessons.data || []).filter((l: any) => subjectIds.has(l.subject_id));
      return { grade: g.name, subjects: gradeSubjects.length, lessons: gradeLessons.length };
    });
    setGradeData(gradeBreakdown);

    // Subscription status distribution
    const statusCount: Record<string, number> = {};
    (subscriptions.data || []).forEach((s: any) => {
      statusCount[s.status] = (statusCount[s.status] || 0) + 1;
    });
    const statusLabels: Record<string, string> = { active: "نشط", pending: "معلق", expired: "منتهي" };
    setSubStatusData(
      Object.entries(statusCount).map(([k, v]) => ({ name: statusLabels[k] || k, value: v }))
    );

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const totalRevenue = monthlyData.reduce((s, m) => s + m.revenue, 0);
  const totalStudents = monthlyData.reduce((s, m) => s + m.students, 0);
  const totalContent = contentData.reduce((s, c) => s + c.count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold text-foreground">التقارير والإحصائيات</h1>
      </div>

      {/* Summary */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <SummaryCard icon={DollarSign} label="إجمالي الإيرادات" value={`${totalRevenue.toLocaleString("ar-YE")} ر.ي`} color="text-accent" bg="bg-accent/10" />
        <SummaryCard icon={Users} label="إجمالي التسجيلات" value={totalStudents} color="text-primary" bg="bg-primary/10" />
        <SummaryCard icon={BookOpen} label="إجمالي المحتوى" value={totalContent} color="text-success" bg="bg-success/10" />
      </div>

      {/* Monthly Revenue Chart */}
      <ChartCard title="الإيرادات الشهرية" icon={<DollarSign className="h-4 w-4 text-accent" />}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [`${v.toLocaleString("ar-YE")} ر.ي`, "الإيرادات"]} />
            <Bar dataKey="revenue" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} name="الإيرادات" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Student Growth Chart */}
      <ChartCard title="نمو عدد الطلاب" icon={<Users className="h-4 w-4 text-primary" />}>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [v, "طلاب جدد"]} />
            <Line type="monotone" dataKey="students" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} name="طلاب جدد" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Content + Subscriptions row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Content Pie */}
        <ChartCard title="توزيع المحتوى التعليمي" icon={<FileText className="h-4 w-4 text-success" />}>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={contentData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="count" label={({ name, count }) => `${name}: ${count}`}>
                {contentData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Subscription Status Pie */}
        <ChartCard title="توزيع حالات الاشتراكات" icon={<Calendar className="h-4 w-4 text-primary" />}>
          {subStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={subStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {subStatusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">لا توجد اشتراكات بعد</p>
          )}
        </ChartCard>
      </div>

      {/* Grade Breakdown Bar */}
      {gradeData.length > 0 && (
        <ChartCard title="أداء المحتوى حسب الصف" icon={<GraduationCap className="h-4 w-4 text-primary" />}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={gradeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="grade" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="subjects" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="المواد" />
              <Bar dataKey="lessons" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="الدروس" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
};

/* ---------- Small helper components ---------- */

const SummaryCard = ({ icon: Icon, label, value, color, bg }: { icon: any; label: string; value: any; color: string; bg: string }) => (
  <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
    <div className="flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-card-foreground truncate">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  </div>
);

const ChartCard = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
    <h2 className="mb-4 text-sm font-bold text-card-foreground flex items-center gap-2">
      {icon}
      {title}
    </h2>
    {children}
  </div>
);

export default AdminReports;
