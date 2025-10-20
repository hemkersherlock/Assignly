"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { mockDailyAnalytics, mockMonthlyAnalytics, mockOrders, mockUsers } from "@/lib/mock-data";

const orderStatusDistribution = mockOrders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
}, {} as Record<string, number>);

const orderStatusData = [
    { status: 'Pending', value: orderStatusDistribution.pending, fill: 'var(--color-pending)' },
    { status: 'In Progress', value: orderStatusDistribution.in_progress, fill: 'var(--color-in_progress)' },
    { status: 'Completed', value: orderStatusDistribution.completed, fill: 'var(--color-completed)' },
];

const pageVolumeByStudent = mockUsers
    .filter(u => u.role === 'student')
    .map(u => ({ name: u.email.split('@')[0], pages: u.totalPagesUsed }))
    .sort((a,b) => b.pages - a.pages)
    .slice(0, 10);

export default function AdminAnalyticsPage() {
  return (
    <div className="grid gap-8">
      <CardHeader className="p-0">
          <CardTitle>Analytics</CardTitle>
          <CardDescription>Insights into your operations and student activity.</CardDescription>
      </CardHeader>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        <Card className="shadow-subtle">
          <CardHeader>
            <CardTitle>Orders Over Time (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={mockDailyAnalytics} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { day: 'numeric' })} tickLine={false} axisLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                    <YAxis tickLine={false} axisLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                    <Tooltip content={<ChartTooltipContent />} cursor={{ fill: 'hsl(var(--accent))', opacity: 0.1 }} />
                    <Area type="monotone" dataKey="ordersReceived" name="Orders Received" stroke="hsl(var(--primary))" fill="url(#colorOrders)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="shadow-subtle">
          <CardHeader>
            <CardTitle>Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
             <ChartContainer config={{
                pending: { label: 'Pending', color: 'hsl(var(--muted))' },
                in_progress: { label: 'In Progress', color: 'hsl(var(--primary))' },
                completed: { label: 'Completed', color: 'hsl(var(--success))' },
             }} className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<ChartTooltipContent nameKey="status" />} />
                  <Pie data={orderStatusData} dataKey="value" nameKey="status" innerRadius={60} outerRadius={80} paddingAngle={5} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

       <Card className="shadow-subtle">
          <CardHeader>
            <CardTitle>Page Volume by Student (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pageVolumeByStudent} layout="vertical" margin={{ left: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} width={100} />
                    <Tooltip content={<ChartTooltipContent />} cursor={{ fill: 'hsl(var(--accent))', opacity: 0.1 }} />
                    <Bar dataKey="pages" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

      <Card className="shadow-subtle">
        <CardHeader>
          <CardTitle>Monthly Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Total Orders</TableHead>
                <TableHead>Total Pages</TableHead>
                <TableHead>Avg. Turnaround (hrs)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockMonthlyAnalytics.map(summary => (
                <TableRow key={summary.id}>
                  <TableCell className="font-medium">{summary.month}</TableCell>
                  <TableCell>{summary.totalOrders}</TableCell>
                  <TableCell>{summary.totalPagesProcessed}</TableCell>
                  <TableCell>{summary.averageTurnaroundHours}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
