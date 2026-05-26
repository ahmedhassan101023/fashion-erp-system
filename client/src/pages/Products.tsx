import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Package, Plus, Calculator } from "lucide-react";
import { toast } from "sonner";

function formatEGP(value: number): string {
  return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

export default function Products() {
  const { data: productsList, isLoading, refetch } = trpc.products.list.useQuery();
  const createProduct = trpc.products.create.useMutation({ onSuccess: () => { refetch(); toast.success("تم إضافة المنتج بنجاح"); } });
  const [showAdd, setShowAdd] = useState(false);
  const [newProduct, setNewProduct] = useState({ sku: "", name: "", category: "", description: "" });

  if (isLoading) return <div className="p-6 space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة المنتجات</h1>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 ml-2" />إضافة منتج</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>إضافة منتج جديد</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>SKU</Label><Input value={newProduct.sku} onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} placeholder="SKU-001" /></div>
              <div><Label>اسم المنتج</Label><Input value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="اسم المنتج" /></div>
              <div><Label>الفئة</Label><Input value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} placeholder="ملابس نسائية" /></div>
              <div><Label>الوصف</Label><Input value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} placeholder="وصف المنتج" /></div>
              <Button className="w-full" onClick={() => {
                createProduct.mutate(newProduct);
                setShowAdd(false);
                setNewProduct({ sku: "", name: "", category: "", description: "" });
              }}>حفظ المنتج</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {productsList && productsList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {productsList.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">لا توجد منتجات</p>
            <p className="text-sm text-muted-foreground mt-1">أضف منتجاتك لبدء تتبع التكاليف والأرباح</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: any }) {
  const { data: costs } = trpc.products.getCosts.useQuery({ productId: product.id });
  const [showCosts, setShowCosts] = useState(false);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{product.name}</CardTitle>
          <span className={`text-xs px-2 py-1 rounded-full ${product.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
            {product.status === "active" ? "نشط" : "غير نشط"}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">SKU:</span><span className="font-mono">{product.sku}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">الفئة:</span><span>{product.category || "—"}</span></div>
          {costs && (
            <>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between"><span className="text-muted-foreground">التكلفة الإجمالية:</span><span className="font-bold">{formatEGP(Number(costs.totalCost || 0))}</span></div>
              </div>
            </>
          )}
        </div>
        <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => setShowCosts(!showCosts)}>
          <Calculator className="h-4 w-4 ml-2" />تفاصيل التكاليف
        </Button>
        {showCosts && costs && (
          <div className="mt-3 p-3 rounded-lg bg-muted/50 space-y-1 text-sm">
            <CostRow label="القماش" value={Number(costs.fabricCost || 0)} />
            <CostRow label="التصنيع" value={Number(costs.manufacturingCost || 0)} />
            <CostRow label="التغليف" value={Number(costs.packagingCost || 0)} />
            <CostRow label="الشحن" value={Number(costs.shippingCost || 0)} />
            <CostRow label="التسويق" value={Number(costs.marketingCost || 0)} />
            <CostRow label="المؤثرين" value={Number(costs.influencerCost || 0)} />
            <CostRow label="المصاريف العامة" value={Number(costs.overheadAllocation || 0)} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CostRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}:</span>
      <span>{formatEGP(value)}</span>
    </div>
  );
}
