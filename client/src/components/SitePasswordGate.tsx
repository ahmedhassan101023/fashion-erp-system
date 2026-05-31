import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const SESSION_KEY = "site_password_verified";

export function SitePasswordGate({ children }: { children: React.ReactNode }) {
  const [verified, setVerified] = useState(() => {
    return sessionStorage.getItem(SESSION_KEY) === "true";
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: enabledSetting, isLoading: settingLoading } = trpc.siteSettings.getSetting.useQuery(
    { key: "site_password_enabled" },
    { staleTime: 60_000 }
  );

  const verifyPassword = trpc.siteSettings.verifySitePassword.useMutation({
    onSuccess: (data) => {
      if (data.valid) {
        sessionStorage.setItem(SESSION_KEY, "true");
        setVerified(true);
        toast.success("تم التحقق بنجاح");
      } else {
        toast.error("كلمة المرور غير صحيحة");
      }
      setLoading(false);
    },
    onError: () => {
      toast.error("حدث خطأ، يرجى المحاولة مجدداً");
      setLoading(false);
    },
  });

  const isEnabled = enabledSetting?.settingValue === "true";

  // If setting is loading or not enabled, show children directly
  if (settingLoading) return null;
  if (!isEnabled || verified) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">محمي بكلمة مرور</h1>
          <p className="text-muted-foreground mt-2 text-sm">أدخل كلمة المرور للوصول إلى النظام</p>
        </div>

        {/* Password Form */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة المرور"
              className="pl-10 text-center text-lg tracking-widest"
              onKeyDown={(e) => {
                if (e.key === "Enter" && password) {
                  setLoading(true);
                  verifyPassword.mutate({ password });
                }
              }}
              dir="ltr"
            />
            <button
              type="button"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <Button
            className="w-full"
            disabled={!password || loading}
            onClick={() => {
              setLoading(true);
              verifyPassword.mutate({ password });
            }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                جاري التحقق...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                دخول
              </span>
            )}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          نظام إدارة فادن للتجارة الإلكترونية
        </p>
      </div>
    </div>
  );
}
