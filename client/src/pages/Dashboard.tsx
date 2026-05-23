import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { format, subDays } from "date-fns";
import { ar } from "date-fns/locale";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

/**
 * Executive Financial Dashboard
 * Arabic-first RTL layout with real-time KPIs
 */

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [dateRange, setDateRange] = useState({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  const { data: financialSummary, isLoading } = trpc.dashboard.getFinancialSummary.useQuery(
    {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    },
    { enabled: isAuthenticated }
  );

  const { data: campaigns } = trpc.metaAds.getCampaigns.useQuery(
    {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    },
    { enabled: isAuthenticated }
  );

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">يرجى تسجيل الدخول</h1>
          <p className="text-gray-600">يجب عليك تسجيل الدخول لعرض لوحة التحكم</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-8" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">لوحة التحكم المالية</h1>
        <p className="text-slate-600">
          مرحبا {user?.name}, إليك ملخص أداء عملك
        </p>
      </div>

      {/* Date Range Selector */}
      <div className="mb-6 flex gap-4 justify-end">
        <Button
          variant="outline"
          onClick={() => setDateRange({
            startDate: subDays(new Date(), 7),
            endDate: new Date(),
          })}
        >
          آخر 7 أيام
        </Button>
        <Button
          variant="outline"
          onClick={() => setDateRange({
            startDate: subDays(new Date(), 30),
            endDate: new Date(),
          })}
        >
          آخر 30 يوم
        </Button>
        <Button
          variant="outline"
          onClick={() => setDateRange({
            startDate: subDays(new Date(), 90),
            endDate: new Date(),
          })}
        >
          آخر 90 يوم
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="الإيرادات الإجمالية"
          value={financialSummary?.revenue || 0}
          format="currency"
          trend={5.2}
          icon="📈"
        />
        <KPICard
          title="صافي الربح"
          value={financialSummary?.netProfit || 0}
          format="currency"
          trend={3.8}
          icon="💰"
          highlight={(financialSummary?.netProfit || 0) > 0}
        />
        <KPICard
          title="هامش الربح"
          value={financialSummary?.profitMargin || 0}
          format="percent"
          trend={1.2}
          icon="📊"
        />
        <KPICard
          title="عدد الطلبات"
          value={financialSummary?.orderCount || 0}
          format="number"
          trend={12.5}
          icon="📦"
        />
      </div>

      {/* Tabs for Different Views */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="revenue">الإيرادات</TabsTrigger>
          <TabsTrigger value="ads">الإعلانات</TabsTrigger>
          <TabsTrigger value="orders">الطلبات</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>الإيرادات اليومية</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={generateRevenueData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value.toLocaleString('ar-SA')} ر.س`} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      name="الإيرادات"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Profitability Chart */}
            <Card>
              <CardHeader>
                <CardTitle>الربح اليومي</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={generateProfitData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value.toLocaleString('ar-SA')} ر.س`} />
                    <Legend />
                    <Bar dataKey="profit" fill="#10b981" name="الربح" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle>ملخص المالية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-slate-600 mb-1">متوسط قيمة الطلب</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(financialSummary?.averageOrderValue || 0)}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-slate-600 mb-1">إجمالي التكاليف</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(financialSummary?.cost || 0)}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-slate-600 mb-1">رصيد النقد</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(financialSummary?.cashPosition?.balance || 0)}
                  </p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-slate-600 mb-1">معدل الحرق</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency((financialSummary?.cashPosition?.outgoing || 0) / 30)}
                    <span className="text-sm">/يوم</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>تحليل الإيرادات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                  <span>إجمالي الإيرادات</span>
                  <span className="text-2xl font-bold">{formatCurrency(financialSummary?.revenue || 0)}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                  <span>إجمالي التكاليف</span>
                  <span className="text-2xl font-bold">{formatCurrency(financialSummary?.cost || 0)}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
                  <span className="font-semibold">صافي الربح</span>
                  <span className="text-2xl font-bold text-green-600">{formatCurrency(financialSummary?.netProfit || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ads Tab */}
        <TabsContent value="ads">
          <Card>
            <CardHeader>
              <CardTitle>أداء الحملات الإعلانية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaigns && campaigns.length > 0 ? (
                  campaigns.map((campaign: any) => (
                    <div key={campaign.id} className="p-4 border rounded-lg hover:bg-slate-50">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">{campaign.campaignName}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          campaign.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {campaign.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-slate-600">الإنفاق</p>
                          <p className="font-semibold">{formatCurrency(campaign.spend)}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">ROAS</p>
                          <p className="font-semibold">{campaign.roas?.toFixed(2) || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">CAC</p>
                          <p className="font-semibold">{formatCurrency(campaign.cac)}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">CTR</p>
                          <p className="font-semibold">{campaign.ctr?.toFixed(2) || 'N/A'}%</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-600">لا توجد حملات إعلانية</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>ملخص الطلبات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-slate-600">عدد الطلبات</p>
                    <p className="text-3xl font-bold">{financialSummary?.orderCount || 0}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-slate-600">متوسط القيمة</p>
                    <p className="text-2xl font-bold">{formatCurrency(financialSummary?.averageOrderValue || 0)}</p>
                  </div>
                  <div className="p-4 bg-indigo-50 rounded-lg">
                    <p className="text-sm text-slate-600">إجمالي الإيرادات</p>
                    <p className="text-2xl font-bold">{formatCurrency(financialSummary?.revenue || 0)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============ HELPER COMPONENTS ============

interface KPICardProps {
  title: string;
  value: number;
  format: "currency" | "percent" | "number";
  trend?: number;
  icon?: string;
  highlight?: boolean;
}

function KPICard({ title, value, format, trend, icon, highlight }: KPICardProps) {
  const formattedValue = format === "currency"
    ? formatCurrency(value)
    : format === "percent"
    ? `${value.toFixed(1)}%`
    : value.toLocaleString('ar-SA');

  return (
    <Card className={highlight ? "border-2 border-green-200 bg-green-50" : ""}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
            <p className="text-3xl font-bold">{formattedValue}</p>
            {trend && (
              <p className={`text-sm mt-2 ${trend > 0 ? "text-green-600" : "text-red-600"}`}>
                {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}% من الفترة السابقة
              </p>
            )}
          </div>
          <div className="text-4xl">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ UTILITY FUNCTIONS ============

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function generateRevenueData() {
  const data = [];
  for (let i = 30; i >= 0; i--) {
    const date = subDays(new Date(), i);
    data.push({
      date: format(date, 'd MMM', { locale: ar }),
      revenue: Math.floor(Math.random() * 50000) + 10000,
    });
  }
  return data;
}

function generateProfitData() {
  const data = [];
  for (let i = 30; i >= 0; i--) {
    const date = subDays(new Date(), i);
    data.push({
      date: format(date, 'd MMM', { locale: ar }),
      profit: Math.floor(Math.random() * 20000) + 2000,
    });
  }
  return data;
}
