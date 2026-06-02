import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity, Database, RefreshCw, CheckCircle2, XCircle,
  AlertTriangle, Clock, HardDrive, Zap, Trash2, Loader2
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${ok ? "bg-green-500" : "bg-red-500"}`} />
  );
}

function StatCard({ label, value, icon: Icon, color = "text-primary" }: {
  label: string; value: string | number; icon: any; color?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border bg-card">
      <div className={`p-2 rounded-lg bg-muted ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold text-sm">{value}</p>
      </div>
    </div>
  );
}

export default function SystemHealth() {
  const [cleanupDays, setCleanupDays] = useState(90);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch data
  const { data: shopifyConfig, refetch: refetchShopify } = trpc.integrations.getShopifyConfig.useQuery();
  const { data: syncLogs, refetch: refetchLogs } = trpc.integrations.getSyncLogs.useQuery();
  const { data: exportLogs, refetch: refetchExports } = trpc.reporting.getExportHistory.useQuery();
  const { data: dashData } = trpc.dashboard.getFinancialSummary.useQuery({ period: "30d" });

  const cleanupMutation = trpc.reporting.cleanupOldExports.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchExports();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchShopify(), refetchLogs(), refetchExports()]);
    setIsRefreshing(false);
    toast.success("تم تحديث البيانات");
  };

  const shopifyOk = shopifyConfig?.status === "active";
  const lastSync = syncLogs?.[0];
  const recentSyncOk = lastSync?.status === "completed";

  const totalExports = exportLogs?.length ?? 0;
  const recentExports = exportLogs?.filter((e: any) => {
    const d = new Date(e.generatedAt);
    return Date.now() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
  }).length ?? 0;

  return (
    <div className="space-y-6 p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            صحة النظام
          </h1>
          <p className="text-sm text-muted-foreground mt-1">مراقبة حالة التكاملات وقاعدة البيانات والملفات</p>
        </div>
        <Button variant="outline" onClick={handleRefreshAll} disabled={isRefreshing}>
          {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <RefreshCw className="h-4 w-4 ml-2" />}
          تحديث
        </Button>
      </div>

      {/* Status overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="قاعدة البيانات"
          value={dashData !== undefined ? "متصلة ✅" : "جاري الفحص..."}
          icon={Database}
          color={dashData !== undefined ? "text-green-600" : "text-yellow-600"}
        />
        <StatCard
          label="Shopify"
          value={shopifyConfig ? (shopifyOk ? "متصل ✅" : "خطأ ❌") : "غير مربوط"}
          icon={Zap}
          color={shopifyOk ? "text-green-600" : "text-red-600"}
        />
        <StatCard
          label="آخر مزامنة"
          value={lastSync ? (recentSyncOk ? "ناجحة ✅" : "فشلت ❌") : "لا توجد"}
          icon={RefreshCw}
          color={recentSyncOk ? "text-green-600" : "text-red-600"}
        />
        <StatCard
          label="التقارير المحفوظة"
          value={`${totalExports} تقرير`}
          icon={HardDrive}
        />
      </div>

      {/* Shopify Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <StatusDot ok={shopifyOk} />
            حالة Shopify
          </CardTitle>
        </CardHeader>
        <CardContent>
          {shopifyConfig ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">المتجر: </span>
                  <span className="font-medium">{shopifyConfig.shopName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">الحالة: </span>
                  <Badge variant="outline" className={shopifyOk
                    ? "bg-green-100 text-green-800 border-green-200"
                    : "bg-red-100 text-red-800 border-red-200"
                  }>
                    {shopifyOk ? "نشط" : "خطأ"}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">آخر مزامنة: </span>
                  <span className="font-medium">
                    {shopifyConfig.lastSyncDate
                      ? new Date(shopifyConfig.lastSyncDate).toLocaleString("ar-EG")
                      : "لم تتم بعد"}
                  </span>
                </div>
              </div>
              {shopifyConfig.syncErrorMessage && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  <strong>آخر خطأ:</strong> {shopifyConfig.syncErrorMessage}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">لم يتم ربط Shopify بعد. اذهب إلى الإعدادات → الربط.</p>
          )}
        </CardContent>
      </Card>

      {/* Sync Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            سجل المزامنة الأخيرة
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!syncLogs ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : syncLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">لا توجد سجلات مزامنة</p>
          ) : (
            <div className="rounded-xl border divide-y text-sm">
              {syncLogs.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    {log.status === "completed"
                      ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                      : log.status === "failed"
                      ? <XCircle className="h-4 w-4 text-red-500" />
                      : <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    }
                    <span className="font-medium">
                      {log.syncType === "orders" ? "مزامنة الطلبات" : "مزامنة المنتجات"}
                    </span>
                    {log.itemsProcessed != null && (
                      <span className="text-muted-foreground">{log.itemsProcessed} عنصر</span>
                    )}
                    {log.errorMessage && (
                      <span className="text-red-500 text-xs truncate max-w-48">{log.errorMessage}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString("ar-EG")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export History & File Retention */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            إدارة ملفات التقارير
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 rounded-xl bg-muted/50 border">
              <p className="text-muted-foreground text-xs">إجمالي التقارير</p>
              <p className="text-2xl font-bold mt-1">{totalExports}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/50 border">
              <p className="text-muted-foreground text-xs">تقارير آخر 7 أيام</p>
              <p className="text-2xl font-bold mt-1">{recentExports}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/50 border">
              <p className="text-muted-foreground text-xs">أقدم تقرير</p>
              <p className="text-sm font-medium mt-1">
                {exportLogs && exportLogs.length > 0
                  ? new Date(exportLogs[exportLogs.length - 1].generatedAt).toLocaleDateString("ar-EG")
                  : "—"}
              </p>
            </div>
          </div>

          {/* Cleanup controls */}
          <div className="flex items-center gap-3 p-4 rounded-xl border bg-orange-50/50">
            <Trash2 className="h-5 w-5 text-orange-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">تنظيف الملفات القديمة</p>
              <p className="text-xs text-muted-foreground">حذف سجلات التقارير الأقدم من عدد معين من الأيام</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={cleanupDays}
                onChange={(e) => setCleanupDays(Number(e.target.value))}
                className="text-sm border rounded-lg px-2 py-1.5 bg-background"
              >
                <option value={30}>30 يوم</option>
                <option value={60}>60 يوم</option>
                <option value={90}>90 يوم</option>
                <option value={180}>180 يوم</option>
                <option value={365}>سنة</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => cleanupMutation.mutate({ olderThanDays: cleanupDays })}
                disabled={cleanupMutation.isPending}
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                {cleanupMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "تنظيف"}
              </Button>
            </div>
          </div>

          {/* Recent exports table */}
          {exportLogs && exportLogs.length > 0 && (
            <div className="rounded-xl border divide-y text-sm">
              {exportLogs.slice(0, 8).map((exp: any) => (
                <div key={exp.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      {exp.format?.toUpperCase()}
                    </Badge>
                    <span className="font-medium truncate max-w-48">{exp.fileName}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(exp.generatedAt).toLocaleString("ar-EG")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
