import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import PaginationControls from "@/components/admin/PaginationControls";

interface Lesson {
  id: string;
  title: string;
  slug: string;
  subject_id: string;
  duration: string | null;
  is_free: boolean | null;
  video_url: string | null;
  content_text: string | null;
  content_pdf_url: string | null;
  sort_order: number;
  subjects?: { name: string; grades?: { name: string } };
}

interface Subject { id: string; name: string; grade_id: string; grades?: { name: string } }

const PAGE_SIZE = 20;

const emptyForm = {
  title: "", slug: "", subject_id: "", duration: "", is_free: true,
  video_url: "", content_text: "", content_pdf_url: "", sort_order: 0,
};

const AdminLessons = () => {
  const { toast } = useToast();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filterSubject, setFilterSubject] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => { loadSubjects(); }, []);
  useEffect(() => { loadLessons(); }, [page, filterSubject]);

  const loadSubjects = async () => {
    const { data } = await supabase.from("subjects").select("id, name, grade_id, grades(name)").order("sort_order");
    if (data) setSubjects(data as any);
  };

  const loadLessons = async () => {
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("lessons")
      .select("*, subjects(name, grades(name))", { count: "exact" })
      .order("sort_order")
      .range(from, to);

    if (filterSubject) query = query.eq("subject_id", filterSubject);

    const { data, count } = await query;
    if (data) setLessons(data as any);
    setTotalCount(count || 0);
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, subject_id: filterSubject || subjects[0]?.id || "" });
    setDialogOpen(true);
  };

  const openEdit = (l: Lesson) => {
    setEditing(l);
    setForm({
      title: l.title, slug: l.slug, subject_id: l.subject_id,
      duration: l.duration || "", is_free: l.is_free ?? true,
      video_url: l.video_url || "", content_text: l.content_text || "",
      content_pdf_url: l.content_pdf_url || "", sort_order: l.sort_order,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.title || !form.slug || !form.subject_id) {
      toast({ title: "يرجى ملء الحقول المطلوبة", variant: "destructive" });
      return;
    }
    const payload = {
      title: form.title, slug: form.slug, subject_id: form.subject_id,
      duration: form.duration || null, is_free: form.is_free,
      video_url: form.video_url || null, content_text: form.content_text || null,
      content_pdf_url: form.content_pdf_url || null, sort_order: form.sort_order,
    };
    if (editing) {
      const { error } = await supabase.from("lessons").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("lessons").insert(payload);
      if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: editing ? "تم التعديل" : "تمت الإضافة" });
    setDialogOpen(false);
    loadLessons();
  };

  const remove = async (id: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    toast({ title: "تم الحذف" });
    loadLessons();
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">إدارة الدروس</h1>
          <p className="text-sm text-muted-foreground">{totalCount} درس</p>
        </div>
        <Button variant="hero" size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" /> إضافة درس
        </Button>
      </div>

      <div className="mb-4">
        <select value={filterSubject} onChange={(e) => { setFilterSubject(e.target.value); setPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">كل المواد</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{(s as any).grades?.name} — {s.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : lessons.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
          <p className="text-muted-foreground">لا توجد دروس</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {lessons.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-card">
                <div>
                  <h3 className="font-semibold text-card-foreground">{l.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {(l as any).subjects?.grades?.name} — {(l as any).subjects?.name}
                    {l.duration && ` • ${l.duration}`}
                    {l.is_free ? " • مجاني" : " • مدفوع"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => openEdit(l)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" onClick={() => remove(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
          <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} totalCount={totalCount} pageSize={PAGE_SIZE} />
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل الدرس" : "إضافة درس جديد"}</DialogTitle>
            <DialogDescription>أدخل بيانات الدرس</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">المادة</label>
              <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {subjects.map((s) => <option key={s.id} value={s.id}>{(s as any).grades?.name} — {s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">عنوان الدرس</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">الرابط (slug)</label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} dir="ltr" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">المدة</label>
                <Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="15 دقيقة" />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input type="checkbox" checked={form.is_free as boolean} onChange={(e) => setForm({ ...form, is_free: e.target.checked })}
                    className="h-4 w-4 rounded border-input" />
                  مجاني
                </label>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">رابط الفيديو</label>
              <Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} dir="ltr" placeholder="https://..." />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">رابط PDF</label>
              <Input value={form.content_pdf_url} onChange={(e) => setForm({ ...form, content_pdf_url: e.target.value })} dir="ltr" placeholder="https://..." />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">محتوى نصي</label>
              <textarea value={form.content_text} onChange={(e) => setForm({ ...form, content_text: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">الترتيب</label>
              <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: +e.target.value })} />
            </div>
            <Button variant="hero" className="w-full" onClick={save}>{editing ? "حفظ" : "إضافة"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLessons;
