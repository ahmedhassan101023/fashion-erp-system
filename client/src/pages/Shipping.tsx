import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Truck, Package, CheckCircle2, XCircle, Clock } from "lucide-react";

function formatEGP(value: number): string {
  return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

export default function Shipping() {
  const { data: ordersList, isLoading } = trpc.orders.list.useQuery({ limit: 50, offset: 0 });

  if (isLoading) return <div className="p-6 space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;

  const orders = ordersList || [];
  const shipped = orders.filter((o: any) => o.fulfillmentStatus === "shipped");
  const delivered = orders.filter((o: any) => o.fulfillmentStatus === "delivered");
  const pending = orders.filter((o: any) => o.fulfillmentStatus === "pending" || o.fulfillmentStatus === "unfulfilled");
  const failed = orders.filter((o: any) => o.status === "cancelled");
  const codOrders = orders.filter((o: any) => o.paymentMethod === "cod");
  const codTotal = codOrders.reduce((s: number, o: any) => s + Number(o.totalRevenue || 0), 0);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">إدارة الشحن والتوصيل</h1>

      {/* Shipping Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">قيد الانتظار</p>
                <p className="text-xl font-bold">{pending.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Truck className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">في الطريق</p>
                <p className="text-xl font-bold">{shipped.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">تم التسليم</p>
                <p className="text-xl font-bold">{delivered.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">فشل التسليم</p>
                <p className="text-xl font-bold">{failed.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">COD مستحق</p>
                <p className="text-xl font-bold">{formatEGP(codTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* COD Reconciliation */}
      {codOrders.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">تسوية الدفع عند الاستلام (COD)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {codOrders.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border bg-purple-50/30">
                  <div>
                    <p className="font-medium">طلب #{order.orderId || order.id}</p>
                    <p className="text-sm text-muted-foreground">{order.customerName} • {new Date(order.orderDate).toLocaleDateString('ar-EG')}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold">{formatEGP(Number(order.totalRevenue || 0))}</p>
                    <FulfillmentBadge status={order.fulfillmentStatus} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Shipments */}
      <Card>
        <CardHeader><CardTitle className="text-lg">جميع الشحنات</CardTitle></CardHeader>
        <CardContent>
          {orders.length > 0 ? (
            <div className="space-y-3">
              {orders.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-3">
                    <ShipmentIcon status={order.fulfillmentStatus} />
                    <div>
                      <p className="font-medium">طلب #{order.orderId || order.id}</p>
                      <p className="text-sm text-muted-foreground">{order.customerName} • {order.shippingCity || "غير محدد"}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <FulfillmentBadge status={order.fulfillmentStatus} />
                    <p className="text-sm text-muted-foreground mt-1">{new Date(order.orderDate).toLocaleDateString('ar-EG')}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا توجد شحنات</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FulfillmentBadge({ status }: { status: string | null }) {
  const map: Record<string, { label: string; color: string }> = {
    pending: { label: "قيد الانتظار", color: "bg-yellow-100 text-yellow-800" },
    unfulfilled: { label: "لم يُشحن", color: "bg-gray-100 text-gray-800" },
    shipped: { label: "في الطريق", color: "bg-blue-100 text-blue-800" },
    delivered: { label: "تم التسليم", color: "bg-green-100 text-green-800" },
    returned: { label: "مرتجع", color: "bg-red-100 text-red-800" },
  };
  const s = map[status || "pending"] || map.pending;
  return <span className={`text-xs px-2 py-1 rounded-full ${s.color}`}>{s.label}</span>;
}

function ShipmentIcon({ status }: { status: string | null }) {
  switch (status) {
    case "delivered": return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case "shipped": return <Truck className="h-5 w-5 text-blue-500" />;
    case "returned": return <XCircle className="h-5 w-5 text-red-500" />;
    default: return <Clock className="h-5 w-5 text-yellow-500" />;
  }
}
