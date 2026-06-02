import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Settings2, Store, BarChart3, Truck, Bell, Shield, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";

export default function Settings() {
  return (
    <div className="space-y-6 p-6" dir="rtl">
      <h1 className="text-2xl font-bold">الإعدادات</h1>

      <Tabs defaultValue="integrations" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="integrations">الربط</TabsTrigger>
          <TabsTrigger value="notifications">الإشعارات</TabsTrigger>
          <TabsTrigger value="team">الفريق</TabsTrigger>
          <TabsTrigger value="system">النظام</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-4 mt-4">
          <ShopifyIntegrationPanel />

          {/* Meta Ads */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Meta Ads</CardTitle>
                  <CardDescription>ربط حساب Meta Ads لتتبع أداء الحملات</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div><Label>Access Token</Label><Input type="password" placeholder="Meta Ads Access Token" /></div>
                <div><Label>Ad Account ID</Label><Input placeholder="act_xxxxxxxxx" /></div>
                <Button onClick={() => toast.info("سيتم تفعيل الربط قريباً")}>ربط الحساب</Button>
              </div>
            </CardContent>
          </Card>

          {/* Shipping */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">شركة الشحن</CardTitle>
                  <CardDescription>ربط شركة الشحن لتتبع الشحنات</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div><Label>API Key</Label><Input type="password" placeholder="Shipping API Key" /></div>
                <Button onClick={() => toast.info("سيتم تفعيل الربط قريباً")}>ربط شركة الشحن</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4 mt-4">
          <NotificationPreferencesPanel />
        </TabsContent>

        <TabsContent value="team" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-indigo-500" />
                <CardTitle className="text-lg">صلاحيات الفريق</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">الأدوار المتاحة في النظام:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <RoleCard role="المالك" description="صلاحيات كاملة على النظام" color="purple" />
                  <RoleCard role="محاسب" description="الوصول للبيانات المالية والتقارير" color="blue" />
                  <RoleCard role="مسؤول إعلانات" description="إدارة الحملات وتحليل الأداء" color="green" />
                  <RoleCard role="عمليات" description="إدارة الطلبات والشحن" color="orange" />
                  <RoleCard role="دعم العملاء" description="إدارة العملاء والشكاوى" color="pink" />
                  <RoleCard role="مدير المخزون" description="إدارة المنتجات والمخزون" color="teal" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4 mt-4">
          <SitePasswordPanel />
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Settings2 className="h-5 w-5 text-gray-500" />
                <CardTitle className="text-lg">إعدادات النظام</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div><Label>العملة الافتراضية</Label><Input value="EGP - جنيه مصري" disabled /></div>
                <div><Label>المنطقة الزمنية</Label><Input value="Africa/Cairo (UTC+2)" disabled /></div>
                <div><Label>اللغة</Label><Input value="العربية" disabled /></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotificationPreferencesPanel() {
  const { data: prefs, isLoading } = trpc.notifications.getPreferences.useQuery();
  const saveMutation = trpc.notifications.savePreferences.useMutation({
    onSuccess: () => toast.success("تم حفظ إعدادات الإشعارات"),
    onError: () => toast.error("فشل حفظ الإعدادات"),
  });

  const [localPrefs, setLocalPrefs] = useState({
    lowInventory: true,
    negativeCashflow: true,
    highCostOrders: true,
    failedDelivery: true,
    dailySummary: true,
  });

  useEffect(() => {
    if (prefs) {
      setLocalPrefs({
        lowInventory: prefs.lowInventory ?? true,
        negativeCashflow: prefs.negativeCashflow ?? true,
        highCostOrders: prefs.highCostOrders ?? true,
        failedDelivery: prefs.failedDelivery ?? true,
        dailySummary: prefs.dailySummary ?? true,
      });
    }
  }, [prefs]);

  const handleToggle = (key: keyof typeof localPrefs) => {
    setLocalPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    saveMutation.mutate(localPrefs);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-orange-500" />
          <div>
            <CardTitle className="text-lg">إعدادات الإشعارات</CardTitle>
            <CardDescription>تحكم في التنبيهات التلقائية التي يرسلها النظام</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <NotificationToggle
            label="تنبيه انخفاض المخزون"
            description="إشعار عند وصول المخزون لحد إعادة الطلب"
            checked={localPrefs.lowInventory}
            onToggle={() => handleToggle('lowInventory')}
          />
          <NotificationToggle
            label="تنبيه التدفق النقدي السلبي"
            description="إشعار عند تحول التدفق النقدي للسلبي خلال 30 يوم"
            checked={localPrefs.negativeCashflow}
            onToggle={() => handleToggle('negativeCashflow')}
          />
          <NotificationToggle
            label="تنبيه الطلبات الخاسرة"
            description="إشعار عند اكتشاف طلبات بتكلفة أعلى من الإيراد"
            checked={localPrefs.highCostOrders}
            onToggle={() => handleToggle('highCostOrders')}
          />
          <NotificationToggle
            label="تنبيه فشل التسليم"
            description="إشعار عند فشل تسليم شحنة للعميل"
            checked={localPrefs.failedDelivery}
            onToggle={() => handleToggle('failedDelivery')}
          />
          <NotificationToggle
            label="ملخص مالي يومي"
            description="تقرير يومي بإجمالي الطلبات والإيرادات والتدفق النقدي"
            checked={localPrefs.dailySummary}
            onToggle={() => handleToggle('dailySummary')}
          />

          <div className="pt-4 border-t">
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              حفظ الإعدادات
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationToggle({ label, description, checked, onToggle }: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onToggle} />
    </div>
  );
}

function RoleCard({ role, description, color }: { role: string; description: string; color: string }) {
  const bgColors: Record<string, string> = {
    purple: "bg-purple-50/50 border-purple-200",
    blue: "bg-blue-50/50 border-blue-200",
    green: "bg-green-50/50 border-green-200",
    orange: "bg-orange-50/50 border-orange-200",
    pink: "bg-pink-50/50 border-pink-200",
    teal: "bg-teal-50/50 border-teal-200",
  };
  return (
    <div className={`p-3 rounded-lg border ${bgColors[color] || "bg-gray-50/50"}`}>
      <p className="font-medium">{role}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function SitePasswordPanel() {
  const utils = trpc.useUtils();
  const { data: enabledSetting } = trpc.siteSettings.getSetting.useQuery({ key: "site_password_enabled" });
  const setSitePassword = trpc.siteSettings.setSitePassword.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث إعدادات كلمة المرور");
      utils.siteSettings.getSetting.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const isEnabled = enabledSetting?.settingValue === "true";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  const handleToggle = () => {
    setSitePassword.mutate({ enabled: !isEnabled });
  };

  const handleChangePassword = () => {
    if (!newPassword) return toast.error("أدخل كلمة المرور الجديدة");
    if (newPassword !== confirmPassword) return toast.error("كلمتا المرور غير متطابقتين");
    if (newPassword.length < 4) return toast.error("كلمة المرور يجب أن تكون 4 أحرف على الأقل");
    setSitePassword.mutate({ enabled: isEnabled, password: newPassword });
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
            <Shield className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <CardTitle className="text-lg">قفل الموقع بكلمة مرور</CardTitle>
            <CardDescription>حماية الموقع بكلمة مرور قبل الوصول إليه</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
          <div>
            <p className="font-medium">تفعيل قفل الموقع</p>
            <p className="text-sm text-muted-foreground">
              {isEnabled ? "🔒 الموقع محمي بكلمة مرور" : "🔓 الموقع مفتوح للجميع"}
            </p>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={setSitePassword.isPending}
          />
        </div>

        {/* Change Password */}
        <div className="space-y-3">
          <p className="text-sm font-medium">تغيير كلمة المرور</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>كلمة المرور الجديدة</Label>
              <Input
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label>تأكيد كلمة المرور</Label>
              <Input
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPasswords(!showPasswords)}
            >
              {showPasswords ? <EyeOff className="h-4 w-4 ml-2" /> : <Eye className="h-4 w-4 ml-2" />}
              {showPasswords ? "إخفاء" : "إظهار"}
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={!newPassword || setSitePassword.isPending}
            >
              {setSitePassword.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              حفظ كلمة المرور
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground bg-amber-50 rounded-lg p-3 border border-amber-100">
          ⚠️ عند تفعيل القفل، سيُطلب من كل زائر إدخال كلمة المرور قبل الوصول إلى الموقع. تأكد من حفظ كلمة المرور في مكان آمن.
        </p>
      </CardContent>
    </Card>
  );
}

// ============ SHOPIFY INTEGRATION PANEL ============
function ShopifyIntegrationPanel() {
  const utils = trpc.useUtils();
  const { data: config, isLoading } = trpc.integrations.getShopifyConfig.useQuery();

  const [shopName, setShopName] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [apiVersion, setApiVersion] = useState("2025-01");
  const [showToken, setShowToken] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; shopInfo?: any; error?: string } | null>(null);
  const [syncResult, setSyncResult] = useState<{ syncedCount: number; total: number } | null>(null);
  const [productSyncResult, setProductSyncResult] = useState<{ syncedCount: number } | null>(null);

  // Pre-fill form when config loads
  useEffect(() => {
    if (config) {
      setShopName(config.shopName ?? "");
      setApiVersion(config.apiVersion ?? "2025-01");
    }
  }, [config]);

  const saveConfig = trpc.integrations.saveShopifyConfig.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ بيانات Shopify بنجاح");
      utils.integrations.getShopifyConfig.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const testConnection = trpc.integrations.testShopifyConnection.useMutation({
    onSuccess: (data) => {
      setTestResult(data);
      if (data.success) toast.success("✅ الاتصال ناجح!");
      else toast.error(`❌ فشل الاتصال: ${data.error}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const syncOrders = trpc.integrations.syncShopifyOrders.useMutation({
    onSuccess: (data) => {
      setSyncResult({ syncedCount: data.syncedCount, total: data.total });
      toast.success(`تمت المزامنة: ${data.syncedCount} طلب جديد من أصل ${data.total}`);
      utils.integrations.getSyncLogs.invalidate();
    },
    onError: (e) => toast.error(`فشل المزامنة: ${e.message}`),
  });

  const syncProducts = trpc.integrations.syncShopifyProducts.useMutation({
    onSuccess: (data) => {
      setProductSyncResult({ syncedCount: data.syncedCount });
      toast.success(`تمت مزامنة المنتجات: ${data.syncedCount} منتج جديد`);
      utils.integrations.getSyncLogs.invalidate();
    },
    onError: (e) => toast.error(`فشل مزامنة المنتجات: ${e.message}`),
  });

  const { data: syncLogs } = trpc.integrations.getSyncLogs.useQuery();

  const isConnected = config?.status === "active";
  const isError = config?.status === "error";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Store className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Shopify</CardTitle>
              <CardDescription>ربط متجر Shopify لمزامنة الطلبات والمنتجات تلقائياً</CardDescription>
            </div>
          </div>
          {config && (
            <span className={`text-xs px-3 py-1.5 rounded-full font-medium border ${
              isConnected ? "bg-green-100 text-green-800 border-green-200" :
              isError ? "bg-red-100 text-red-800 border-red-200" :
              "bg-gray-100 text-gray-600 border-gray-200"
            }`}>
              {isConnected ? "✅ متصل" : isError ? "❌ خطأ في الاتصال" : "⏸ غير مفعل"}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Step-by-step guide */}
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800 space-y-2">
          <p className="font-semibold">📋 كيفية الحصول على Access Token من Shopify:</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-700">
            <li>افتح <strong>Shopify Admin</strong> → <strong>Settings</strong> → <strong>Apps and sales channels</strong></li>
            <li>اضغط <strong>Develop apps</strong> ثم <strong>Create an app</strong></li>
            <li>أدخل اسم التطبيق واضغط <strong>Create app</strong></li>
            <li>اضغط <strong>Configure Admin API scopes</strong> وفعّل: <code>read_orders, write_orders, read_products, write_products, read_inventory</code></li>
            <li>اضغط <strong>Save</strong> ثم <strong>Install app</strong></li>
            <li>انسخ <strong>Admin API access token</strong> (يبدأ بـ <code>shpat_</code>)</li>
          </ol>
          <p className="text-xs text-blue-600 mt-1">⚠️ الـ Token يظهر مرة واحدة فقط — احفظه فوراً</p>
        </div>

        {/* Connection Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>اسم المتجر <span className="text-destructive">*</span></Label>
            <Input
              value={shopName}
              onChange={(e) => setShopName(e.target.value.trim())}
              placeholder="your-store"
              dir="ltr"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              مثال: إذا كان رابط متجرك <code>my-brand.myshopify.com</code> أدخل <code>my-brand</code> فقط
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>API Version</Label>
            <Input
              value={apiVersion}
              onChange={(e) => setApiVersion(e.target.value.trim())}
              placeholder="2025-01"
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground">الإصدار الحالي المدعوم: 2025-01</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Admin API Access Token <span className="text-destructive">*</span></Label>
          <div className="relative">
            <Input
              type={showToken ? "text" : "password"}
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder={config?.accessTokenMasked ? `محفوظ: ${config.accessTokenMasked}` : "shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}
              dir="ltr"
              className="pr-10 font-mono text-sm"
              autoComplete="new-password"
              spellCheck={false}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {config?.accessTokenMasked && !accessToken && (
            <p className="text-xs text-green-600">✅ يوجد token محفوظ — اتركه فارغاً إذا لم تريد تغييره</p>
          )}
          {accessToken && !accessToken.trim().startsWith("shpat_") && (
            <p className="text-xs text-amber-600">⚠️ الـ Token عادةً يبدأ بـ shpat_ — تأكد من نسخه كاملاً</p>
          )}
        </div>

        {/* Error message */}
        {isError && config?.syncErrorMessage && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            <p className="font-semibold mb-1">آخر خطأ:</p>
            <p className="font-mono text-xs break-all">{config.syncErrorMessage}</p>
          </div>
        )}

        {/* Test result */}
        {testResult && (
          <div className={`rounded-xl border p-4 ${
            testResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
          }`}>
            {testResult.success && testResult.shopInfo ? (
              <div className="space-y-3">
                <p className="font-semibold text-green-800">✅ تم الاتصال بنجاح!</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-green-700">
                  <span><strong>المتجر:</strong> {testResult.shopInfo.name}</span>
                  <span><strong>البريد:</strong> {testResult.shopInfo.email}</span>
                  <span><strong>العملة:</strong> {testResult.shopInfo.currency}</span>
                  <span><strong>الدولة:</strong> {testResult.shopInfo.country}</span>
                  <span><strong>الخطة:</strong> {testResult.shopInfo.plan}</span>
                  <span><strong>الدومين:</strong> {testResult.shopInfo.domain}</span>
                </div>
                <p className="text-xs text-green-600">الآن يمكنك حفظ البيانات ثم مزامنة الطلبات والمنتجات</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-semibold text-red-700">❌ فشل الاتصال</p>
                <p className="text-sm text-red-600 font-mono break-all">{testResult.error}</p>
                <div className="text-xs text-red-500 space-y-1 mt-2 border-t border-red-200 pt-2">
                  <p className="font-semibold">خطوات التحقق:</p>
                  <p>• تأكد أن اسم المتجر صحيح (بدون .myshopify.com)</p>
                  <p>• تأكد أن الـ Token منسوخ كاملاً ويبدأ بـ shpat_</p>
                  <p>• تأكد أن التطبيق مثبّت في Shopify Admin (Install app)</p>
                  <p>• تأكد أن الـ scopes تشمل read_orders و read_products</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sync results */}
        {(syncResult || productSyncResult) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {syncResult && (
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
                ✅ الطلبات: <strong>{syncResult.syncedCount}</strong> جديد من أصل <strong>{syncResult.total}</strong>
              </div>
            )}
            {productSyncResult && (
              <div className="rounded-xl bg-purple-50 border border-purple-200 p-3 text-sm text-purple-800">
                ✅ المنتجات: <strong>{productSyncResult.syncedCount}</strong> منتج تمت مزامنته
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setTestResult(null);
              testConnection.mutate({ shopName, accessToken, apiVersion });
            }}
            disabled={(!shopName && !config?.shopName) || testConnection.isPending}
          >
            {testConnection.isPending
              ? <Loader2 className="h-4 w-4 animate-spin ml-2" />
              : null
            }
            اختبار الاتصال
          </Button>

          <Button
            onClick={() => {
              if (!shopName) return toast.error("أدخل اسم المتجر");
              if (!accessToken && !config?.accessTokenMasked) return toast.error("أدخل الـ Access Token");
              // If no new token typed, send empty string — backend will preserve the saved token
              saveConfig.mutate({
                shopName,
                accessToken: accessToken.trim(),
                apiVersion,
              });
            }}
            disabled={saveConfig.isPending}
          >
            {saveConfig.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
            حفظ البيانات
          </Button>

          {isConnected && (
            <>
              <Button
                variant="outline"
                onClick={() => syncOrders.mutate({})}
                disabled={syncOrders.isPending}
              >
                {syncOrders.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                مزامنة الطلبات
              </Button>
              <Button
                variant="outline"
                onClick={() => syncProducts.mutate()}
                disabled={syncProducts.isPending}
              >
                {syncProducts.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                مزامنة المنتجات
              </Button>
            </>
          )}
        </div>

        {/* Sync logs */}
        {syncLogs && syncLogs.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">سجل المزامنة الأخيرة</p>
            <div className="rounded-xl border divide-y text-sm">
              {syncLogs.slice(0, 5).map((log: any) => (
                <div key={log.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${
                      log.status === "completed" ? "bg-green-500" :
                      log.status === "failed" ? "bg-red-500" :
                      "bg-yellow-500"
                    }`} />
                    <span className="font-medium">{log.syncType === "orders" ? "طلبات" : "منتجات"}</span>
                    {log.itemsProcessed != null && (
                      <span className="text-muted-foreground">{log.itemsProcessed} عنصر</span>
                    )}
                    {log.status === "failed" && log.errorMessage && (
                      <span className="text-red-500 text-xs truncate max-w-48">{log.errorMessage}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString("ar-EG")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last sync */}
        {config?.lastSyncDate && (
          <p className="text-xs text-muted-foreground">
            آخر مزامنة: {new Date(config.lastSyncDate).toLocaleString("ar-EG")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
