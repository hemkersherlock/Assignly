
"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, Clock, Download, Eye, Loader, CheckCircle } from "lucide-react";
import { mockOrders } from "@/lib/mock-data";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const activeOrders = mockOrders.filter(o => o.status === 'pending' || o.status === 'in_progress');
const pendingCount = mockOrders.filter(o => o.status === 'pending').length;
const inProgressCount = mockOrders.filter(o => o.status === 'in_progress').length;
const completedToday = mockOrders.filter(o => o.status === 'completed' && o.completedAt && new Date().toDateString() === o.completedAt.toDateString()).length;
const completedOrders = mockOrders.filter(o => o.status === 'completed' && o.turnaroundTimeHours);
const avgTurnaround = completedOrders.length > 0
  ? Math.round(completedOrders.reduce((acc, o) => acc + o.turnaroundTimeHours!, 0) / completedOrders.length)
  : 0;

const weeklyData = [
    { day: "Mon", orders: 12 }, { day: "Tue", orders: 15 }, { day: "Wed", orders: 8 },
    { day: "Thu", orders: 19 }, { day: "Fri", orders: 14 }, { day: "Sat", orders: 22 },
    { day: "Sun", orders: 10 }
];


export default function AdminDashboard() {
  return (
    <div className="container mx-auto p-0 grid gap-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-subtle">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Loader className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>
        <Card className="shadow-subtle">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressCount}</div>
            <p className="text-xs text-muted-foreground">Currently being worked on</p>
          </CardContent>
        </Card>
        <Card className="shadow-subtle">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{completedToday}</div>
            <p className="text-xs text-muted-foreground">Finished in the last 24h</p>
          </CardContent>
        </Card>
        <Card className="shadow-subtle">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Turnaround</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">~{avgTurnaround || 0} hours</div>
            <p className="text-xs text-muted-foreground">Average completion time</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-8 lg:grid-cols-5">
        <Card className="lg:col-span-3 shadow-subtle">
          <CardHeader>
              <CardTitle>Active Orders</CardTitle>
              <CardDescription>All orders that are currently pending or in progress.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Pages</TableHead>
                        <TableHead>Time Elapsed</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {activeOrders.map(order => (
                        <TableRow key={order.id}>
                            <TableCell>{order.studentEmail}</TableCell>
                            <TableCell className="font-medium">{order.assignmentTitle}</TableCell>
                            <TableCell>{order.pageCount}</TableCell>
                            <TableCell>{formatDistanceToNow(order.createdAt)}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                    <Button asChild variant="ghost" size="icon"><Link href="#"><Download className="h-4 w-4"/></Link></Button>
                                    <Button asChild variant="outline" size="sm"><Link href={`/admin/orders/${order.id}`}>View Details</Link></Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                    {activeOrders.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">No active orders.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2 shadow-subtle">
            <CardHeader>
                <CardTitle>Orders This Week</CardTitle>
                <CardDescription>A summary of orders received this week.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={{
                    orders: {
                        label: "Orders",
                        color: "hsl(var(--primary))",
                    },
                }} className="h-[250px] w-full">
                    <AreaChart accessibilityLayer data={weeklyData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                        <YAxis tickLine={false} axisLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                        <ChartTooltip
                            cursor={{ fill: 'hsl(var(--accent))', opacity: 0.1 }}
                            content={<ChartTooltipContent />}
                        />
                        <defs>
                            <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-orders)" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="var(--color-orders)" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="orders" stroke="var(--color-orders)" fill="url(#colorOrders)" />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
      </div>

    </div>
  );
}
