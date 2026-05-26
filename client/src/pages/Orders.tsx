import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, TrendingUp, TrendingDown, Minus } from "lucide-react";

function formatEGP(value: number): string {
  return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

export default function Orders() {
  const { data: ordersList, isLoading } = trpc.orders.list.useQuery({ limit: 50, offset: 0 });
  const { data: profitability } = trpc.orders.listProfitability.useQuery();

  if (isLoading) return <div className="p-6 space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;

  // Profitability stats
  const profitable = profitability?.filter((p: any) => p.profitabilityStatus === "profitable").length || 0;
  const breakeven = profitability?.filter((p: any) => p.profitabilityStatus === "break_even").length || 0;
  const losing = profitability?.filter((p: any) => p.profitabilityStatus === "losing").length || 0;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">الطلبات وتحليل الربحية</h1>

      {/* Profitability Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-green-700">طلبات مربحة</p>
                <p className="text-3xl font-bold text-green-900">{profitable}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Minus className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-sm text-yellow-700">طلبات متعادلة</p>
                <p className="text-3xl font-bold text-yellow-900">{breakeven}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-red-700">طلبات خاسرة</p>
                <p className="text-3xl font-bold text-red-900">{losing}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader><CardTitle className="text-lg">قائمة الطلبات</CardTitle></CardHeader>
        <CardContent>
          {ordersList && ordersList.length > 0 ? (
            <div className="space-y-3">
              {ordersList.map((order: any) => {
                const profit = profitability?.find((p: any) => p.orderId === order.id);
                return (
                  <div key={order.id} className={`p-4 rounded-lg border hover:shadow-sm transition-shadow ${
                    profit?.profitabilityStatus === "losing" ? "border-red-200 bg-red-50/30" :
                    profit?.profitabilityStatus === "profitable" ? "border-green-200 bg-green-50/30" : ""
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold">#{order.orderId || order.id}</p>
                          <StatusBadge status={order.status} />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {order.customerName || "عميل"} • {new Date(order.orderDate).toLocaleDateString('ar-EG')}
                        </p>
                      </div>
                      <div className="text-left space-y-1">
                        <p className="font-bold text-lg">{formatEGP(Number(order.totalRevenue || 0))}</p>
                        {profit && (
                          <p className={`text-sm font-medium ${
                            profit.profitabilityStatus === "profitable" ? "text-green-600" :
                            profit.profitabilityStatus === "losing" ? "text-red-600" : "text-yellow-600"
                          }`}>
                            صافي: {formatEGP(Number(profit.netProfit || 0))}
                          </p>
                        )}
                      </div>
                    </div>
                    {profit && (
                      <div className="mt-3 pt-3 border-t grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                        <div><span>تكلفة المنتج:</span> <span className="font-medium text-foreground">{formatEGP(Number(profit.productCost || 0))}</span></div>
                        <div><span>تكلفة الشحن:</span> <span className="font-medium text-foreground">{formatEGP(Number(profit.shippingCost || 0))}</span></div>
                        <div><span>تكلفة الإعلان:</span> <span className="font-medium text-foreground">{formatEGP(Number(profit.customerAcquisitionCost || 0))}</span></div>
                        <div><span>رسوم البوابة:</span> <span className="font-medium text-foreground">{formatEGP(Number(profit.gatewayFee || 0))}</span></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا توجد طلبات</p>
              <p className="text-sm text-muted-foreground mt-1">قم بربط Shopify لمزامنة الطلبات تلقائياً</p>
            </div>
          )}
        </CardContent>
      </Card>
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
