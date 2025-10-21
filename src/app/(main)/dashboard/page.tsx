
"use client";

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
import { StatusBadge } from "@/components/shared/StatusBadge";
import { format } from "date-fns";
import { useAuthContext } from "@/context/AuthContext";
import { useCollection } from "@/firebase/firestore/use-collection";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { useFirebase, useMemoFirebase } from "@/firebase";
import type { Order } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function StudentDashboard() {
  const { user: appUser, loading: authLoading } = useAuthContext();
  const { firestore } = useFirebase();

  const ordersQuery = useMemoFirebase(() => {
    // Only create the query if the user is logged in
    if (!appUser?.id) return null;
    const coll = collection(firestore, "users", appUser.id, "orders");
    return query(coll, orderBy("createdAt", "desc"), limit(3));
  }, [firestore, appUser?.id]);

  // Pass the (potentially null) query to the hook
  const { data: recentOrders, isLoading: ordersLoading } = useCollection<Order>(ordersQuery);

  const isLoading = authLoading || (appUser && ordersLoading);

  if (isLoading || !appUser) {
    return (
        <div className="container mx-auto p-0">
            <div className="grid gap-8">
                <Card className="bg-primary text-primary-foreground shadow-subtle">
                    <CardHeader>
                        <CardDescription className="text-primary-foreground/80">Remaining page quota this month</CardDescription>
                        <Skeleton className="h-16 w-1/2 bg-primary/50" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-4 w-1/3 bg-primary/50" />
                    </CardContent>
                    <CardFooter>
                         <Button asChild variant="secondary" size="lg" className="font-semibold" disabled>
                            <Link href="/orders/new">Order New Assignment</Link>
                        </Button>
                    </CardFooter>
                </Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold">Recent Orders</h2>
                    <Button asChild variant="link" disabled>
                        <Link href="/orders">View all <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                </div>
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Skeleton className="h-48 w-full rounded-lg" />
                    <Skeleton className="h-48 w-full rounded-lg" />
                    <Skeleton className="h-48 w-full rounded-lg" />
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="container mx-auto p-0">
      <div className="grid gap-8">
        <Card className="bg-primary text-primary-foreground shadow-subtle">
          <CardHeader>
            <CardDescription className="text-primary-foreground/80">Remaining page quota this month</CardDescription>
            <CardTitle className="text-6xl font-bold">{appUser.pageQuota} PAGES</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-primary-foreground/80">
              Last replenished on {format(appUser.quotaLastReplenished, "MMMM d, yyyy")}
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
            {ordersLoading && (
                 <>
                    <Skeleton className="h-48 w-full rounded-lg" />
                    <Skeleton className="h-48 w-full rounded-lg" />
                    <Skeleton className="h-48 w-full rounded-lg" />
                 </>
            )}
            {!ordersLoading && recentOrders?.map(order => (
              <Card key={order.id} className="shadow-subtle">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base font-medium truncate flex-1 mr-4">{order.assignmentTitle}</CardTitle>
                  <StatusBadge status={order.status} />
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    <p>Page Count: {order.pageCount}</p>
                    <p>Submitted: {format((order.createdAt as any).toDate(), "PPP")}</p>
                  </div>
                </CardContent>
                <CardFooter>
                    <Button asChild variant="outline" className="w-full">
                        <Link href={`/orders/${order.id}`}>View Details</Link>
                    </Button>
                </CardFooter>
              </Card>
            ))}
             {!ordersLoading && (!recentOrders || recentOrders.length === 0) && (
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
