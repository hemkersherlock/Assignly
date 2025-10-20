
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { mockOrders } from "@/lib/mock-data";
import { format, formatDistanceToNow } from "date-fns";
import { Download, Edit } from "lucide-react";
import Link from 'next/link';

export default function AdminAllOrdersPage() {
  return (
    <Card className="shadow-subtle">
      <CardHeader>
        <CardTitle>All Orders</CardTitle>
        <CardDescription>Manage and view details for all orders in the system.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="text-center">Pages</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockOrders.map(order => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-xs">{order.id}</TableCell>
                <TableCell>{order.studentEmail}</TableCell>
                <TableCell className="font-medium">{order.assignmentTitle}</TableCell>
                <TableCell className="text-center">{order.pageCount}</TableCell>
                <TableCell>
                  <StatusBadge status={order.status} />
                </TableCell>
                <TableCell>{formatDistanceToNow(order.createdAt, { addSuffix: true })}</TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/orders/${order.id}`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Manage
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
             {mockOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
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
