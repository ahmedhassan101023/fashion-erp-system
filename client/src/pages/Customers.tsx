import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Users, Plus, Mail, Phone, MapPin, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

function formatEGP(value: number): string {
  return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

export default function Customers() {
  const { data: customersList, isLoading, refetch } = trpc.customers.list.useQuery();
  const createCustomer = trpc.customers.create.useMutation({ onSuccess: () => { refetch(); toast.success("تم إضافة العميل"); } });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", city: "", country: "مصر", tags: "", notes: "" });

  if (isLoading) return <div className="p-6 space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة العملاء (CRM)</h1>
          <p className="text-muted-foreground mt-1">قاعدة بيانات العملاء وتحليل سلوك الشراء</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 ml-2" />إضافة عميل</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>إضافة عميل جديد</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>الاسم</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اسم العميل" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>البريد الإلكتروني</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" /></div>
                <div><Label>الهاتف</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01xxxxxxxxx" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>المدينة</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="القاهرة" /></div>
                <div><Label>الدولة</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="مصر" /></div>
              </div>
              <div><Label>التصنيفات</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="VIP, عميل متكرر" /></div>
              <div><Label>ملاحظات</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="ملاحظات عن العميل" /></div>
              <Button className="w-full" onClick={() => {
                createCustomer.mutate(form);
                setShowAdd(false);
                setForm({ name: "", email: "", phone: "", city: "", country: "مصر", tags: "", notes: "" });
              }}>حفظ العميل</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي العملاء</p>
                <p className="text-2xl font-bold">{customersList?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المشتريات</p>
                <p className="text-2xl font-bold">{formatEGP(customersList?.reduce((s: number, c: any) => s + Number(c.totalSpent || 0), 0) || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">متوسط الطلبات/عميل</p>
                <p className="text-2xl font-bold">
                  {customersList && customersList.length > 0
                    ? (customersList.reduce((s: number, c: any) => s + Number(c.totalOrders || 0), 0) / customersList.length).toFixed(1)
                    : "0"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer List */}
      {customersList && customersList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customersList.map((customer: any) => (
            <Card key={customer.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-lg">{customer.name}</p>
                    {customer.tags && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">{customer.tags}</span>
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    {customer.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3 w-3" />{customer.email}
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3 w-3" />{customer.phone}
                      </div>
                    )}
                    {customer.city && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-3 w-3" />{customer.city}, {customer.country || "مصر"}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between pt-2 border-t text-sm">
                    <span className="text-muted-foreground">الطلبات: {customer.totalOrders || 0}</span>
                    <span className="font-bold">{formatEGP(Number(customer.totalSpent || 0))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">لا يوجد عملاء مسجلين</p>
            <p className="text-sm text-muted-foreground mt-1">أضف عملاءك يدوياً أو قم بربط Shopify لمزامنة العملاء تلقائياً</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
