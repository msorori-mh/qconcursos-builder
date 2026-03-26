import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CalendarDays, Save, Trash2, Plus } from "lucide-react";

const DAYS = [
  { key: 0, label: "الأحد" },
  { key: 1, label: "الاثنين" },
  { key: 2, label: "الثلاثاء" },
  { key: 3, label: "الأربعاء" },
  { key: 4, label: "الخميس" },
];

const MAX_PERIODS = 8;

interface ScheduleCell {
  subject_name: string;
  id?: string;
}

type ScheduleGrid = Record<number, Record<number, ScheduleCell>>;

const SchedulePage = () => {
  const { user } = useAuth();
  const [grid, setGrid] = useState<ScheduleGrid>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [periodsCount, setPeriodsCount] = useState(6);

  const loadSchedule = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("weekly_schedule")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const newGrid: ScheduleGrid = {};
    let maxPeriod = 6;
    (data as any[]).forEach((row) => {
      if (!newGrid[row.day_of_week]) newGrid[row.day_of_week] = {};
      newGrid[row.day_of_week][row.period_number] = {
        subject_name: row.subject_name,
        id: row.id,
      };
      if (row.period_number > maxPeriod) maxPeriod = row.period_number;
    });
    setGrid(newGrid);
    setPeriodsCount(Math.max(6, maxPeriod));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const updateCell = (day: number, period: number, value: string) => {
    setGrid((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [period]: { ...prev[day]?.[period], subject_name: value },
      },
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      // Delete all existing
      await supabase.from("weekly_schedule").delete().eq("user_id", user.id);

      // Collect non-empty cells
      const rows: { user_id: string; day_of_week: number; period_number: number; subject_name: string }[] = [];
      for (const day of DAYS) {
        for (let p = 1; p <= periodsCount; p++) {
          const cell = grid[day.key]?.[p];
          if (cell?.subject_name?.trim()) {
            rows.push({
              user_id: user.id,
              day_of_week: day.key,
              period_number: p,
              subject_name: cell.subject_name.trim(),
            });
          }
        }
      }

      if (rows.length > 0) {
        const { error } = await supabase.from("weekly_schedule").insert(rows);
        if (error) throw error;
      }

      toast.success("تم حفظ الجدول بنجاح");
    } catch (err: any) {
      console.error(err);
      toast.error("حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const clearAll = () => {
    setGrid({});
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <CalendarDays className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">جدول الحصص الأسبوعي</h1>
              <p className="text-sm text-muted-foreground">أدخل مواد حصصك لكل يوم ليساعدك المساعد الذكي في المراجعة</p>
            </div>
          </div>
          <div className="flex gap-2">
            {periodsCount < MAX_PERIODS && (
              <Button variant="outline" size="sm" onClick={() => setPeriodsCount((p) => Math.min(p + 1, MAX_PERIODS))}>
                <Plus className="h-4 w-4 ml-1" />
                حصة إضافية
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={clearAll}>
              <Trash2 className="h-4 w-4 ml-1" />
              مسح الكل
            </Button>
            <Button variant="hero" size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 ml-1" />
              {saving ? "جارٍ الحفظ..." : "حفظ الجدول"}
            </Button>
          </div>
        </div>

        {/* Schedule Grid */}
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground w-24">
                  الحصة
                </th>
                {DAYS.map((day) => (
                  <th key={day.key} className="px-3 py-3 text-center text-sm font-semibold text-foreground">
                    {day.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: periodsCount }, (_, i) => i + 1).map((period) => (
                <tr key={period} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2 text-center">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {period}
                    </span>
                  </td>
                  {DAYS.map((day) => (
                    <td key={day.key} className="px-2 py-2">
                      <Input
                        value={grid[day.key]?.[period]?.subject_name || ""}
                        onChange={(e) => updateCell(day.key, period, e.target.value)}
                        placeholder="اسم المادة"
                        className="text-center text-sm h-9"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-muted-foreground text-center">
          💡 أدخل أسماء المواد كما تُدرَّس في يومك الدراسي، وسيقوم المساعد الذكي بمساعدتك في المراجعة لاحقاً
        </p>
      </div>
    </div>
  );
};

export default SchedulePage;
