import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, TrendingUp, TrendingDown, AlertTriangle, Package, DollarSign, BarChart3, Zap } from "lucide-react";

function formatEGP(amount: number) {
  return `${amount.toLocaleString("ar-EG")} ج.م`;
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: "bg-red-500/10 text-red-500 border-red-500/20",
    high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    warning: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    info: "bg-green-500/10 text-green-500 border-green-500/20",
  };
  const labels: Record<string, string> = {
    critical: "حرج",
    high: "مرتفع",
    medium: "متوسط",
    warning: "تحذير",
    low: "منخفض",
    info: "معلومات",
  };
  return (
    <Badge variant="outline" className={colors[severity] || colors.info}>
      {labels[severity] || severity}
    </Badge>
  );
}

function RiskLevelIndicator({ level, score }: { level: string; score: number }) {
  const colors: Record<string, string> = {
    critical: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-yellow-500",
    low: "bg-green-500",
  };
  return (
    <div className="flex items-center gap-2">
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={`h-2 rounded-full ${colors[level] || "bg-blue-500"}`}
          style={{ width: `${Math.min(score * 100, 100)}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{Math.round(score * 100)}%</span>
    </div>
  );
}

export default function AIInsights() {
  const { data: insights, isLoading } = trpc.aiInsights.getInsights.useQuery();
  const { data: events } = trpc.notifications.getEvents.useQuery({ limit: 10 });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" dir="rtl">
        <div className="flex items-center gap-3 mb-6">
          <Brain className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">الذكاء الاصطناعي</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const anomalies = insights?.anomalies || [];
  const cashflowForecast = insights?.cashflowForecast;
  const inventoryAlerts = insights?.inventoryAlerts || [];
  const recommendations = insights?.recommendations || [];

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">الذكاء الاصطناعي</h1>
            <p className="text-sm text-muted-foreground">تحليلات ذكية وتنبؤات مبنية على بيانات عملك</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">تنبيهات نشطة</p>
              <p className="text-2xl font-bold">{anomalies.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Package className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">تنبيهات المخزون</p>
              <p className="text-2xl font-bold">{inventoryAlerts.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Zap className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">توصيات</p>
              <p className="text-2xl font-bold">{recommendations.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <DollarSign className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">مدة السيولة</p>
              <p className="text-2xl font-bold">
                {cashflowForecast?.scenarios?.realistic?.runwayDays
                  ? `${Math.round(cashflowForecast.scenarios.realistic.runwayDays)} يوم`
                  : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cashflow Forecast */}
      {cashflowForecast && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              توقعات التدفق النقدي (30 يوم)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Best Case */}
              <div className="p-4 rounded-lg border border-green-500/20 bg-green-500/5">
                <p className="text-sm font-medium text-green-600 mb-2">أفضل سيناريو</p>
                <p className="text-lg font-bold">{formatEGP(cashflowForecast.scenarios.bestCase.netCashflow)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  وارد: {formatEGP(cashflowForecast.scenarios.bestCase.incomingCash)}
                </p>
                <p className="text-xs text-muted-foreground">
                  صادر: {formatEGP(cashflowForecast.scenarios.bestCase.outgoingCash)}
                </p>
                <div className="mt-2">
                  <RiskLevelIndicator level={cashflowForecast.scenarios.bestCase.riskLevel} score={cashflowForecast.scenarios.bestCase.liquidityRiskScore} />
                </div>
              </div>
              {/* Realistic */}
              <div className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/5">
                <p className="text-sm font-medium text-blue-600 mb-2">السيناريو الواقعي</p>
                <p className="text-lg font-bold">{formatEGP(cashflowForecast.scenarios.realistic.netCashflow)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  وارد: {formatEGP(cashflowForecast.scenarios.realistic.incomingCash)}
                </p>
                <p className="text-xs text-muted-foreground">
                  صادر: {formatEGP(cashflowForecast.scenarios.realistic.outgoingCash)}
                </p>
                <div className="mt-2">
                  <RiskLevelIndicator level={cashflowForecast.scenarios.realistic.riskLevel} score={cashflowForecast.scenarios.realistic.liquidityRiskScore} />
                </div>
              </div>
              {/* Worst Case */}
              <div className="p-4 rounded-lg border border-red-500/20 bg-red-500/5">
                <p className="text-sm font-medium text-red-600 mb-2">أسوأ سيناريو</p>
                <p className="text-lg font-bold">{formatEGP(cashflowForecast.scenarios.worstCase.netCashflow)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  وارد: {formatEGP(cashflowForecast.scenarios.worstCase.incomingCash)}
                </p>
                <p className="text-xs text-muted-foreground">
                  صادر: {formatEGP(cashflowForecast.scenarios.worstCase.outgoingCash)}
                </p>
                <div className="mt-2">
                  <RiskLevelIndicator level={cashflowForecast.scenarios.worstCase.riskLevel} score={cashflowForecast.scenarios.worstCase.liquidityRiskScore} />
                </div>
              </div>
            </div>
            {cashflowForecast.expectedCashShortageAlerts.length > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                <p className="text-sm font-medium text-red-600 mb-2">تنبيهات نقص السيولة</p>
                {cashflowForecast.expectedCashShortageAlerts.map((alert: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span className="text-sm">{alert.title}</span>
                    <SeverityBadge severity={alert.severity} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Anomaly Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            تنبيهات الشذوذ المالي
          </CardTitle>
        </CardHeader>
        <CardContent>
          {anomalies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد تنبيهات شذوذ حالياً - الأداء المالي طبيعي</p>
            </div>
          ) : (
            <div className="space-y-3">
              {anomalies.map((anomaly: any, i: number) => (
                <div key={i} className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={anomaly.severity} />
                      <span className="font-medium">{anomaly.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      ثقة: {Math.round(anomaly.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{anomaly.description}</p>
                  {anomaly.recommendedAction && (
                    <p className="text-sm text-primary">💡 {anomaly.recommendedAction}</p>
                  )}
                  {anomaly.financialImpact > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      الأثر المالي: {formatEGP(anomaly.financialImpact)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inventory Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            تنبيهات المخزون الذكية
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inventoryAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد تنبيهات مخزون - المستويات ضمن الحدود الطبيعية</p>
            </div>
          ) : (
            <div className="space-y-3">
              {inventoryAlerts.map((alert: any, i: number) => (
                <div key={i} className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={alert.severity} />
                      <span className="font-medium">{alert.title}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                  {alert.recommendedAction && (
                    <p className="text-sm text-primary">💡 {alert.recommendedAction}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            توصيات الذكاء الاصطناعي
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recommendations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد توصيات حالياً - سيتم تحليل البيانات تلقائياً</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.map((rec: any, i: number) => (
                <div key={i} className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={rec.priority} />
                      <span className="font-medium">{rec.title}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">{rec.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                  {rec.actionItems && rec.actionItems.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {rec.actionItems.slice(0, 3).map((item: string, j: number) => (
                        <p key={j} className="text-xs text-muted-foreground">• {item}</p>
                      ))}
                    </div>
                  )}
                  {rec.estimatedImpact && (
                    <p className="text-xs text-green-600 mt-2">
                      الأثر المتوقع: {formatEGP(rec.estimatedImpact)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Business Events */}
      {events && events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              آخر الأحداث
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {events.map((event: any) => (
                <div key={event.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={event.severity} />
                    <span className="text-sm">{event.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.createdAt).toLocaleDateString("ar-EG")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
