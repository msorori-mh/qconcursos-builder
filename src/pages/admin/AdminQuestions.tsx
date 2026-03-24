import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  lesson_id: string | null;
  subject_id: string | null;
  question_type: string | null;
  sort_order: number;
  lessons?: { title: string } | null;
  subjects?: { name: string } | null;
}

interface Lesson { id: string; title: string; subjects?: { name: string; grades?: { name: string } } }
interface Subject { id: string; name: string; }

const emptyForm = {
  question_text: "", options: ["", "", "", ""], correct_index: 0,
  explanation: "", lesson_id: "", subject_id: "", question_type: "lesson", sort_order: 0,
};

const AdminQuestions = () => {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [{ data: qData }, { data: lData }, { data: sData }] = await Promise.all([
      supabase.from("questions").select("*, lessons(title), subjects(name)").order("sort_order").limit(100),
      supabase.from("lessons").select("id, title, subjects(name, grades(name))").order("sort_order"),
      supabase.from("subjects").select("id, name").order("sort_order"),
    ]);
    if (qData) setQuestions(qData as any);
    if (lData) setLessons(lData as any);
    if (sData) setSubjects(sData);
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const openEdit = (q: Question) => {
    setEditing(q);
    const opts = Array.isArray(q.options) ? q.options : ["", "", "", ""];
    while (opts.length < 4) opts.push("");
    setForm({
      question_text: q.question_text,
      options: opts as string[],
      correct_index: q.correct_index,
      explanation: q.explanation || "",
      lesson_id: q.lesson_id || "",
      subject_id: q.subject_id || "",
      question_type: q.question_type || "lesson",
      sort_order: q.sort_order,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.question_text || form.options.filter(Boolean).length < 2) {
      toast({ title: "يرجى ملء السؤال وخيارين على الأقل", variant: "destructive" });
      return;
    }
    const filteredOptions = form.options.filter(Boolean);
    const payload = {
      question_text: form.question_text,
      options: filteredOptions,
      correct_index: form.correct_index,
      explanation: form.explanation || null,
      lesson_id: form.lesson_id || null,
      subject_id: form.subject_id || null,
      question_type: form.question_type,
      sort_order: form.sort_order,
    };
    if (editing) {
      const { error } = await supabase.from("questions").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("questions").insert(payload);
      if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: editing ? "تم التعديل" : "تمت الإضافة" });
    setDialogOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف السؤال؟")) return;
    await supabase.from("questions").delete().eq("id", id);
    toast({ title: "تم الحذف" });
    load();
  };

  const updateOption = (index: number, value: string) => {
    const opts = [...form.options];
    opts[index] = value;
    setForm({ ...form, options: opts });
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">إدارة الأسئلة</h1>
        <Button variant="hero" size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" /> إضافة سؤال
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : questions.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
          <p className="text-muted-foreground">لا توجد أسئلة بعد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q.id} className="flex items-start justify-between rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-card-foreground line-clamp-2">{q.question_text}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {q.lessons?.title || q.subjects?.name || "عام"}
                  {" • "}{(q.options as string[]).length} خيارات
                </p>
              </div>
              <div className="flex gap-2 mr-3">
                <Button variant="outline" size="icon" onClick={() => openEdit(q)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => remove(q.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل السؤال" : "إضافة سؤال"}</DialogTitle>
            <DialogDescription>أدخل بيانات السؤال</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">نص السؤال</label>
              <textarea value={form.question_text} onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">الخيارات</label>
              {form.options.map((opt, i) => (
                <div key={i} className="mb-2 flex items-center gap-2">
                  <input type="radio" name="correct" checked={form.correct_index === i}
                    onChange={() => setForm({ ...form, correct_index: i })}
                    className="h-4 w-4 accent-primary" />
                  <Input value={opt} onChange={(e) => updateOption(i, e.target.value)} placeholder={`الخيار ${i + 1}`} />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">حدد الإجابة الصحيحة بالنقر على الدائرة</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">الشرح (اختياري)</label>
              <textarea value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">الدرس</label>
                <select value={form.lesson_id} onChange={(e) => setForm({ ...form, lesson_id: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">بدون درس</option>
                  {lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">المادة</label>
                <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">بدون مادة</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <Button variant="hero" className="w-full" onClick={save}>{editing ? "حفظ" : "إضافة"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminQuestions;
