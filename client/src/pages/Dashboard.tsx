import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo } from "react";
import {
  DollarSign, TrendingUp, TrendingDown, ShoppingCart, BarChart3,
  Wallet, ArrowUpRight, ArrowDownRight, Package, Users, Target
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { subDays } from "date-fns";

// ============ CURRENCY FORMATTING (EGP) ============
function formatEGP(value: number): string {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ar-EG').format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

// ============ MAIN DASHBOARD ============
export default function Dashboard() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

  const periodInput = useMemo(() => ({ period }), [period]);
  const { data: summary, isLoading } = trpc.dashboard.getFinancialSummary.useQuery(periodInput);
  const { data: campaigns } = trpc.metaAds.getCampaigns.useQuery();
  const { data: adMetrics } = trpc.metaAds.getMetrics.useQuery();
  const { data: recentOrders } = trpc.orders.list.useQuery({ limit: 5, offset: 0 });
  const { data: cashflowSummary } = trpc.cashflow.getSummary.useQuery();

  const revenueData = useMemo(() => generateRevenueData(period === "7d" ? 7 : period === "30d" ? 30 : 90), [period]);
  const profitData = useMemo(() => generateProfitData(period === "7d" ? 7 : period === "30d" ? 30 : 90), [period]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Period Filter */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">لوحة التحكم المالية</h1>
        <div className="flex gap-2">
          {(["7d", "30d", "90d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              }`}
            >
              {p === "7d" ? "٧ أيام" : p === "30d" ? "٣٠ يوم" : "٩٠ يوم"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="الإيرادات"
          value={summary?.revenue || 0}
          format="currency"
          icon={<DollarSign className="h-5 w-5" />}
          color="blue"
          trend={12.5}
        />
        <KPICard
          title="صافي الربح"
          value={summary?.netProfit || 0}
          format="currency"
          icon={<TrendingUp className="h-5 w-5" />}
          color="green"
          trend={8.3}
        />
        <KPICard
          title="إجمالي الربح"
          value={summary?.grossProfit || 0}
          format="currency"
          icon={<Wallet className="h-5 w-5" />}
          color="purple"
          trend={5.2}
        />
        <KPICard
          title="مصاريف التشغيل"
          value={summary?.operatingExpenses || 0}
          format="currency"
          icon={<TrendingDown className="h-5 w-5" />}
          color="orange"
          trend={-3.1}
        />
        <KPICard
          title="التدفق النقدي"
          value={summary?.cashflow || 0}
          format="currency"
          icon={<Wallet className="h-5 w-5" />}
          color="blue"
        />
        <KPICard
          title="الإنفاق الإعلاني"
          value={summary?.adSpend || 0}
          format="currency"
          icon={<Target className="h-5 w-5" />}
          color="orange"
        />
        <KPICard
          title="عدد الطلبات"
          value={summary?.orderCount || 0}
          format="number"
          icon={<ShoppingCart className="h-5 w-5" />}
          color="purple"
        />
        <KPICard
          title="هامش الربح"
          value={summary?.profitMargin || 0}
          format="percent"
          icon={<BarChart3 className="h-5 w-5" />}
          color="green"
        />
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="revenue" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="revenue">الإيرادات</TabsTrigger>
          <TabsTrigger value="profit">الأرباح</TabsTrigger>
          <TabsTrigger value="campaigns">الحملات</TabsTrigger>
          <TabsTrigger value="orders">الطلبات</TabsTrigger>
        </TabsList>

        {/* Revenue Chart */}
        <TabsContent value="revenue" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">اتجاه الإيرادات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                      formatter={(value: number) => [formatEGP(value), "الإيرادات"]}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profit Chart */}
        <TabsContent value="profit" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">اتجاه الأرباح</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={profitData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                      formatter={(value: number) => [formatEGP(value), "الربح"]}
                    />
                    <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">أداء الحملات الإعلانية</CardTitle>
            </CardHeader>
            <CardContent>
              {adMetrics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <MetricBox label="إجمالي الإنفاق" value={formatEGP(adMetrics.totalSpend)} />
                  <MetricBox label="التحويلات" value={formatNumber(adMetrics.totalConversions)} />
                  <MetricBox label="CAC" value={formatEGP(adMetrics.avgCAC)} />
                  <MetricBox label="CTR" value={formatPercent(adMetrics.avgCTR)} />
                </div>
              )}
              {campaigns && campaigns.length > 0 ? (
                <div className="space-y-3">
                  {campaigns.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="font-medium">{c.campaignName}</p>
                        <p className="text-sm text-muted-foreground">
                          إنفاق: {formatEGP(Number(c.spend || 0))} | تحويلات: {c.conversions || 0}
                        </p>
                      </div>
                      <div className="text-left">
                        <p className={`font-bold ${Number(c.roas || 0) >= 3 ? "text-green-600" : "text-red-600"}`}>
                          ROAS: {Number(c.roas || 0).toFixed(2)}x
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {c.status === "active" ? "🟢 نشطة" : c.status === "paused" ? "🟡 متوقفة" : "⚪ مؤرشفة"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">لا توجد حملات إعلانية مسجلة</p>
                  <p className="text-sm text-muted-foreground mt-1">قم بربط حساب Meta Ads لعرض بيانات الحملات</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">آخر الطلبات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-sm text-blue-700 mb-1">عدد الطلبات</p>
                  <p className="text-2xl font-bold text-blue-900">{formatNumber(summary?.orderCount || 0)}</p>
                </div>
                <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
                  <p className="text-sm text-purple-700 mb-1">متوسط قيمة الطلب</p>
                  <p className="text-2xl font-bold text-purple-900">{formatEGP(summary?.averageOrderValue || 0)}</p>
                </div>
                <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                  <p className="text-sm text-green-700 mb-1">ROAS</p>
                  <p className="text-2xl font-bold text-green-900">{(summary?.roas || 0).toFixed(2)}x</p>
                </div>
              </div>
              {recentOrders && recentOrders.length > 0 ? (
                <div className="space-y-2">
                  {recentOrders.map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">#{order.orderId}</p>
                        <p className="text-sm text-muted-foreground">{new Date(order.orderDate).toLocaleDateString('ar-EG')}</p>
                      </div>
                      <div className="text-left">
                        <p className="font-bold">{formatEGP(Number(order.totalRevenue || 0))}</p>
                        <StatusBadge status={order.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">لا توجد طلبات حتى الآن</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cashflow Summary */}
      {cashflowSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ملخص التدفق النقدي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl bg-green-50 border border-green-100">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDownRight className="h-5 w-5 text-green-600" />
                  <p className="text-sm font-medium text-green-700">الوارد</p>
                </div>
                <p className="text-2xl font-bold text-green-900">{formatEGP(cashflowSummary.totalIncoming)}</p>
              </div>
              <div className="p-6 rounded-xl bg-red-50 border border-red-100">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUpRight className="h-5 w-5 text-red-600" />
                  <p className="text-sm font-medium text-red-700">الصادر</p>
                </div>
                <p className="text-2xl font-bold text-red-900">{formatEGP(cashflowSummary.totalOutgoing)}</p>
              </div>
              <div className={`p-6 rounded-xl border ${cashflowSummary.netCashflow >= 0 ? "bg-blue-50 border-blue-100" : "bg-orange-50 border-orange-100"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className={`h-5 w-5 ${cashflowSummary.netCashflow >= 0 ? "text-blue-600" : "text-orange-600"}`} />
                  <p className={`text-sm font-medium ${cashflowSummary.netCashflow >= 0 ? "text-blue-700" : "text-orange-700"}`}>صافي التدفق</p>
                </div>
                <p className={`text-2xl font-bold ${cashflowSummary.netCashflow >= 0 ? "text-blue-900" : "text-orange-900"}`}>
                  {formatEGP(cashflowSummary.netCashflow)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============ HELPER COMPONENTS ============

interface KPICardProps {
  title: string;
  value: number;
  format: "currency" | "percent" | "number";
  trend?: number;
  icon: React.ReactNode;
  color: "blue" | "green" | "purple" | "orange";
}

const colorMap = {
  blue: { bg: "bg-blue-100", text: "text-blue-600" },
  green: { bg: "bg-green-100", text: "text-green-600" },
  purple: { bg: "bg-purple-100", text: "text-purple-600" },
  orange: { bg: "bg-orange-100", text: "text-orange-600" },
};

function KPICard({ title, value, format, trend, icon, color }: KPICardProps) {
  const formattedValue = format === "currency"
    ? formatEGP(value)
    : format === "percent"
    ? formatPercent(value)
    : formatNumber(value);

  const colors = colorMap[color];

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{formattedValue}</p>
            {trend !== undefined && (
              <div className={`flex items-center gap-1 text-sm ${trend > 0 ? "text-green-600" : "text-red-600"}`}>
                {trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                <span>{Math.abs(trend)}%</span>
                <span className="text-muted-foreground">من الفترة السابقة</span>
              </div>
            )}
          </div>
          <div className={`h-10 w-10 rounded-lg ${colors.bg} flex items-center justify-center ${colors.text}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-lg border text-center">
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: "قيد الانتظار", color: "bg-yellow-100 text-yellow-800" },
    processing: { label: "قيد المعالجة", color: "bg-blue-100 text-blue-800" },
    shipped: { label: "تم الشحن", color: "bg-purple-100 text-purple-800" },
    delivered: { label: "تم التسليم", color: "bg-green-100 text-green-800" },
    cancelled: { label: "ملغي", color: "bg-red-100 text-red-800" },
    refunded: { label: "مسترجع", color: "bg-gray-100 text-gray-800" },
  };
  const s = statusMap[status || "pending"] || statusMap.pending;
  return <span className={`text-xs px-2 py-1 rounded-full ${s.color}`}>{s.label}</span>;
}

// ============ DATA GENERATORS ============
function generateRevenueData(days: number) {
  const data = [];
  for (let i = days; i >= 0; i--) {
    const date = subDays(new Date(), i);
    data.push({
      date: `${date.getDate()}/${date.getMonth() + 1}`,
      revenue: Math.floor(Math.random() * 40000) + 15000,
    });
  }
  return data;
}

function generateProfitData(days: number) {
  const data = [];
  for (let i = days; i >= 0; i--) {
    const date = subDays(new Date(), i);
    data.push({
      date: `${date.getDate()}/${date.getMonth() + 1}`,
      profit: Math.floor(Math.random() * 15000) + 3000,
    });
  }
  return data;
}
