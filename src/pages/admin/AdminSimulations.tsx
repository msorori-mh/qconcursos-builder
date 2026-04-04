import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

interface Grade { id: string; name: string }
interface Subject { id: string; name: string; grade_id: string }
interface Lesson { id: string; title: string; subject_id: string }
interface Simulation {
  id: string;
  lesson_id: string;
  title: string;
  description: string | null;
  phet_url: string;
  thumbnail_url: string | null;
  sort_order: number;
  lessons?: { title: string; subjects?: { name: string; grades?: { name: string } } };
}

const emptyForm = {
  lesson_id: "",
  title: "",
  description: "",
  phet_url: "",
  thumbnail_url: "",
  sort_order: 0,
};

const AdminSimulations = () => {
  const { toast } = useToast();
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Simulation | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Filters
  const [filterGrade, setFilterGrade] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterLesson, setFilterLesson] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: g }, { data: s }, { data: sims }] = await Promise.all([
      supabase.from("grades").select("id, name").order("sort_order"),
      supabase.from("subjects").select("id, name, grade_id").order("sort_order"),
      supabase.from("lesson_simulations").select("*, lessons(title, subjects(name, grades(name)))").order("sort_order"),
    ]);
    setGrades(g || []);
    setSubjects(s || []);
    setSimulations((sims as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // Fetch lessons when filter changes
  useEffect(() => {
    if (filterSubject) {
      supabase.from("lessons").select("id, title, subject_id").eq("subject_id", filterSubject).order("sort_order")
        .then(({ data }) => setLessons(data || []));
    } else {
      setLessons([]);
    }
    setFilterLesson("");
  }, [filterSubject]);

  useEffect(() => {
    setFilterSubject("");
  }, [filterGrade]);

  const filteredSubjects = filterGrade ? subjects.filter(s => s.grade_id === filterGrade) : subjects;

  const filteredSims = simulations.filter(sim => {
    if (filterLesson) return sim.lesson_id === filterLesson;
    if (filterSubject) return lessons.some(l => l.id === sim.lesson_id);
    return true;
  });

  // Form lessons (for dialog)
  const [formLessons, setFormLessons] = useState<Lesson[]>([]);
  const [formGrade, setFormGrade] = useState("");
  const [formSubject, setFormSubject] = useState("");

  useEffect(() => {
    if (formSubject) {
      supabase.from("lessons").select("id, title, subject_id").eq("subject_id", formSubject).order("sort_order")
        .then(({ data }) => setFormLessons(data || []));
    } else {
      setFormLessons([]);
    }
  }, [formSubject]);

  const formSubjects = formGrade ? subjects.filter(s => s.grade_id === formGrade) : [];

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormGrade("");
    setFormSubject("");
    setDialogOpen(true);
  };

  const openEdit = (sim: Simulation) => {
    setEditing(sim);
    setForm({
      lesson_id: sim.lesson_id,
      title: sim.title,
      description: sim.description || "",
      phet_url: sim.phet_url,
      thumbnail_url: sim.thumbnail_url || "",
      sort_order: sim.sort_order,
    });
    setFormGrade("");
    setFormSubject("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.phet_url || !form.lesson_id) {
      toast({ title: "خطأ", description: "يرجى ملء الحقول المطلوبة", variant: "destructive" });
      return;
    }

    const payload = {
      lesson_id: form.lesson_id,
      title: form.title,
      description: form.description || null,
      phet_url: form.phet_url,
      thumbnail_url: form.thumbnail_url || null,
      sort_order: form.sort_order,
    };

    if (editing) {
      const { error } = await supabase.from("lesson_simulations").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
      toast({ title: "تم التحديث" });
    } else {
      const { error } = await supabase.from("lesson_simulations").insert(payload);
      if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
      toast({ title: "تمت الإضافة" });
    }

    setDialogOpen(false);
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    await supabase.from("lesson_simulations").delete().eq("id", id);
    toast({ title: "تم الحذف" });
    fetchAll();
  };

  return (
    <div className="space-y-6" style={{ direction: "rtl" }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-primary" />
          إدارة التجارب المعملية
        </h1>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          إضافة تجربة
        </Button>
      </div>

      {/* Cascading Filters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <select
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          value={filterGrade}
          onChange={e => setFilterGrade(e.target.value)}
        >
          <option value="">كل الصفوف</option>
          {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          value={filterSubject}
          onChange={e => setFilterSubject(e.target.value)}
          disabled={!filterGrade}
        >
          <option value="">كل المواد</option>
          {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          value={filterLesson}
          onChange={e => setFilterLesson(e.target.value)}
          disabled={!filterSubject}
        >
          <option value="">كل الدروس</option>
          {lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filteredSims.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <FlaskConical className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">لا توجد تجارب معملية بعد</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-right font-medium">التجربة</th>
                <th className="px-4 py-3 text-right font-medium">الدرس</th>
                <th className="px-4 py-3 text-right font-medium">المادة</th>
                <th className="px-4 py-3 text-center font-medium">الترتيب</th>
                <th className="px-4 py-3 text-center font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredSims.map(sim => (
                <tr key={sim.id} className="bg-card hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-card-foreground">{sim.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{(sim as any).lessons?.title || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{(sim as any).lessons?.subjects?.name || "—"}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{sim.sort_order}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(sim)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(sim.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" style={{ direction: "rtl" }}>
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل التجربة" : "إضافة تجربة معملية"}</DialogTitle>
            <DialogDescription>
              {editing ? "عدّل بيانات التجربة المعملية" : "أضف تجربة PhET تفاعلية مرتبطة بدرس"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Grade → Subject → Lesson selectors */}
            {!editing && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">الصف</label>
                  <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={formGrade} onChange={e => { setFormGrade(e.target.value); setFormSubject(""); setForm(f => ({ ...f, lesson_id: "" })); }}>
                    <option value="">اختر الصف</option>
                    {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">المادة</label>
                  <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={formSubject} onChange={e => { setFormSubject(e.target.value); setForm(f => ({ ...f, lesson_id: "" })); }} disabled={!formGrade}>
                    <option value="">اختر المادة</option>
                    {formSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">الدرس *</label>
              {editing ? (
                <Input value={(editing as any).lessons?.title || editing.lesson_id} disabled />
              ) : (
                <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={form.lesson_id} onChange={e => setForm(f => ({ ...f, lesson_id: e.target.value }))} disabled={!formSubject}>
                  <option value="">اختر الدرس</option>
                  {formLessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                </select>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">اسم التجربة *</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="مثال: دائرة كهربائية بسيطة" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">رابط PhET *</label>
              <Input value={form.phet_url} onChange={e => setForm(f => ({ ...f, phet_url: e.target.value }))} placeholder="https://phet.colorado.edu/sims/html/..." dir="ltr" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">الوصف</label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="وصف مختصر للتجربة" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">الترتيب</label>
              <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? "تحديث" : "إضافة"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSimulations;
