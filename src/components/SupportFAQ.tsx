import { Headphones, MessageCircleQuestion } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_ITEMS = [
  {
    q: "كيف أشترك في المنصة؟",
    a: "اذهب إلى صفحة الاشتراك من القائمة الرئيسية، اختر الخطة المناسبة، ثم أكمل عملية الدفع عبر إحدى وسائل الدفع المتاحة. سيتم تفعيل اشتراكك بعد مراجعة الإدارة.",
  },
  {
    q: "لا أستطيع تسجيل الدخول، ماذا أفعل؟",
    a: "تأكد من صحة البريد الإلكتروني وكلمة المرور. إذا نسيت كلمة المرور، اضغط على \"نسيت كلمة المرور\" لإعادة تعيينها عبر بريدك الإلكتروني. إذا استمرت المشكلة، تواصل معنا عبر صفحة اتصل بنا.",
  },
  {
    q: "كيف أشاهد الدروس؟",
    a: "بعد تسجيل الدخول، اذهب إلى صفحة المواد الدراسية، اختر المادة ثم الدرس المطلوب. الدروس المجانية متاحة للجميع، أما بقية الدروس فتتطلب اشتراكاً فعالاً.",
  },
  {
    q: "هل يمكنني تغيير الصف الدراسي؟",
    a: "نعم، اذهب إلى صفحة الملف الشخصي واضغط على تعديل البيانات، ثم اختر الصف الدراسي الجديد. ستتغير المواد والدروس المعروضة تلقائياً.",
  },
  {
    q: "كيف أحصل على الشهادات؟",
    a: "أكمل جميع دروس المادة واجتز الاختبارات بنجاح. ستظهر الشهادة تلقائياً في صفحة الإنجازات ويمكنك تحميلها.",
  },
  {
    q: "ما هي وسائل الدفع المتاحة؟",
    a: "نوفر عدة وسائل دفع تشمل التحويل البنكي والمحافظ الإلكترونية. يمكنك الاطلاع على التفاصيل الكاملة في صفحة الاشتراك.",
  },
  {
    q: "هل يمكنني استخدام المنصة على الهاتف؟",
    a: "نعم، المنصة مصممة لتعمل بشكل كامل على الهواتف الذكية والأجهزة اللوحية عبر المتصفح. يمكنك أيضاً تثبيتها كتطبيق من صفحة التثبيت.",
  },
  {
    q: "كيف أتواصل مع الإدارة؟",
    a: "اذهب إلى صفحة \"اتصل بنا\" من القائمة الرئيسية واملأ نموذج التواصل. سيتم الرد عليك في أقرب وقت ممكن عبر البريد الإلكتروني.",
  },
  {
    q: "ماذا أفعل إذا لم يعمل الفيديو؟",
    a: "تأكد من اتصالك بالإنترنت وجرب تحديث الصفحة. إذا استمرت المشكلة، جرب متصفحاً آخر أو امسح ذاكرة التخزين المؤقت. يمكنك أيضاً التواصل معنا.",
  },
  {
    q: "هل يمكن لولي الأمر متابعة تقدم الطالب؟",
    a: "نعم، يمكن للطالب إضافة بريد ولي الأمر في الملف الشخصي، وسيتم إرسال تقارير دورية عن تقدم الطالب.",
  },
];

const SupportFAQ = () => {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-primary/5 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-hero-gradient">
          <Headphones className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">الأسئلة الشائعة - الدعم الفني</h3>
          <p className="text-[11px] text-muted-foreground">إجابات سريعة لأكثر الأسئلة شيوعاً</p>
        </div>
      </div>

      {/* FAQ List */}
      <div className="p-4">
        <Accordion type="single" collapsible className="w-full">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border-border">
              <AccordionTrigger className="text-sm text-right gap-2 hover:no-underline hover:text-primary [&>svg]:ml-2 [&>svg]:mr-0">
                <span className="flex items-center gap-2">
                  <MessageCircleQuestion className="h-4 w-4 shrink-0 text-primary" />
                  {item.q}
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pr-6">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-4 rounded-xl bg-muted/50 p-3 text-center">
          <p className="text-xs text-muted-foreground">
            لم تجد إجابة لسؤالك؟{" "}
            <a href="/contact" className="text-primary font-medium hover:underline">
              تواصل معنا
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SupportFAQ;
