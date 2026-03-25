import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Mail, Phone, MapPin, Send, CheckCircle } from "lucide-react";
import SEOHead from "@/components/SEOHead";

const ContactPage = () => {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      toast({ title: "خطأ", description: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const id = crypto.randomUUID();
      const { error } = await supabase.from("contact_submissions" as any).insert({ ...formData, id } as any);
      if (error) throw error;
      setSubmitted(true);
      toast({ title: "تم الإرسال", description: "شكراً لتواصلك معنا، سنرد عليك قريباً" });
    } catch {
      toast({ title: "خطأ", description: "حدث خطأ أثناء الإرسال، يرجى المحاولة لاحقاً", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <SEOHead
        title="تواصل معنا"
        description="تواصل مع فريق منصة تنوير التعليمية. نحن هنا لمساعدتك والإجابة على استفساراتك."
        canonical="/contact"
      />
      <Navbar />
      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-5xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">تواصل معنا</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            نسعد بتواصلك معنا! أرسل لنا رسالتك وسنرد عليك في أقرب وقت ممكن
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 md:gap-8">
          {/* Contact Info */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:grid-cols-1 md:space-y-6 md:gap-0">
            <Card className="border-primary/20">
              <CardContent className="p-6 flex items-start gap-4">
                <div className="rounded-full bg-primary/10 p-3 shrink-0">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">البريد الإلكتروني</h3>
                  <p className="text-sm text-muted-foreground">support@studentamkeen.com</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-primary/20">
              <CardContent className="p-6 flex items-start gap-4">
                <div className="rounded-full bg-primary/10 p-3 shrink-0">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">الهاتف</h3>
                  <p className="text-sm text-muted-foreground" dir="ltr">+967 XXX XXX XXX</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-primary/20">
              <CardContent className="p-6 flex items-start gap-4">
                <div className="rounded-full bg-primary/10 p-3 shrink-0">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">الموقع</h3>
                  <p className="text-sm text-muted-foreground">اليمن</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>أرسل لنا رسالة</CardTitle>
                <CardDescription>املأ النموذج التالي وسنتواصل معك في أقرب وقت</CardDescription>
              </CardHeader>
              <CardContent>
                {submitted ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                    <div className="rounded-full bg-primary/10 p-4">
                      <CheckCircle className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">تم إرسال رسالتك بنجاح!</h3>
                    <p className="text-muted-foreground">شكراً لتواصلك معنا، سنرد عليك في أقرب وقت ممكن.</p>
                    <Button variant="outline" onClick={() => { setSubmitted(false); setFormData({ full_name: "", email: "", subject: "", message: "" }); }}>
                      إرسال رسالة أخرى
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="full_name">الاسم الكامل</Label>
                        <Input id="full_name" name="full_name" value={formData.full_name} onChange={handleChange} placeholder="أدخل اسمك الكامل" maxLength={100} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">البريد الإلكتروني</Label>
                        <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="example@email.com" maxLength={255} required dir="ltr" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">الموضوع</Label>
                      <Input id="subject" name="subject" value={formData.subject} onChange={handleChange} placeholder="موضوع الرسالة" maxLength={200} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">الرسالة</Label>
                      <Textarea id="message" name="message" value={formData.message} onChange={handleChange} placeholder="اكتب رسالتك هنا..." rows={5} maxLength={2000} required />
                    </div>
                    <Button type="submit" disabled={loading} variant="hero" className="w-full gap-2 py-5 sm:w-auto sm:py-2">
                      <Send className="h-4 w-4" />
                      {loading ? "جارٍ الإرسال..." : "إرسال الرسالة"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
