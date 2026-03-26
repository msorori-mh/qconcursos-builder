import Navbar from "@/components/Navbar";
import SEOHead from "@/components/SEOHead";
import AiTutorChat from "@/components/AiTutorChat";

const AiTutorPage = () => {
  return (
    <>
      <SEOHead title="المساعد الذكي | تنوير" description="مساعد ذكي يساعدك في فهم دروسك" />
      <Navbar />
      <div className="container mx-auto max-w-3xl px-4 py-6" dir="rtl">
        <AiTutorChat />
      </div>
    </>
  );
};

export default AiTutorPage;
