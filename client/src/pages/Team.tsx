import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import {
  Users, Plus, CheckCircle2, Clock, AlertCircle, StickyNote,
  UserPlus, Shield, Mail, Key, Trash2, Edit, MoreVertical,
  Crown, Lock, Unlock, Eye, EyeOff
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

// ============ PERMISSION DEFINITIONS ============
const PERMISSION_GROUPS = [
  {
    group: "المالية والمحاسبة",
    permissions: [
      { id: "view_financials", label: "عرض التقارير المالية" },
      { id: "manage_cashflow", label: "إدارة التدفقات النقدية" },
      { id: "view_accounting", label: "عرض دفتر الأستاذ" },
      { id: "manage_expenses", label: "إدارة المصروفات" },
    ],
  },
  {
    group: "الطلبات والمخزون",
    permissions: [
      { id: "view_orders", label: "عرض الطلبات" },
      { id: "manage_orders", label: "إدارة الطلبات" },
      { id: "view_inventory", label: "عرض المخزون" },
      { id: "manage_inventory", label: "إدارة المخزون" },
    ],
  },
  {
    group: "الإعلانات والتسويق",
    permissions: [
      { id: "view_ads", label: "عرض بيانات الإعلانات" },
      { id: "manage_ads", label: "إدارة الحملات الإعلانية" },
      { id: "view_analytics", label: "عرض التحليلات" },
    ],
  },
  {
    group: "الإعدادات",
    permissions: [
      { id: "manage_products", label: "إدارة المنتجات" },
      { id: "manage_suppliers", label: "إدارة الموردين" },
      { id: "view_reports", label: "عرض التقارير" },
      { id: "export_data", label: "تصدير البيانات" },
    ],
  },
];

const ROLE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  owner: { label: "المالك", color: "bg-amber-100 text-amber-800 border-amber-200", icon: "👑" },
  admin: { label: "مدير", color: "bg-purple-100 text-purple-800 border-purple-200", icon: "🛡️" },
  accountant: { label: "محاسب", color: "bg-blue-100 text-blue-800 border-blue-200", icon: "📊" },
  media_buyer: { label: "مسؤول إعلانات", color: "bg-pink-100 text-pink-800 border-pink-200", icon: "📢" },
  operations: { label: "عمليات", color: "bg-green-100 text-green-800 border-green-200", icon: "⚙️" },
  customer_support: { label: "دعم العملاء", color: "bg-teal-100 text-teal-800 border-teal-200", icon: "🎧" },
  inventory_manager: { label: "مدير المخزون", color: "bg-orange-100 text-orange-800 border-orange-200", icon: "📦" },
};

export default function Team() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">إدارة الفريق</h1>
          <p className="text-sm text-muted-foreground">إدارة أعضاء الفريق والصلاحيات والمهام</p>
        </div>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="members" className="gap-2"><Users className="h-4 w-4" />أعضاء الفريق</TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2"><CheckCircle2 className="h-4 w-4" />المهام</TabsTrigger>
          <TabsTrigger value="notes" className="gap-2"><StickyNote className="h-4 w-4" />الملاحظات</TabsTrigger>
        </TabsList>

        <TabsContent value="members"><MembersSection /></TabsContent>
        <TabsContent value="tasks"><TasksSection /></TabsContent>
        <TabsContent value="notes"><NotesSection /></TabsContent>
      </Tabs>
    </div>
  );
}

