import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, TrendingUp, MousePointerClick, Eye, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

function formatEGP(value: number): string {
  return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ar-EG').format(value);
}

export default function Campaigns() {
  const { data: campaigns, isLoading } = trpc.metaAds.getCampaigns.useQuery();
  const { data: metrics } = trpc.metaAds.getMetrics.useQuery();

  if (isLoading) return <div className="p-6 space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">تحليل الحملات الإعلانية</h1>

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <MetricCard icon={<DollarSign className="h-5 w-5" />} label="إجمالي الإنفاق" value={formatEGP(metrics.totalSpend)} color="red" />
          <MetricCard icon={<Eye className="h-5 w-5" />} label="المشاهدات" value={formatNumber(metrics.totalImpressions)} color="blue" />
          <MetricCard icon={<MousePointerClick className="h-5 w-5" />} label="النقرات" value={formatNumber(metrics.totalClicks)} color="purple" />
          <MetricCard icon={<Target className="h-5 w-5" />} label="التحويلات" value={formatNumber(metrics.totalConversions)} color="green" />
          <MetricCard icon={<TrendingUp className="h-5 w-5" />} label="CAC" value={formatEGP(metrics.avgCAC)} color="orange" />
        </div>
      )}

      {/* Campaign Performance Chart */}
      {campaigns && campaigns.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">أداء الحملات (ROAS)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaigns.map((c: any) => ({
                  name: c.campaignName?.substring(0, 20) || `حملة ${c.id}`,
                  roas: Number(c.roas || 0),
                  spend: Number(c.spend || 0),
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Bar dataKey="roas" fill="#10b981" radius={[4, 4, 0, 0]} name="ROAS" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaign List */}
      <Card>
        <CardHeader><CardTitle className="text-lg">قائمة الحملات</CardTitle></CardHeader>
        <CardContent>
          {campaigns && campaigns.length > 0 ? (
            <div className="space-y-3">
              {campaigns.map((campaign: any) => {
                const roas = Number(campaign.roas || 0);
                const isLosing = roas < 2;
                const isWinning = roas >= 3;
                return (
                  <div key={campaign.id} className={`p-4 rounded-lg border ${isLosing ? "border-red-200 bg-red-50/50" : isWinning ? "border-green-200 bg-green-50/50" : ""}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{campaign.campaignName}</p>
                        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                          <span>إنفاق: {formatEGP(Number(campaign.spend || 0))}</span>
                          <span>نقرات: {formatNumber(Number(campaign.clicks || 0))}</span>
                          <span>تحويلات: {campaign.conversions || 0}</span>
                        </div>
                      </div>
                      <div className="text-left space-y-1">
                        <p className={`text-xl font-bold ${isLosing ? "text-red-600" : isWinning ? "text-green-600" : "text-yellow-600"}`}>
                          {roas.toFixed(2)}x ROAS
                        </p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          campaign.status === "active" ? "bg-green-100 text-green-800" :
                          campaign.status === "paused" ? "bg-yellow-100 text-yellow-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {campaign.status === "active" ? "نشطة" : campaign.status === "paused" ? "متوقفة" : "مؤرشفة"}
                        </span>
                      </div>
                    </div>
                    {isLosing && (
                      <div className="mt-2 p-2 rounded bg-red-100 text-red-800 text-sm">
                        ⚠️ هذه الحملة خاسرة - ROAS أقل من 2x. يُنصح بإيقافها أو تحسينها.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا توجد حملات إعلانية</p>
              <p className="text-sm text-muted-foreground mt-1">قم بربط حساب Meta Ads لعرض بيانات الحملات</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    red: "bg-red-100 text-red-600",
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
    green: "bg-green-100 text-green-600",
    orange: "bg-orange-100 text-orange-600",
  };
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}>{icon}</div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
