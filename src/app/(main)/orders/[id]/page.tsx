
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { mockOrders } from "@/lib/mock-data";
import { format } from "date-fns";
import { Download, Save, Clock, Hash, Calendar, CheckCircle, FileText } from "lucide-react";

export default function StudentOrderDetailPage({ params }: { params: { id: string } }) {
  const order = mockOrders.find(o => o.id === params.id);

  if (!order) {
    notFound();
  }

  return (
    <Card className="max-w-3xl mx-auto shadow-subtle">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>{order.assignmentTitle}</CardTitle>
                <CardDescription>Summary of your order: <span className="font-mono text-xs">{order.id}</span></CardDescription>
            </div>
            <StatusBadge status={order.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
            <div className="flex items-start gap-4">
                <FileText className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                    <p className="text-sm text-muted-foreground">Filename(s)</p>
                    <div className="font-semibold flex flex-col">
                        {order.originalFiles.map((file, idx) => <span key={idx}>{file.name}</span>)}
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
                    <p className="font-semibold">{format(order.createdAt, "PPP p")}</p>
                </div>
            </div>
            {order.status !== 'pending' && order.startedAt && (
                <div className="flex items-start gap-4">
                    <Clock className="h-5 w-5 text-muted-foreground mt-1" />
                    <div>
                        <p className="text-sm text-muted-foreground">Processing Started</p>
                        <p className="font-semibold">{format(order.startedAt, "PPP p")}</p>
                    </div>
                </div>
            )}
            {order.status === 'completed' && order.completedAt && (
                <>
                <div className="flex items-start gap-4">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-1" />
                    <div>
                        <p className="text-sm text-muted-foreground">Completed</p>
                        <p className="font-semibold">{format(order.completedAt, "PPP p")}</p>
                    </div>
                </div>
                 <div className="flex items-start gap-4">
                    <Clock className="h-5 w-5 text-muted-foreground mt-1" />
                    <div>
                        <p className="text-sm text-muted-foreground">Turnaround Time</p>
                        <p className="font-semibold">~{order.turnaroundTimeHours} hours</p>
                    </div>
                </div>
                </>
            )}
        </div>
        
        {order.status === 'completed' && (
          <div className="border-t pt-6 flex flex-col md:flex-row gap-4">
            <Button className="w-full md:w-auto">
              <Download className="mr-2 h-4 w-4" />
              Download Completed File
            </Button>
            <Button variant="secondary" className="w-full md:w-auto">
              <Save className="mr-2 h-4 w-4" />
              Save to Google Drive
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

    