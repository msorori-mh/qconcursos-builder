import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, Send, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

interface AiTutorChatProps {
  lessonContext?: {
    lessonTitle: string;
    subjectName?: string;
    lessonContent?: string;
  };
  inline?: boolean;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`;

const TUTOR_CONFIG = {
  subtitle: "مساعدك الذكي في الدراسة",
  welcome: "مرحباً! أنا تنوير AI 🤖",
  welcomeSub: "اسألني أي سؤال عن دروسك وسأساعدك",
  suggestions: ["ساعدني في فهم الرياضيات", "اشرح لي قواعد اللغة العربية", "كيف أراجع قبل الامتحان؟"],
};

const AiTutorChat = ({ lessonContext, inline }: AiTutorChatProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const config = lessonContext
    ? { ...TUTOR_CONFIG, suggestions: ["اشرح لي هذا الدرس ببساطة", "أعطني أمثلة عملية", "ما أهم النقاط في الدرس؟"] }
    : TUTOR_CONFIG;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);


  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    setError(null);
    const userMsg: Msg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    let assistantSoFar = "";
    const allMessages = [...messages, userMsg];

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
          context: lessonContext || undefined,
          mode: "tutor",
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `خطأ ${resp.status}`);
      }

      if (!resp.body) throw new Error("No stream body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e: any) {
      console.error("AI chat error:", e);
      setError(e.message || "حدث خطأ في الاتصال");
      toast({ title: "خطأ", description: e.message || "حدث خطأ", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, lessonContext, toast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const containerClass = inline
    ? "flex flex-col h-[500px] rounded-2xl border border-border bg-card shadow-card overflow-hidden"
    : "flex flex-col h-[calc(100vh-12rem)] max-h-[700px] rounded-2xl border border-border bg-card shadow-card overflow-hidden";

  

  return (
    <div className={containerClass} dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-primary/5 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-hero-gradient">
          <Bot className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-foreground">تنوير AI</h3>
          <p className="text-[11px] text-muted-foreground">{config.subtitle}</p>
        </div>
        {lessonContext && (
          <span className="mr-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary">
            {lessonContext.lessonTitle}
          </span>
        )}
      </div>


      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground">{config.welcome}</p>
              <p className="mt-1 text-sm text-muted-foreground">{config.welcomeSub}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {config.suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary hover:border-primary/30"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-primary/10"
            }`}>
              {msg.role === "user" ? (
                <span className="text-xs font-bold">أنت</span>
              ) : (
                <Bot className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-tr-none"
                : "bg-muted text-foreground rounded-tl-none"
            }`}>
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="rounded-2xl rounded-tl-none bg-muted px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="اكتب سؤالك هنا..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary placeholder:text-muted-foreground"
            disabled={isLoading}
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="h-10 w-10 shrink-0 rounded-xl"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AiTutorChat;
