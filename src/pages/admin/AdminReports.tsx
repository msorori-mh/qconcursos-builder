import { useEffect, useState, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, PieChart, Pie, Cell,
} from "recharts";
import {
  TrendingUp, DollarSign, Users, BookOpen, FileText, Download,
  GraduationCap, Calendar, MapPin, School, SlidersHorizontal, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--success))",
  "hsl(var(--destructive))", "hsl(var(--warning, 40 96% 50%))",
  "#6366f1", "#f59e0b", "#06b6d4", "#ec4899", "#8b5cf6",
  "#14b8a6", "#f97316", "#84cc16", "#e11d48", "#0ea5e9",
  "#a855f7", "#22c55e", "#ef4444", "#3b82f6", "#eab308",
  "#64748b", "#d946ef",
];

const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

const TIME_RANGES = [
  { key: "3m", label: "آخر 3 أشهر", months: 3 },
  { key: "6m", label: "آخر 6 أشهر", months: 6 },
  { key: "12m", label: "آخر 12 شهر", months: 12 },
  { key: "all", label: "الكل", months: 0 },
] as const;

type TimeRange = typeof TIME_RANGES[number]["key"];

// Raw data interfaces
interface RawProfile { created_at: string; governorate: string | null; school_name: string | null; grade_id: string | null; }
interface RawPayment { amount: number; created_at: string; }
interface RawSub { status: string; user_id: string; created_at: string; grade_id: string | null; }
interface Grade { id: string; name: string; }

// Chart data interfaces
interface MonthlyData { month: string; revenue: number; students: number; }
interface GovData { name: string; count: number; }
interface SchoolData { name: string; count: number; governorate: string; }

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