// ============ MEMBERS SECTION ============
function MembersSection() {
  const { user } = useAuth();
  const { data: members, isLoading, refetch } = trpc.team.getMembers.useQuery();
  const removeMember = trpc.team.removeMember.useMutation({
    onSuccess: () => { refetch(); toast.success("تم حذف العضو"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMember = trpc.team.updateMember.useMutation({
    onSuccess: () => { refetch(); toast.success("تم تحديث بيانات العضو"); },
  });

  const [showInvite, setShowInvite] = useState(false);
  const [showCredentials, setShowCredentials] = useState<{ email: string; password: string } | null>(null);

  if (isLoading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
      {[1,2,3].map(i => <Skeleton key={i} className="h-40" />)}
    </div>
  );

  const isOwner = (user?.role as string) === 'owner' || (user?.role as string) === 'admin';

  return (
    <div className="space-y-4 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{members?.length || 0} عضو</span>
        </div>
        {isOwner && (
          <Dialog open={showInvite} onOpenChange={setShowInvite}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                دعوة عضو جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  دعوة عضو فريق جديد
                </DialogTitle>
              </DialogHeader>
              <InviteForm
                onSuccess={(creds) => {
                  setShowInvite(false);
                  setShowCredentials(creds);
                  refetch();
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Credentials Dialog */}
      {showCredentials && (
        <Dialog open={!!showCredentials} onOpenChange={() => setShowCredentials(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                تمت الدعوة بنجاح
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">تم إرسال بيانات الدخول إليك عبر الإشعارات. يرجى مشاركتها مع العضو الجديد:</p>
              <div className="rounded-xl border bg-muted/50 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
                    <p className="font-mono font-medium">{showCredentials.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">كلمة المرور المؤقتة</p>
                    <p className="font-mono font-bold text-lg tracking-widest">{showCredentials.password}</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3">
                ⚠️ يرجى مشاركة هذه البيانات مع العضو بشكل آمن وطلب تغيير كلمة المرور عند أول تسجيل دخول.
              </p>
              <Button className="w-full" onClick={() => setShowCredentials(null)}>حسناً، تم الحفظ</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Members Grid */}
      {members && members.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member: any) => {
            const roleInfo = ROLE_LABELS[member.role] || ROLE_LABELS.operations;
            const isCurrentUser = member.openId === user?.openId;
            const isPending = member.teamMember?.status === 'pending';

            return (
              <Card key={member.id} className={`relative transition-all hover:shadow-md ${isPending ? 'border-dashed opacity-75' : ''}`}>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-xl">
                        {roleInfo.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{member.name || "مستخدم"}</p>
                          {isCurrentUser && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">أنت</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{member.email || "—"}</p>
                      </div>
                    </div>

                    {isOwner && !isCurrentUser && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {member.teamMember && (
                            <>
                              {member.teamMember.status === 'active' ? (
                                <DropdownMenuItem onClick={() => updateMember.mutate({ id: member.teamMember.id, status: 'suspended' })}>
                                  <Lock className="h-4 w-4 ml-2" />تعليق الحساب
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => updateMember.mutate({ id: member.teamMember.id, status: 'active' })}>
                                  <Unlock className="h-4 w-4 ml-2" />تفعيل الحساب
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => { if (confirm('هل أنت متأكد من حذف هذا العضو؟')) removeMember.mutate({ id: member.teamMember.id }); }}
                              >
                                <Trash2 className="h-4 w-4 ml-2" />حذف العضو
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${roleInfo.color}`}>
                      {roleInfo.label}
                    </span>
                    {isPending && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
                        في الانتظار
                      </span>
                    )}
                    {member.teamMember?.status === 'suspended' && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-800 border border-red-200">
                        معلق
                      </span>
                    )}
                  </div>

                  {member.teamMember?.permissions && member.teamMember.permissions.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-1.5">الصلاحيات ({member.teamMember.permissions.length})</p>
                      <div className="flex flex-wrap gap-1">
                        {member.teamMember.permissions.slice(0, 3).map((p: string) => (
                          <span key={p} className="text-xs bg-muted px-2 py-0.5 rounded">
                            {PERMISSION_GROUPS.flatMap(g => g.permissions).find(x => x.id === p)?.label || p}
                          </span>
                        ))}
                        {member.teamMember.permissions.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{member.teamMember.permissions.length - 3}</span>
                        )}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-3">
                    انضم {new Date(member.createdAt).toLocaleDateString('ar-EG')}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">لا يوجد أعضاء في الفريق</p>
            <p className="text-sm text-muted-foreground mt-1">ابدأ بدعوة أول عضو في فريقك</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============ INVITE FORM ============
function InviteForm({ onSuccess }: { onSuccess: (creds: { email: string; password: string }) => void }) {
  const inviteMember = trpc.team.inviteMember.useMutation({
    onSuccess: (data) => {
      if (data.tempPassword) {
        onSuccess({ email: data.email, password: data.tempPassword });
        toast.success("تمت الدعوة بنجاح");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "operations" as const,
    permissions: [] as string[],
    notes: "",
  });

  const togglePermission = (id: string) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(id)
        ? f.permissions.filter(p => p !== id)
        : [...f.permissions, id],
    }));
  };

  const selectAllInGroup = (groupPermissions: string[]) => {
    const allSelected = groupPermissions.every(p => form.permissions.includes(p));
    if (allSelected) {
      setForm(f => ({ ...f, permissions: f.permissions.filter(p => !groupPermissions.includes(p)) }));
    } else {
      setForm(f => ({ ...f, permissions: [...new Set([...f.permissions, ...groupPermissions])] }));
    }
  };

  return (
    <div className="space-y-5">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>الاسم الكامل <span className="text-destructive">*</span></Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="محمد أحمد"
          />
        </div>
        <div className="space-y-1.5">
          <Label>البريد الإلكتروني <span className="text-destructive">*</span></Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="member@example.com"
            dir="ltr"
          />
        </div>
      </div>

      {/* Role */}
      <div className="space-y-1.5">
        <Label>الدور الوظيفي <span className="text-destructive">*</span></Label>
        <Select value={form.role} onValueChange={(v: any) => setForm({ ...form, role: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">🛡️ مدير</SelectItem>
            <SelectItem value="accountant">📊 محاسب</SelectItem>
            <SelectItem value="media_buyer">📢 مسؤول إعلانات</SelectItem>
            <SelectItem value="operations">⚙️ عمليات</SelectItem>
            <SelectItem value="customer_support">🎧 دعم العملاء</SelectItem>
            <SelectItem value="inventory_manager">📦 مدير المخزون</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Permissions */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <Label>الصلاحيات</Label>
          <span className="text-xs text-muted-foreground">({form.permissions.length} محدد)</span>
        </div>
        <div className="rounded-xl border divide-y">
          {PERMISSION_GROUPS.map((group) => {
            const groupIds = group.permissions.map(p => p.id);
            const allSelected = groupIds.every(id => form.permissions.includes(id));
            const someSelected = groupIds.some(id => form.permissions.includes(id));
            return (
              <div key={group.group} className="p-3">
                <div
                  className="flex items-center gap-2 mb-2 cursor-pointer"
                  onClick={() => selectAllInGroup(groupIds)}
                >
                  <Checkbox checked={allSelected} data-state={someSelected && !allSelected ? "indeterminate" : undefined} />
                  <span className="text-sm font-medium">{group.group}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mr-6">
                  {group.permissions.map((perm) => (
                    <label key={perm.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={form.permissions.includes(perm.id)}
                        onCheckedChange={() => togglePermission(perm.id)}
                      />
                      <span className="text-sm text-muted-foreground">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label>ملاحظات (اختياري)</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="أي ملاحظات إضافية عن العضو..."
          rows={2}
        />
      </div>

      {/* Info Box */}
      <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-sm text-blue-700">
        <p className="font-medium mb-1">📧 كيف يعمل النظام؟</p>
        <p className="text-xs">سيتم إنشاء كلمة مرور مؤقتة تلقائياً وإرسالها إليك عبر الإشعارات. شاركها مع العضو الجديد ليتمكن من تسجيل الدخول.</p>
      </div>

      <Button
        className="w-full"
        onClick={() => inviteMember.mutate(form)}
        disabled={!form.name || !form.email || inviteMember.isPending}
      >
        {inviteMember.isPending ? (
          <span className="flex items-center gap-2"><span className="animate-spin">⏳</span> جاري الإنشاء...</span>
        ) : (
          <span className="flex items-center gap-2"><UserPlus className="h-4 w-4" />إنشاء الحساب وإرسال البيانات</span>
        )}
      </Button>
    </div>
  );
}

// ============ TASKS SECTION ============
function TasksSection() {
  const { data: tasksList, isLoading, refetch } = trpc.tasks.list.useQuery();
  const createTask = trpc.tasks.create.useMutation({ onSuccess: () => { refetch(); toast.success("تم إضافة المهمة"); } });
  const updateStatus = trpc.tasks.updateStatus.useMutation({ onSuccess: () => { refetch(); } });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium" as const, dueDate: "" });

  if (isLoading) return <Skeleton className="h-40" />;

  const pending = tasksList?.filter((t: any) => t.status === "pending") || [];
  const inProgress = tasksList?.filter((t: any) => t.status === "in_progress") || [];
  const completed = tasksList?.filter((t: any) => t.status === "completed") || [];

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <span className="text-xs px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-800 font-medium">⏳ {pending.length} قيد الانتظار</span>
          <span className="text-xs px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 font-medium">🔄 {inProgress.length} جاري</span>
          <span className="text-xs px-3 py-1.5 rounded-full bg-green-100 text-green-800 font-medium">✅ {completed.length} مكتمل</span>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />مهمة جديدة</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>إضافة مهمة جديدة</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>عنوان المهمة</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="عنوان المهمة" /></div>
              <div><Label>الوصف</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="تفاصيل المهمة" /></div>
              <div>
                <Label>الأولوية</Label>
                <Select value={form.priority} onValueChange={(v: any) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">منخفضة</SelectItem>
                    <SelectItem value="medium">متوسطة</SelectItem>
                    <SelectItem value="high">عالية</SelectItem>
                    <SelectItem value="urgent">عاجلة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>تاريخ الاستحقاق</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
              <Button className="w-full" onClick={() => {
                createTask.mutate(form);
                setShowAdd(false);
                setForm({ title: "", description: "", priority: "medium", dueDate: "" });
              }}>حفظ المهمة</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {tasksList && tasksList.length > 0 ? (
        <div className="space-y-2">
          {tasksList.map((task: any) => (
            <Card key={task.id} className={`hover:shadow-sm transition-all ${task.priority === "urgent" ? "border-red-200 bg-red-50/30" : task.priority === "high" ? "border-orange-200" : ""}`}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button onClick={() => updateStatus.mutate({ id: task.id, status: task.status === "completed" ? "pending" : "completed" })}>
                      {task.status === "completed" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground flex-shrink-0" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <p className={`font-medium truncate ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                      <div className="flex gap-2 mt-1">
                        <PriorityBadge priority={task.priority} />
                        {task.dueDate && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />{new Date(task.dueDate).toLocaleDateString('ar-EG')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Select value={task.status} onValueChange={(v: any) => updateStatus.mutate({ id: task.id, status: v })}>
                    <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">قيد الانتظار</SelectItem>
                      <SelectItem value="in_progress">جاري التنفيذ</SelectItem>
                      <SelectItem value="completed">مكتمل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">لا توجد مهام بعد</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============ NOTES SECTION ============
function NotesSection() {
  const { data: notesList, isLoading, refetch } = trpc.notes.list.useQuery();
  const createNote = trpc.notes.create.useMutation({ onSuccess: () => { refetch(); toast.success("تم حفظ الملاحظة"); } });
  const [content, setContent] = useState("");

  if (isLoading) return <Skeleton className="h-40" />;

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-3">
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="اكتب ملاحظة جديدة..." rows={3} />
            <Button onClick={() => { createNote.mutate({ content }); setContent(""); }} disabled={!content.trim()} className="gap-2">
              <StickyNote className="h-4 w-4" />حفظ الملاحظة
            </Button>
          </div>
        </CardContent>
      </Card>

      {notesList && notesList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notesList.map((note: any) => (
            <Card key={note.id} className="bg-amber-50/50 border-amber-100">
              <CardContent className="pt-4">
                <p className="whitespace-pre-wrap text-sm">{note.content}</p>
                <p className="text-xs text-muted-foreground mt-3">{new Date(note.createdAt).toLocaleDateString('ar-EG')}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <StickyNote className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">لا توجد ملاحظات</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { label: string; color: string }> = {
    low: { label: "منخفضة", color: "text-gray-600" },
    medium: { label: "متوسطة", color: "text-blue-600" },
    high: { label: "عالية", color: "text-orange-600" },
    urgent: { label: "عاجلة", color: "text-red-600" },
  };
  const p = map[priority] || map.medium;
  return <span className={`text-xs font-medium ${p.color}`}>{p.label}</span>;
}
