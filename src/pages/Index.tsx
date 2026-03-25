import Navbar from "@/components/Navbar";
import LandingPage from "@/components/LandingPage";
import SEOHead, { websiteJsonLd, educationalOrgJsonLd } from "@/components/SEOHead";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="مَسار — منصة تعليمية لطلاب اليمن"
        description="منصة مَسار التعليمية تقدم شروحات فيديو ودروس تفاعلية واختبارات لطلاب المرحلة الإعدادية والثانوية في اليمن. ابدأ رحلتك التعليمية الآن!"
        canonical="/"
        jsonLd={{ "@context": "https://schema.org", "@graph": [websiteJsonLd(), educationalOrgJsonLd()] }}
      />
      <Navbar />
      <LandingPage />
    </div>
  );
};

export default Index;