const AdminReports = () => {
  const { toast } = useToast();
  // Raw data
  const [rawProfiles, setRawProfiles] = useState<RawProfile[]>([]);
  const [rawPayments, setRawPayments] = useState<RawPayment[]>([]);
  const [rawSubs, setRawSubs] = useState<RawSub[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjectsData, setSubjectsData] = useState<any[]>([]);
  const [lessonsData, setLessonsData] = useState<any[]>([]);
  const [questionsCount, setQuestionsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [timeRange, setTimeRange] = useState<TimeRange>("12m");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadRawData();
  }, []);

  const loadRawData = async () => {
    const [payments, profiles, gradesRes, subjects, lessons, questions, subscriptions] = await Promise.all([
      supabase.from("payment_requests").select("amount, created_at").eq("status", "approved"),
      supabase.from("profiles").select("created_at, governorate, school_name, grade_id"),
      supabase.from("grades").select("id, name").order("sort_order"),
      supabase.from("subjects").select("id, grade_id"),
      supabase.from("lessons").select("id, subject_id"),
      supabase.from("questions").select("id", { count: "exact", head: true }),
      supabase.from("subscriptions").select("status, user_id, created_at, grade_id"),
    ]);

    setRawPayments((payments.data || []) as RawPayment[]);
    setRawProfiles((profiles.data || []) as RawProfile[]);
    setGrades((gradesRes.data || []) as Grade[]);
    setSubjectsData(subjects.data || []);
    setLessonsData(lessons.data || []);
    setQuestionsCount(questions.count || 0);
    setRawSubs((subscriptions.data || []) as RawSub[]);
    setLoading(false);
  };

  // Compute cutoff date from timeRange
  const cutoffDate = useMemo(() => {
    const range = TIME_RANGES.find((r) => r.key === timeRange);
    if (!range || range.months === 0) return null;
    const d = new Date();
    d.setMonth(d.getMonth() - range.months);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [timeRange]);

  const inRange = (dateStr: string) => {
    if (!cutoffDate) return true;
    return new Date(dateStr) >= cutoffDate;
  };

  // Filtered data
  const filteredProfiles = useMemo(() => {
    let data = rawProfiles;
    if (cutoffDate) data = data.filter((p) => inRange(p.created_at));
    if (gradeFilter !== "all") data = data.filter((p) => p.grade_id === gradeFilter);
    return data;
  }, [rawProfiles, cutoffDate, gradeFilter]);

  const filteredPayments = useMemo(() => {
    if (!cutoffDate) return rawPayments;
    return rawPayments.filter((p) => inRange(p.created_at));
  }, [rawPayments, cutoffDate]);

  const filteredSubs = useMemo(() => {
    let data = rawSubs;
    if (cutoffDate) data = data.filter((s) => inRange(s.created_at));
    if (gradeFilter !== "all") data = data.filter((s) => s.grade_id === gradeFilter);
    return data;
  }, [rawSubs, cutoffDate, gradeFilter]);

  // Monthly chart data
  const monthlyData = useMemo(() => {
    const range = TIME_RANGES.find((r) => r.key === timeRange);
    const monthsBack = range?.months || 12;
    const now = new Date();
    const data: MonthlyData[] = [];
    for (let i = (monthsBack || 24) - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${MONTHS_AR[d.getMonth()]} ${d.getFullYear() % 100}`;

      const rev = filteredPayments
        .filter((p) => p.created_at?.startsWith(yearMonth))
        .reduce((s, p) => s + Number(p.amount), 0);

      const stu = filteredProfiles
        .filter((p) => p.created_at?.startsWith(yearMonth)).length;

      data.push({ month: label, revenue: rev, students: stu });
    }
    return data;
  }, [filteredPayments, filteredProfiles, timeRange]);

  // Governorate data
  const govData = useMemo(() => {
    const govCount: Record<string, number> = {};
    filteredProfiles.forEach((p) => {
      const gov = p.governorate || "غير محدد";
      govCount[gov] = (govCount[gov] || 0) + 1;
    });
    return Object.entries(govCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredProfiles]);

  // School data
  const schoolData = useMemo(() => {
    const schoolCount: Record<string, { count: number; governorate: string }> = {};
    filteredProfiles.forEach((p) => {
      if (p.school_name?.trim()) {
        const key = p.school_name.trim();
        if (!schoolCount[key]) schoolCount[key] = { count: 0, governorate: p.governorate || "غير محدد" };
        schoolCount[key].count++;
      }
    });
    return Object.entries(schoolCount)
      .map(([name, { count, governorate }]) => ({ name, count, governorate }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [filteredProfiles]);

  // Subscription status
  const subStatusData = useMemo(() => {
    const statusCount: Record<string, number> = {};
    filteredSubs.forEach((s) => { statusCount[s.status] = (statusCount[s.status] || 0) + 1; });
    const labels: Record<string, string> = { active: "نشط", pending: "معلق", expired: "منتهي" };
    return Object.entries(statusCount).map(([k, v]) => ({ name: labels[k] || k, value: v }));
  }, [filteredSubs]);

  // Content data (not filtered by time/grade)
  const contentData = useMemo(() => [
    { name: "الصفوف", count: grades.length },
    { name: "المواد", count: subjectsData.length },
    { name: "الدروس", count: lessonsData.length },
    { name: "الأسئلة", count: questionsCount },
  ], [grades, subjectsData, lessonsData, questionsCount]);

  // Grade breakdown (not filtered by grade)
  const gradeData = useMemo(() =>
    grades.map((g) => {
      const gradeSubjects = subjectsData.filter((s: any) => s.grade_id === g.id);
      const subjectIds = new Set(gradeSubjects.map((s: any) => s.id));
      const gradeLessons = lessonsData.filter((l: any) => subjectIds.has(l.subject_id));
      return { grade: g.name, subjects: gradeSubjects.length, lessons: gradeLessons.length };
    }),
  [grades, subjectsData, lessonsData]);

  const activeFiltersCount = [timeRange !== "12m", gradeFilter !== "all"].filter(Boolean).length;

  const exportGovReport = () => {
    if (!govData.length) { toast({ title: "لا توجد بيانات للتصدير" }); return; }
    downloadCSV("governorate-report.csv", ["المحافظة", "عدد الطلاب"], govData.map((g) => [g.name, String(g.count)]));
    toast({ title: "تم تصدير تقرير المحافظات" });
  };

  const exportSchoolReport = () => {
    if (!schoolData.length) { toast({ title: "لا توجد بيانات للتصدير" }); return; }
    downloadCSV("school-report.csv", ["المدرسة", "المحافظة", "عدد الطلاب"], schoolData.map((s) => [s.name, s.governorate, String(s.count)]));
    toast({ title: "تم تصدير تقرير المدارس" });
  };

  const exportRevenueReport = () => {
    if (!monthlyData.length) { toast({ title: "لا توجد بيانات للتصدير" }); return; }
    downloadCSV("revenue-report.csv", ["الشهر", "الإيرادات", "الطلاب الجدد"], monthlyData.map((m) => [m.month, String(m.revenue), String(m.students)]));
    toast({ title: "تم تصدير تقرير الإيرادات" });
  };

  const exportSubscriptionsReport = () => {
    if (!subStatusData.length) { toast({ title: "لا توجد بيانات للتصدير" }); return; }
    downloadCSV("subscriptions-report.csv", ["الحالة", "العدد"], subStatusData.map((s) => [s.name, String(s.value)]));
    toast({ title: "تم تصدير تقرير الاشتراكات" });
  };

  const exportAllReports = () => {
    exportGovReport();
    exportSchoolReport();
    exportRevenueReport();
    exportSubscriptionsReport();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const totalRevenue = monthlyData.reduce((s, m) => s + m.revenue, 0);
  const totalStudents = filteredProfiles.length;
  const totalContent = contentData.reduce((s, c) => s + c.count, 0);
  const govWithData = govData.filter((g) => g.name !== "غير محدد").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">التقارير والإحصائيات</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Download className="h-3.5 w-3.5" />
                تصدير التقارير
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportAllReports}>تصدير الكل (CSV)</DropdownMenuItem>
              <DropdownMenuItem onClick={exportGovReport}>تقرير المحافظات</DropdownMenuItem>
              <DropdownMenuItem onClick={exportSchoolReport}>تقرير المدارس</DropdownMenuItem>
              <DropdownMenuItem onClick={exportRevenueReport}>تقرير الإيرادات والنمو</DropdownMenuItem>
              <DropdownMenuItem onClick={exportSubscriptionsReport}>تقرير الاشتراكات</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant={showFilters || activeFiltersCount > 0 ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-1.5 relative"
          >
            <SlidersHorizontal className="h-4 w-4" />
            فلاتر التقارير
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-[10px] rounded-full mr-1">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      {showFilters && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm animate-fade-in-up" style={{ animationDuration: '0.2s' }}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label className="mb-1.5 block text-sm">الفترة الزمنية</Label>
              <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_RANGES.map((r) => (
                    <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">الصف الدراسي</Label>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الصفوف</SelectItem>
                  {grades.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => { setTimeRange("12m"); setGradeFilter("all"); }}
                >
                  <X className="h-3.5 w-3.5" />
                  مسح الفلاتر
                </Button>
              )}
            </div>
          </div>
          {activeFiltersCount > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {timeRange !== "12m" && (
                <Badge variant="outline" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  {TIME_RANGES.find((r) => r.key === timeRange)?.label}
                </Badge>
              )}
              {gradeFilter !== "all" && (
                <Badge variant="outline" className="gap-1">
                  <GraduationCap className="h-3 w-3" />
                  {grades.find((g) => g.id === gradeFilter)?.name}
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                {totalStudents} طالب مطابق
              </Badge>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={DollarSign} label="إجمالي الإيرادات" value={`${totalRevenue.toLocaleString("ar-YE")} ر.ي`} color="text-accent" bg="bg-accent/10" />
        <SummaryCard icon={Users} label="عدد الطلاب" value={totalStudents} color="text-primary" bg="bg-primary/10" />
        <SummaryCard icon={BookOpen} label="إجمالي المحتوى" value={totalContent} color="text-success" bg="bg-success/10" />
        <SummaryCard icon={MapPin} label="محافظات مسجلة" value={govWithData} color="text-destructive" bg="bg-destructive/10" />
      </div>

      {/* Governorate Distribution */}
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="توزيع الطلاب حسب المحافظة" icon={<MapPin className="h-4 w-4 text-primary" />}>
          {govData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={govData} layout="vertical" margin={{ right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                <Tooltip formatter={(v: number) => [`${v} طالب`, "العدد"]} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} name="عدد الطلاب">
                  {govData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">لا توجد بيانات</p>
          )}
        </ChartCard>

        <ChartCard title="نسب المحافظات" icon={<MapPin className="h-4 w-4 text-accent" />}>
          {govData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={govData.filter((g) => g.name !== "غير محدد").slice(0, 10)}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={100}
                  dataKey="count"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ strokeWidth: 1 }}
                >
                  {govData.slice(0, 10).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v} طالب`, "العدد"]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">لا توجد بيانات</p>
          )}
        </ChartCard>
      </div>

      {/* Top Schools */}
      {schoolData.length > 0 && (
        <ChartCard title="أكثر المدارس تسجيلاً (أفضل 15)" icon={<School className="h-4 w-4 text-success" />}>
          <ResponsiveContainer width="100%" height={Math.max(280, schoolData.length * 36)}>
            <BarChart data={schoolData} layout="vertical" margin={{ right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
              <Tooltip
                formatter={(v: number) => [`${v} طالب`, "العدد"]}
                labelFormatter={(label) => {
                  const s = schoolData.find((d) => d.name === label);
                  return s ? `${label} — ${s.governorate}` : label;
                }}
              />
              <Bar dataKey="count" fill="hsl(var(--success))" radius={[0, 6, 6, 0]} name="عدد الطلاب" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

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
