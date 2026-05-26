import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { BarChart3, DollarSign, Package, TrendingUp, Shield, Zap } from "lucide-react";
import { Redirect } from "wouter";

/**
 * Home page - shows login CTA for unauthenticated users,
 * redirects to dashboard for authenticated users
 */
export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();

  // If authenticated, redirect to dashboard
  if (isAuthenticated && user) {
    return <Redirect to="/dashboard" />;
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated - show landing page with login CTA
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-bl from-primary/5 via-transparent to-primary/10" />
        <div className="container relative py-20 lg:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              نظام إدارة التجارة الإلكترونية
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              منصة ذكاء مالي متكاملة لإدارة أعمالك التجارية - تتبع الأرباح، إدارة المخزون، تحليل الحملات الإعلانية، والتنبؤ بالتدفقات النقدية
            </p>
            <Button
              size="lg"
              className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all"
              onClick={() => {
                window.location.href = getLoginUrl();
              }}
            >
              تسجيل الدخول للوحة التحكم
            </Button>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={<DollarSign className="h-8 w-8" />}
            title="لوحة تحكم مالية"
            description="تتبع الإيرادات، صافي الربح، هامش الربح، والتدفقات النقدية في الوقت الفعلي"
          />
          <FeatureCard
            icon={<BarChart3 className="h-8 w-8" />}
            title="تحليل الحملات الإعلانية"
            description="مزامنة Meta Ads مع تحليل ROAS، CAC، CPP وأداء الحملات"
          />
          <FeatureCard
            icon={<Package className="h-8 w-8" />}
            title="إدارة المنتجات والتكاليف"
            description="حساب التكلفة الحقيقية للمنتج مع هامش الربح ونقطة التعادل"
          />
          <FeatureCard
            icon={<TrendingUp className="h-8 w-8" />}
            title="ربحية الطلبات"
            description="تحليل ربحية كل طلب مع تصنيف الطلبات (رابح، متعادل، خاسر)"
          />
          <FeatureCard
            icon={<Shield className="h-8 w-8" />}
            title="محاسبة القيد المزدوج"
            description="نظام محاسبي متكامل مع سجل تدقيق لجميع العمليات المالية"
          />
          <FeatureCard
            icon={<Zap className="h-8 w-8" />}
            title="ذكاء اصطناعي"
            description="كشف الحملات الخاسرة، التنبؤ بنفاد المخزون، وتحليل الأنماط المالية"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>نظام ERP للتجارة الإلكترونية - جميع الحقوق محفوظة</p>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-xl border bg-card hover:shadow-md transition-all duration-200">
      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
