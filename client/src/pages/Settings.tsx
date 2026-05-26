import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings2, Store, BarChart3, Truck, Bell, Shield } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">الإعدادات</h1>

      <Tabs defaultValue="integrations" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="integrations">الربط</TabsTrigger>
          <TabsTrigger value="notifications">الإشعارات</TabsTrigger>
          <TabsTrigger value="team">الفريق</TabsTrigger>
          <TabsTrigger value="system">النظام</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-4 mt-4">
          {/* Shopify */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Store className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Shopify</CardTitle>
                  <CardDescription>ربط متجر Shopify لمزامنة الطلبات والمنتجات</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div><Label>رابط المتجر</Label><Input placeholder="your-store.myshopify.com" /></div>
                <div><Label>Access Token</Label><Input type="password" placeholder="shpat_xxxxxxxx" /></div>
                <Button onClick={() => toast.info("سيتم تفعيل الربط قريباً")}>ربط المتجر</Button>
              </div>
            </CardContent>
          </Card>

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
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-lg">إعدادات الإشعارات</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <NotificationToggle label="تنبيه انخفاض المخزون" description="إشعار عند وصول المخزون لحد أدنى" defaultChecked />
                <NotificationToggle label="تنبيه التدفق النقدي السلبي" description="إشعار عند انخفاض الرصيد" defaultChecked />
                <NotificationToggle label="تنبيه الطلبات الخاسرة" description="إشعار عند وجود طلبات بهامش سلبي" defaultChecked />
                <NotificationToggle label="ملخص مالي يومي" description="تقرير يومي بالأداء المالي" defaultChecked />
                <NotificationToggle label="تنبيه فشل التسليم" description="إشعار عند فشل تسليم شحنة" defaultChecked />
              </div>
            </CardContent>
          </Card>
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

function NotificationToggle({ label, description, defaultChecked }: { label: string; description: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <input type="checkbox" defaultChecked={defaultChecked} className="h-5 w-5 rounded" />
    </div>
  );
}

function RoleCard({ role, description, color }: { role: string; description: string; color: string }) {
  return (
    <div className={`p-3 rounded-lg border bg-${color}-50/30`}>
      <p className="font-medium">{role}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
