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
import { Badge } from "@/components/ui/badge";
import { mockUsers } from "@/lib/mock-data";
import { format } from "date-fns";
import { Edit, Eye } from "lucide-react";
import Link from 'next/link';
import { cn } from "@/lib/utils";

const students = mockUsers.filter(u => u.role === 'student');

const paymentStatusStyles = {
  paid: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
};

export default function AdminStudentsPage() {
  return (
    <Card className="shadow-subtle">
      <CardHeader>
        <CardTitle>Student Management</CardTitle>
        <CardDescription>View and manage all student accounts.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead className="text-center">Current Quota</TableHead>
              <TableHead className="text-center">Total Orders</TableHead>
              <TableHead className="text-center">Total Pages</TableHead>
              <TableHead>Payment Status</TableHead>
              <TableHead>Last Payment</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map(student => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">{student.email}</TableCell>
                <TableCell className="text-center font-semibold">{student.pageQuota}</TableCell>
                <TableCell className="text-center">{student.totalOrdersPlaced}</TableCell>
                <TableCell className="text-center">{student.totalPagesUsed}</TableCell>
                <TableCell>
                  <Badge className={cn("border-transparent capitalize", paymentStatusStyles[student.paymentStatus])}>
                    {student.paymentStatus}
                  </Badge>
                </TableCell>
                <TableCell>{student.lastPaymentDate ? format(student.lastPaymentDate, "PPP") : 'N/A'}</TableCell>
                <TableCell className="text-right">
                   <div className="flex gap-2 justify-end">
                      <Button asChild variant="outline" size="sm"><Link href="#">View Orders</Link></Button>
                      <Button asChild variant="outline" size="sm"><Link href="/admin/quota">Adjust Quota</Link></Button>
                   </div>
                </TableCell>
              </TableRow>
            ))}
             {students.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No students found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
