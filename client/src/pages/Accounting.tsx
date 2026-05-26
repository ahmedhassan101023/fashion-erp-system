import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Wallet, Plus, Building2, Receipt, BookOpen } from "lucide-react";
import { toast } from "sonner";

function formatEGP(value: number): string {
  return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

export default function Accounting() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">المحاسبة والمالية</h1>

      <Tabs defaultValue="capital" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="capital">رأس المال</TabsTrigger>
          <TabsTrigger value="expenses">المصاريف اليومية</TabsTrigger>
          <TabsTrigger value="suppliers">دفتر الموردين</TabsTrigger>
          <TabsTrigger value="journal">القيود المحاسبية</TabsTrigger>
        </TabsList>

        <TabsContent value="capital"><CapitalSection /></TabsContent>
        <TabsContent value="expenses"><ExpensesSection /></TabsContent>
        <TabsContent value="suppliers"><SuppliersSection /></TabsContent>
        <TabsContent value="journal"><JournalSection /></TabsContent>
      </Tabs>
    </div>
  );
}

function CapitalSection() {
  const { data: capitalList, isLoading, refetch } = trpc.capital.list.useQuery();
  const { data: totalCapital } = trpc.capital.getTotal.useQuery();
  const addCapital = trpc.capital.add.useMutation({ onSuccess: () => { refetch(); toast.success("تم إضافة رأس المال"); } });
  const [showAdd, setShowAdd] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  if (isLoading) return <Skeleton className="h-40" />;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <Card className="flex-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي رأس المال</p>
                <p className="text-3xl font-bold">{formatEGP(totalCapital?.total || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="mr-4"><Plus className="h-4 w-4 ml-2" />إضافة رأس مال</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>إضافة رأس مال</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>المبلغ (ج.م)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50000" /></div>
              <div><Label>الوصف</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="ضخ رأس مال جديد" /></div>
              <Button className="w-full" onClick={() => {
                addCapital.mutate({ amount, description });
                setShowAdd(false);
                setAmount(""); setDescription("");
              }}>حفظ</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">سجل رأس المال</CardTitle></CardHeader>
        <CardContent>
          {capitalList && capitalList.length > 0 ? (
            <div className="space-y-2">
              {capitalList.map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{entry.description || "ضخ رأس مال"}</p>
                    <p className="text-sm text-muted-foreground">{new Date(entry.entryDate).toLocaleDateString('ar-EG')}</p>
                  </div>
                  <p className="font-bold text-green-600">+{formatEGP(Number(entry.amount))}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">لا توجد إدخالات رأس مال</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ExpensesSection() {
  const { data: expenses, isLoading, refetch } = trpc.expenses.list.useQuery();
  const { data: byCategory } = trpc.expenses.getByCategory.useQuery();
  const addExpense = trpc.expenses.add.useMutation({ onSuccess: () => { refetch(); toast.success("تم تسجيل المصروف"); } });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ amount: "", category: "", description: "" });

  const categories = ["إيجار", "رواتب", "شحن", "تسويق", "مواد خام", "صيانة", "اشتراكات", "أخرى"];

  if (isLoading) return <Skeleton className="h-40" />;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">المصاريف اليومية</h2>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 ml-2" />تسجيل مصروف</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>تسجيل مصروف جديد</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>المبلغ (ج.م)</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="500" /></div>
              <div>
                <Label>الفئة</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر الفئة" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>الوصف</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="وصف المصروف" /></div>
              <Button className="w-full" onClick={() => {
                addExpense.mutate(form);
                setShowAdd(false);
                setForm({ amount: "", category: "", description: "" });
              }}>حفظ</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Breakdown */}
      {byCategory && byCategory.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {byCategory.map((cat: any) => (
            <Card key={cat.category}>
              <CardContent className="pt-4 text-center">
                <p className="text-sm text-muted-foreground">{cat.category}</p>
                <p className="text-lg font-bold">{formatEGP(Number(cat.total || 0))}</p>
                <p className="text-xs text-muted-foreground">{cat.count} عملية</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Expense List */}
      <Card>
        <CardContent className="pt-6">
          {expenses && expenses.length > 0 ? (
            <div className="space-y-2">
              {expenses.map((exp: any) => (
                <div key={exp.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{exp.description}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{exp.category}</span>
                      <span className="text-xs text-muted-foreground">{new Date(exp.expenseDate).toLocaleDateString('ar-EG')}</span>
                    </div>
                  </div>
                  <p className="font-bold text-red-600">-{formatEGP(Number(exp.amount))}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">لا توجد مصاريف مسجلة</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SuppliersSection() {
  const { data: suppliersList, isLoading, refetch } = trpc.suppliers.list.useQuery();
  const createSupplier = trpc.suppliers.create.useMutation({ onSuccess: () => { refetch(); toast.success("تم إضافة المورد"); } });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", contactPerson: "", phone: "", email: "" });

  if (isLoading) return <Skeleton className="h-40" />;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">دفتر الموردين</h2>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 ml-2" />إضافة مورد</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>إضافة مورد جديد</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>اسم المورد</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اسم المورد" /></div>
              <div><Label>جهة الاتصال</Label><Input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} placeholder="اسم جهة الاتصال" /></div>
              <div><Label>الهاتف</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01xxxxxxxxx" /></div>
              <div><Label>البريد الإلكتروني</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="supplier@example.com" /></div>
              <Button className="w-full" onClick={() => {
                createSupplier.mutate(form);
                setShowAdd(false);
                setForm({ name: "", contactPerson: "", phone: "", email: "" });
              }}>حفظ</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {suppliersList && suppliersList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suppliersList.map((supplier: any) => (
            <Card key={supplier.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{supplier.name}</p>
                    {supplier.contactPerson && <p className="text-sm text-muted-foreground">{supplier.contactPerson}</p>}
                    {supplier.phone && <p className="text-sm text-muted-foreground">{supplier.phone}</p>}
                    <div className="flex justify-between mt-2 pt-2 border-t">
                      <span className="text-sm text-muted-foreground">الرصيد:</span>
                      <span className={`font-bold ${Number(supplier.balance || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatEGP(Number(supplier.balance || 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">لا يوجد موردين مسجلين</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function JournalSection() {
  const { data: entries, isLoading } = trpc.accounting.getJournalEntries.useQuery({ limit: 20 });

  if (isLoading) return <Skeleton className="h-40" />;

  return (
    <div className="space-y-4 mt-4">
      <h2 className="text-lg font-semibold">القيود المحاسبية</h2>
      <Card>
        <CardContent className="pt-6">
          {entries && entries.length > 0 ? (
            <div className="space-y-2">
              {entries.map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{entry.description || `قيد #${entry.id}`}</p>
                    <p className="text-sm text-muted-foreground">{new Date(entry.entryDate).toLocaleDateString('ar-EG')}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold">{formatEGP(Number(entry.totalAmount || 0))}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${entry.status === "posted" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                      {entry.status === "posted" ? "مرحّل" : "مسودة"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا توجد قيود محاسبية</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
