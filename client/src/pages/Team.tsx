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
import { useState } from "react";
import { Users, Plus, CheckCircle2, Clock, AlertCircle, StickyNote } from "lucide-react";
import { toast } from "sonner";

export default function Team() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">إدارة الفريق</h1>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tasks">المهام</TabsTrigger>
          <TabsTrigger value="notes">الملاحظات</TabsTrigger>
          <TabsTrigger value="members">أعضاء الفريق</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks"><TasksSection /></TabsContent>
        <TabsContent value="notes"><NotesSection /></TabsContent>
        <TabsContent value="members"><MembersSection /></TabsContent>
      </Tabs>
    </div>
  );
}

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
        <div className="flex gap-3">
          <span className="text-sm px-3 py-1 rounded-full bg-yellow-100 text-yellow-800">قيد الانتظار: {pending.length}</span>
          <span className="text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-800">جاري التنفيذ: {inProgress.length}</span>
          <span className="text-sm px-3 py-1 rounded-full bg-green-100 text-green-800">مكتملة: {completed.length}</span>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 ml-2" />مهمة جديدة</Button>
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
        <div className="space-y-3">
          {tasksList.map((task: any) => (
            <Card key={task.id} className={`hover:shadow-sm transition-shadow ${task.priority === "urgent" ? "border-red-200" : task.priority === "high" ? "border-orange-200" : ""}`}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <button onClick={() => updateStatus.mutate({ id: task.id, status: task.status === "completed" ? "pending" : "completed" })}>
                      {task.status === "completed" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground mt-0.5" />
                      )}
                    </button>
                    <div>
                      <p className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                      {task.description && <p className="text-sm text-muted-foreground mt-1">{task.description}</p>}
                      <div className="flex gap-2 mt-2">
                        <PriorityBadge priority={task.priority} />
                        {task.dueDate && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />{new Date(task.dueDate).toLocaleDateString('ar-EG')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Select value={task.status} onValueChange={(v: any) => updateStatus.mutate({ id: task.id, status: v })}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
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
            <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">لا توجد مهام</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function NotesSection() {
  const { data: notesList, isLoading, refetch } = trpc.notes.list.useQuery();
  const createNote = trpc.notes.create.useMutation({ onSuccess: () => { refetch(); toast.success("تم حفظ الملاحظة"); } });
  const [content, setContent] = useState("");

  if (isLoading) return <Skeleton className="h-40" />;

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="اكتب ملاحظة جديدة..." rows={3} />
            <Button onClick={() => { createNote.mutate({ content }); setContent(""); }} disabled={!content.trim()}>
              <StickyNote className="h-4 w-4 ml-2" />حفظ الملاحظة
            </Button>
          </div>
        </CardContent>
      </Card>

      {notesList && notesList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notesList.map((note: any) => (
            <Card key={note.id} className="bg-yellow-50/50 border-yellow-100">
              <CardContent className="pt-4">
                <p className="whitespace-pre-wrap">{note.content}</p>
                <p className="text-xs text-muted-foreground mt-3">{new Date(note.createdAt).toLocaleDateString('ar-EG')}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <StickyNote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">لا توجد ملاحظات</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MembersSection() {
  const { data: members, isLoading } = trpc.team.getMembers.useQuery();

  if (isLoading) return <Skeleton className="h-40" />;

  const roleLabels: Record<string, string> = {
    owner: "المالك",
    accountant: "محاسب",
    media_buyer: "مسؤول إعلانات",
    operations: "عمليات",
    customer_support: "دعم العملاء",
    inventory_manager: "مدير المخزون",
    admin: "مدير",
    user: "مستخدم",
  };

  return (
    <div className="space-y-4 mt-4">
      {members && members.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member: any) => (
            <Card key={member.id}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{member.name || "مستخدم"}</p>
                    <p className="text-sm text-muted-foreground">{roleLabels[member.role] || member.role}</p>
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
            <p className="text-muted-foreground">لا يوجد أعضاء في الفريق</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { label: string; color: string }> = {
    low: { label: "منخفضة", color: "bg-gray-100 text-gray-800" },
    medium: { label: "متوسطة", color: "bg-blue-100 text-blue-800" },
    high: { label: "عالية", color: "bg-orange-100 text-orange-800" },
    urgent: { label: "عاجلة", color: "bg-red-100 text-red-800" },
  };
  const p = map[priority] || map.medium;
  return <span className={`text-xs px-2 py-0.5 rounded-full ${p.color}`}>{p.label}</span>;
}
