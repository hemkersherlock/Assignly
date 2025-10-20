import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { ArrowRight, FileText } from "lucide-react";
import { mockUsers, mockOrders } from "@/lib/mock-data";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { format } from "date-fns";

// This would typically come from a hook like `useAuth` and `useOrders`
const student = mockUsers.find(u => u.role === 'student');
const recentOrders = mockOrders.filter(o => o.studentId === student?.id).slice(0, 3);

export default function StudentDashboard() {
  if (!student) return <div>Could not load student data.</div>

  return (
    <div className="container mx-auto p-0">
      <div className="grid gap-8">
        <Card className="bg-primary text-primary-foreground shadow-subtle">
          <CardHeader>
            <CardDescription className="text-primary-foreground/80">Remaining page quota this month</CardDescription>
            <CardTitle className="text-6xl font-bold">{student.pageQuota} PAGES</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-primary-foreground/80">
              Last replenished on {format(student.quotaLastReplenished, "MMMM d, yyyy")}
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="secondary" size="lg" className="font-semibold">
              <Link href="/orders/new">Order New Assignment</Link>
            </Button>
          </CardFooter>
        </Card>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Recent Orders</h2>
            <Button asChild variant="link">
              <Link href="/orders">View all <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentOrders.map(order => (
              <Card key={order.id} className="shadow-subtle">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base font-medium truncate flex-1 mr-4">{order.originalFileName}</CardTitle>
                  <StatusBadge status={order.status} />
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    <p>Page Count: {order.pageCount}</p>
                    <p>Submitted: {format(order.createdAt, "PPP")}</p>
                  </div>
                </CardContent>
                <CardFooter>
                    <Button asChild variant="outline" className="w-full">
                        <Link href={`/orders/${order.id}`}>View Details</Link>
                    </Button>
                </CardFooter>
              </Card>
            ))}
             {recentOrders.length === 0 && (
                <div className="col-span-full text-center py-10">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">You haven't placed any orders yet.</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
