
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { mockOrders, mockUsers } from "@/lib/mock-data";
import { format, formatDistanceToNow } from "date-fns";
import { Download, Save } from "lucide-react";

// This would typically come from a hook like `useAuth` and `useOrders`
const student = mockUsers.find(u => u.role === 'student');
const orders = mockOrders.filter(o => o.studentId === student?.id);


export default function OrderHistoryPage() {
  return (
    <Card className="shadow-subtle">
      <CardHeader>
        <CardTitle>Order History</CardTitle>
        <CardDescription>A list of all your past and current orders.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="text-center">Pages</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map(order => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.assignmentTitle}</TableCell>
                <TableCell className="text-center">{order.pageCount}</TableCell>
                <TableCell>
                  <StatusBadge status={order.status} />
                </TableCell>
                <TableCell>{formatDistanceToNow(order.createdAt, { addSuffix: true })}</TableCell>
                <TableCell className="text-right">
                  {order.status === 'completed' ? (
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                      <Button variant="outline" size="sm">
                        <Save className="mr-2 h-4 w-4" />
                        Save to Drive
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No actions available</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
             {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No orders found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
