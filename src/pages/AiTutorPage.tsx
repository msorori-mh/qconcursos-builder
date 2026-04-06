import { useState } from "react";
import { GraduationCap, Headphones } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEOHead from "@/components/SEOHead";
import AiTutorChat from "@/components/AiTutorChat";
import SupportFAQ from "@/components/SupportFAQ";

type PageTab = "tutor" | "faq";

const AiTutorPage = () => {
  const [tab, setTab] = useState<PageTab>("tutor");

  return (
    <>
      <SEOHead title="المساعد الذكي | تنوير" description="مساعد ذكي يساعدك في فهم دروسك" />
      <Navbar />
      <div className="container mx-auto max-w-3xl px-4 py-6" dir="rtl">
        {/* Tab Switcher */}
        <div className="flex gap-2 mb-4">
          {([
            { key: "tutor" as PageTab, label: "المساعد التعليمي", Icon: GraduationCap },
            { key: "faq" as PageTab, label: "الدعم الفني", Icon: Headphones },
          ]).map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                tab === key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === "tutor" ? <AiTutorChat /> : <SupportFAQ />}
      </div>
    </>
  );
};

export default AiTutorPage;
