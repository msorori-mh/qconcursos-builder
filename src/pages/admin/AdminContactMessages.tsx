import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, MailOpen, Eye, Trash2, Search, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PaginationControls from "@/components/admin/PaginationControls";

interface ContactMessage {
  id: string;
  full_name: string;
  email: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const PAGE_SIZE = 15;

const AdminContactMessages = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<ContactMessage | null>(null);

  useEffect(() => {
    loadMessages();
  }, [page, filter]);

  const loadMessages = async () => {
    setLoading(true);
    let query = supabase
      .from("contact_submissions")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (filter === "unread") query = query.eq("is_read", false);
    if (filter === "read") query = query.eq("is_read", true);

    const { data, count } = await query;
    setMessages((data as ContactMessage[]) || []);
    setTotal(count || 0);
    setLoading(false);
  };

  const toggleRead = async (msg: ContactMessage) => {
    const newVal = !msg.is_read;
    await supabase.from("contact_submissions").update({ is_read: newVal }).eq("id", msg.id);
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, is_read: newVal } : m)));
    if (selected?.id === msg.id) setSelected({ ...msg, is_read: newVal });
  };

  const deleteMessage = async (id: string) => {
    const { error } = await supabase.from("contact_submissions").delete().eq("id", id);
    if (error) {
      toast({ title: "خطأ في الحذف", description: error.message, variant: "destructive" });
      return;
    }
    setMessages((prev) => prev.filter((m) => m.id !== id));
    setTotal((t) => t - 1);
    if (selected?.id === id) setSelected(null);
    toast({ title: "تم حذف الرسالة" });
  };

  const openMessage = async (msg: ContactMessage) => {
    setSelected(msg);
    if (!msg.is_read) {
      await supabase.from("contact_submissions").update({ is_read: true }).eq("id", msg.id);
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, is_read: true } : m)));
    }
  };

  const filtered = search
    ? messages.filter(
        (m) =>
          m.full_name.toLowerCase().includes(search.toLowerCase()) ||
          m.email.toLowerCase().includes(search.toLowerCase()) ||
          m.subject.toLowerCase().includes(search.toLowerCase())
      )
    : messages;

  const unreadCount = messages.filter((m) => !m.is_read).length;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Inbox className="h-5 w-5 text-primary" />
          رسائل التواصل
          {unreadCount > 0 && (
            <span className="rounded-full bg-destructive px-2 py-0.5 text-[11px] font-bold text-destructive-foreground">
              {unreadCount} جديدة
            </span>
          )}
        </h1>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو البريد أو الموضوع..."
            className="pr-9"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "unread", "read"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => { setFilter(f); setPage(1); }}
            >
              {f === "all" ? "الكل" : f === "unread" ? "غير مقروءة" : "مقروءة"}
            </Button>
          ))}
        </div>
      </div>

      {/* Messages list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
          <Mail className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-muted-foreground">لا توجد رسائل</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((msg) => (
            <div
              key={msg.id}
              onClick={() => openMessage(msg)}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/50 ${
                msg.is_read ? "border-border bg-card" : "border-primary/20 bg-primary/5"
              }`}
            >
              <div className="shrink-0">
                {msg.is_read ? (
                  <MailOpen className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Mail className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={`text-sm truncate ${msg.is_read ? "text-card-foreground" : "font-bold text-card-foreground"}`}>
                    {msg.full_name}
                  </p>
                  {!msg.is_read && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
                <p className={`text-xs truncate ${msg.is_read ? "text-muted-foreground" : "font-medium text-card-foreground"}`}>
                  {msg.subject}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{msg.message}</p>
              </div>
              <div className="shrink-0 text-left">
                <p className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {new Date(msg.created_at).toLocaleDateString("ar-YE")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      {/* Message detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-right">{selected.subject}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-foreground">{selected.full_name}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">{selected.email}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(selected.created_at).toLocaleString("ar-YE")}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/50 p-4 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {selected.message}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => toggleRead(selected)}
                  >
                    {selected.is_read ? <Mail className="h-3.5 w-3.5" /> : <MailOpen className="h-3.5 w-3.5" />}
                    {selected.is_read ? "تمييز كغير مقروءة" : "تمييز كمقروءة"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1.5"
                    onClick={() => deleteMessage(selected.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    حذف
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminContactMessages;
