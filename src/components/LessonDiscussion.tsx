import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageCircle, Send, Reply, Trash2, Pin, MoreVertical,
  ChevronDown, ChevronUp, User,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Comment {
  id: string;
  lesson_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  is_pinned: boolean;
  created_at: string;
  profile?: { full_name: string | null; avatar_url: string | null };
  replies?: Comment[];
}

const CommentItem = ({
  comment,
  onReply,
  onDelete,
  onPin,
  isAdmin,
  currentUserId,
  depth = 0,
}: {
  comment: Comment;
  onReply: (id: string) => void;
  onDelete: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  isAdmin: boolean;
  currentUserId?: string;
  depth?: number;
}) => {
  const [showReplies, setShowReplies] = useState(true);
  const isOwn = currentUserId === comment.user_id;
  const hasReplies = comment.replies && comment.replies.length > 0;

  return (
    <div className={`${depth > 0 ? "mr-6 sm:mr-10 border-r-2 border-border pr-4" : ""}`}>
      <div className={`rounded-xl p-4 ${comment.is_pinned ? "bg-primary/5 border border-primary/20" : "bg-card border border-border"}`}>
        {comment.is_pinned && (
          <div className="flex items-center gap-1 text-xs text-primary font-medium mb-2">
            <Pin className="h-3 w-3" />
            تعليق مثبّت
          </div>
        )}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {comment.profile?.full_name || "طالب"}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ar })}
              </p>
            </div>
          </div>

          {(isOwn || isAdmin) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {isAdmin && (
                  <DropdownMenuItem onClick={() => onPin(comment.id, !comment.is_pinned)}>
                    <Pin className="h-4 w-4 ml-2" />
                    {comment.is_pinned ? "إلغاء التثبيت" : "تثبيت"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="text-destructive" onClick={() => onDelete(comment.id)}>
                  <Trash2 className="h-4 w-4 ml-2" />
                  حذف
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{comment.content}</p>

        <div className="flex items-center gap-3 mt-3">
          {depth === 0 && (
            <button
              onClick={() => onReply(comment.id)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Reply className="h-3.5 w-3.5" />
              رد
            </button>
          )}
          {hasReplies && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {showReplies ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {comment.replies!.length} رد
            </button>
          )}
        </div>
      </div>

      {hasReplies && showReplies && (
        <div className="mt-2 space-y-2">
          {comment.replies!.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onDelete={onDelete}
              onPin={onPin}
              isAdmin={isAdmin}
              currentUserId={currentUserId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const LessonDiscussion = ({ lessonId }: { lessonId: string }) => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["lesson-comments", lessonId],
    queryFn: async () => {
      // Fetch comments
      const { data: commentsData, error } = await supabase
        .from("lesson_comments")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Fetch profiles for all unique user_ids
      const userIds = [...new Set((commentsData || []).map((c: any) => c.user_id))];
      const { data: profiles } = userIds.length > 0
        ? await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds)
        : { data: [] };

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      // Build tree
      const all = (commentsData || []).map((c: any) => ({
        ...c,
        profile: profileMap.get(c.user_id) || null,
        replies: [] as Comment[],
      }));

      const roots: Comment[] = [];
      const map = new Map<string, Comment>();
      all.forEach((c: Comment) => map.set(c.id, c));
      all.forEach((c: Comment) => {
        if (c.parent_id && map.has(c.parent_id)) {
          map.get(c.parent_id)!.replies!.push(c);
        } else {
          roots.push(c);
        }
      });

      return roots;
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`comments-${lessonId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "lesson_comments", filter: `lesson_id=eq.${lessonId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["lesson-comments", lessonId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [lessonId, queryClient]);

  const addComment = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      const { error } = await supabase.from("lesson_comments").insert({
        lesson_id: lessonId,
        user_id: user!.id,
        content: content.trim(),
        parent_id: parentId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-comments", lessonId] });
      setNewComment("");
      setReplyTo(null);
      setReplyText("");
    },
    onError: () => toast({ title: "خطأ", description: "فشل إرسال التعليق", variant: "destructive" }),
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lesson_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-comments", lessonId] });
      toast({ title: "تم حذف التعليق" });
    },
  });

  const pinComment = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const { error } = await supabase.from("lesson_comments").update({ is_pinned: pinned }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lesson-comments", lessonId] }),
  });

  const totalComments = comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-card">
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-card-foreground">النقاش ({totalComments})</h2>
      </div>

      {/* New comment form */}
      {user && (
        <div className="mb-6">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="شاركنا رأيك أو اطرح سؤالاً..."
            className="min-h-[80px] resize-none text-sm"
            maxLength={1000}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-muted-foreground">{newComment.length}/1000</span>
            <Button
              size="sm"
              className="gap-1.5"
              disabled={!newComment.trim() || addComment.isPending}
              onClick={() => addComment.mutate({ content: newComment })}
            >
              <Send className="h-3.5 w-3.5" />
              {addComment.isPending ? "جاري الإرسال..." : "إرسال"}
            </Button>
          </div>
        </div>
      )}

      {/* Comments list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-10">
          <MessageCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm">لا توجد تعليقات بعد. كن أول من يشارك!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                onReply={(id) => { setReplyTo(id); setReplyText(""); }}
                onDelete={(id) => deleteComment.mutate(id)}
                onPin={(id, pinned) => pinComment.mutate({ id, pinned })}
                isAdmin={isAdmin}
                currentUserId={user?.id}
              />
              {/* Reply form */}
              {replyTo === comment.id && user && (
                <div className="mr-6 sm:mr-10 mt-2 border-r-2 border-primary/30 pr-4">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="اكتب ردك..."
                    className="min-h-[60px] resize-none text-sm"
                    maxLength={500}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setReplyTo(null)}>إلغاء</Button>
                    <Button
                      size="sm"
                      className="gap-1"
                      disabled={!replyText.trim() || addComment.isPending}
                      onClick={() => addComment.mutate({ content: replyText, parentId: comment.id })}
                    >
                      <Reply className="h-3.5 w-3.5" />
                      رد
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LessonDiscussion;
