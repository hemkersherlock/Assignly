
"use client";

import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { mockOrders, mockUsers } from "@/lib/mock-data";
import { format } from "date-fns";
import { Clock, Download, FileText, Loader, Send, User, Hash, Calendar, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";


export default function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState(() => mockOrders.find(o => o.id === params.id));
  const [note, setNote] = useState(order?.notes || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  if (!order) {
    notFound();
  }
  
  const student = mockUsers.find(u => u.id === order.studentId);
  const timeElapsed = order.createdAt ? format(order.createdAt, "PPP p") : 'N/A';

  const handleStatusUpdate = (newStatus: "in_progress" | "completed") => {
    setIsUpdating(true);
    setTimeout(() => {
        setOrder(prev => prev ? {...prev, status: newStatus, startedAt: newStatus === 'in_progress' ? new Date() : prev.startedAt, completedAt: newStatus === 'completed' ? new Date() : null} : undefined);
        setIsUpdating(false);
        toast({ title: "Status Updated", description: `Order marked as ${newStatus.replace('_', ' ')}.`});
    }, 1000);
  }

  const handleNoteSave = () => {
    setIsUpdating(true);
    setTimeout(() => {
        setOrder(prev => prev ? {...prev, notes: note} : undefined);
        setIsUpdating(false);
        toast({ title: "Note Saved", description: "Admin note has been updated." });
    }, 1000);
  }

  return (
    <div className="container mx-auto p-0 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
            <Card className="shadow-subtle">
                <CardHeader>
                    <CardTitle>Order Details</CardTitle>
                    <div className="flex items-center gap-2 pt-2">
                        <StatusBadge status={order.status} />
                        <span className="text-sm text-muted-foreground font-mono">{order.id}</span>
                    </div>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-start gap-4">
                        <FileText className="h-5 w-5 text-muted-foreground mt-1" />
                        <div>
                            <p className="text-sm text-muted-foreground">Original File(s)</p>
                            <div className="font-semibold flex flex-col items-start gap-2">
                                {order.originalFiles.map((file, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span>{file.name}</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6"><Download className="h-4 w-4" /></Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <Hash className="h-5 w-5 text-muted-foreground mt-1" />
                        <div>
                            <p className="text-sm text-muted-foreground">Page Count</p>
                            <p className="font-semibold">{order.pageCount}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <Calendar className="h-5 w-5 text-muted-foreground mt-1" />
                        <div>
                            <p className="text-sm text-muted-foreground">Submitted</p>
                            <p className="font-semibold">{timeElapsed}</p>
                        </div>
                    </div>
                    {order.status !== 'pending' && order.startedAt && (
                        <div className="flex items-start gap-4">
                            <Clock className="h-5 w-5 text-muted-foreground mt-1" />
                            <div>
                                <p className="text-sm text-muted-foreground">Started</p>
                                <p className="font-semibold">{format(order.startedAt, "PPP p")}</p>
                            </div>
                        </div>
                    )}
                    {order.status === 'completed' && order.completedAt &&(
                         <div className="flex items-start gap-4">
                            <CheckCircle className="h-5 w-5 text-muted-foreground mt-1" />
                            <div>
                                <p className="text-sm text-muted-foreground">Completed</p>
                                <p className="font-semibold">{format(order.completedAt, "PPP p")}</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="shadow-subtle">
                <CardHeader>
                    <CardTitle>Admin Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {order.status === 'pending' && (
                        <Button onClick={() => handleStatusUpdate('in_progress')} disabled={isUpdating} className="w-full md:w-auto">
                            {isUpdating && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                            Mark In Progress
                        </Button>
                    )}
                    {order.status === 'in_progress' && (
                        <div className="space-y-4">
                            <Card className="bg-background">
                                <CardHeader>
                                    <CardTitle className="text-base">Upload Completed File</CardTitle>
                                    <CardDescription>Drop the handwritten file here.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="relative border-2 border-dashed border-muted-foreground/50 rounded-lg p-8 text-center">
                                        <Download className="mx-auto h-8 w-8 text-muted-foreground" />
                                        <p className="mt-2 font-semibold">Drag & drop completed file</p>
                                        <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                                    </div>
                                </CardContent>
                            </Card>
                            <Button onClick={() => handleStatusUpdate('completed')} disabled={isUpdating} className="w-full md-w-auto">
                                {isUpdating && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                                Mark as Completed & Notify
                            </Button>
                        </div>
                    )}
                    
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Admin Notes</label>
                        <Textarea placeholder="Internal notes about the order..." value={note} onChange={(e) => setNote(e.target.value)} />
                        <Button variant="secondary" size="sm" onClick={handleNoteSave} disabled={isUpdating}>
                            {isUpdating && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                            Save Note
                        </Button>
                    </div>

                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1 space-y-8">
            <Card className="shadow-subtle">
                <CardHeader>
                    <CardTitle>Student Info</CardTitle>
                </CardHeader>
                 <CardContent className="grid gap-4">
                    <div className="flex items-center gap-4">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p className="font-semibold">{student?.email}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <p className="text-sm text-muted-foreground">Current Quota</p>
                            <p className="font-semibold">{student?.pageQuota} pages</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-4">
                        <Hash className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <p className="text-sm text-muted-foreground">Total Orders</p>
                            <p className="font-semibold">{student?.totalOrdersPlaced}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}

    