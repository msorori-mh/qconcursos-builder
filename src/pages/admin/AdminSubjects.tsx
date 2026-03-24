import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

interface Subject {
  id: string;
  name: string;
  slug: string;
  grade_id: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
  lessons_count: number | null;
  grades?: { name: string };
}

interface Grade { id: string; name: string; }

const AdminSubjects = () => {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", grade_id: "", icon: "BookOpen", color: "#3b82f6", sort_order: 0, lessons_count: 0 });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [{ data: subData }, { data: gradeData }] = await Promise.all([
      supabase.from("subjects").select("*, grades(name)").order("sort_order"),
      supabase.from("grades").select("id, name").order("sort_order"),
    ]);
    if (subData) setSubjects(subData as any);
    if (gradeData) setGrades(gradeData);
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", slug: "", grade_id: grades[0]?.id || "", icon: "BookOpen", color: "#3b82f6", sort_order: 0, lessons_count: 0 });
    setDialogOpen(true);
  };

  const openEdit = (s: Subject) => {
    setEditing(s);
    setForm({ name: s.name, slug: s.slug, grade_id: s.grade_id, icon: s.icon || "BookOpen", color: s.color || "#3b82f6", sort_order: s.sort_order, lessons_count: s.lessons_count || 0 });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name || !form.slug || !form.grade_id) {
      toast({ title: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }
    const payload = { ...form };
    if (editing) {
      const { error } = await supabase.from("subjects").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("subjects").insert(payload);
      if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: editing ? "تم التعديل" : "تمت الإضافة" });
    setDialogOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    toast({ title: "تم الحذف" });
    load();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">إدارة المواد</h1>
        <Button variant="hero" size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" /> إضافة مادة
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : subjects.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
          <p className="text-muted-foreground">لا توجد مواد بعد. أضف صفوفاً أولاً ثم أضف المواد.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subjects.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl" style={{ backgroundColor: (s.color || "#3b82f6") + "20" }}>
                  <div className="flex h-full w-full items-center justify-center text-lg">📘</div>
                </div>
                <div>
                  <h3 className="font-semibold text-card-foreground">{s.name}</h3>
                  <p className="text-sm text-muted-foreground">{(s as any).grades?.name} • {s.lessons_count || 0} درس</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل المادة" : "إضافة مادة جديدة"}</DialogTitle>
            <DialogDescription>أدخل بيانات المادة الدراسية</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">الصف</label>
              <select value={form.grade_id} onChange={(e) => setForm({ ...form, grade_id: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">اسم المادة</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="الرياضيات" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">الرابط (slug)</label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="math" dir="ltr" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">اللون</label>
                <Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">الترتيب</label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: +e.target.value })} />
              </div>
            </div>
            <Button variant="hero" className="w-full" onClick={save}>{editing ? "حفظ" : "إضافة"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSubjects;
