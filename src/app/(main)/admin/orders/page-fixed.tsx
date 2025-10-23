"use client";

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
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
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusDropdown, OrderStatus } from "@/components/shared/StatusDropdown";
import { format, formatDistanceToNow } from "date-fns";
import { Download, Search, Filter, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RealOrder {
  id: string;
  studentId: string;
  studentEmail: string;
  studentName?: string;
  studentBranch?: string;
  studentYear?: string;
  assignmentTitle: string;
  orderType: 'assignment' | 'practical';
  pageCount: number;
  status: OrderStatus;
  createdAt: any;
  originalFiles: { name: string; url: string }[];
  cloudinaryFolder: string;
}

// Order IDs are now generated as short, user-friendly IDs at creation time

export default function AdminAllOrdersPage() {
  const [orders, setOrders] = useState<RealOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<string>("all");
  
  const { firestore } = useFirebase();
  const { toast } = useToast();

  useEffect(() => {
    const fetchAllOrders = async () => {
      try {
        console.log('[Admin] Fetching all orders from Firestore...');
        
        // Get all users first
        const usersSnapshot = await getDocs(collection(firestore, 'users'));
        const allOrders: RealOrder[] = [];
        
        for (const userDoc of usersSnapshot.docs) {
          const userId = userDoc.id;
          const userData = userDoc.data();
          
          console.log(`[Admin] Checking orders for user: ${userId}`);
          
          // Get orders for this user
          const ordersSnapshot = await getDocs(collection(firestore, `users/${userId}/orders`));
          
          ordersSnapshot.forEach(orderDoc => {
            const orderData = orderDoc.data();
            allOrders.push({
              id: orderDoc.id,
              studentId: userId,
              studentEmail: userData.email || 'unknown@example.com',
              studentName: userData.name || 'Unknown Student',
              studentBranch: userData.branch || 'Unknown',
              studentYear: userData.year || 'Unknown',
              assignmentTitle: orderData.assignmentTitle || 'Untitled',
              orderType: orderData.orderType || 'assignment',
              pageCount: orderData.pageCount || 0,
              status: orderData.status || 'pending',
              createdAt: orderData.createdAt,
              originalFiles: orderData.originalFiles || [],
              cloudinaryFolder: orderData.cloudinaryFolder || ''
            });
          });
        }
        
        // Sort by creation date (newest first)
        allOrders.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        
        console.log(`[Admin] Found ${allOrders.length} orders total`);
        setOrders(allOrders);
      } catch (error) {
        console.error('[Admin] Error fetching orders:', error);
        toast({
          variant: "destructive",
          title: "Failed to load orders",
          description: "Could not fetch orders from database. Please try again.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAllOrders();
  }, [firestore, toast]);

  const handleStatusChange = async (orderId: string, studentId: string, newStatus: OrderStatus) => {
    setUpdatingStatus(orderId);
    try {
      const orderRef = doc(firestore, `users/${studentId}/orders/${orderId}`);
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: new Date()
      });

      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus }
          : order
      ));

      toast({
        title: "Status Updated!",
        description: `Order status changed to "${newStatus}"`,
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Failed to update order status. Please try again.",
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Filter orders based on search and filter criteria
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Search by order ID
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by order type
    if (orderTypeFilter !== "all") {
      filtered = filtered.filter(order => order.orderType === orderTypeFilter);
    }

    // Filter by time
    if (timeFilter !== "all") {
      const now = new Date();
      filtered = filtered.filter(order => {
        if (!order.createdAt) return false;
        
        const orderDate = order.createdAt instanceof Date ? order.createdAt : order.createdAt.toDate();
        const diffHours = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
        
        switch (timeFilter) {
          case "today":
            return diffHours < 24;
          case "week":
            return diffHours < 168; // 7 days
          case "month":
            return diffHours < 720; // 30 days
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [orders, searchTerm, orderTypeFilter, timeFilter]);

  if (loading) {
    return (
      <Card className="shadow-subtle">
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
          <CardDescription>Loading orders from database...</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-center">Pages</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Files</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <div>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-8 mx-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-16" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-subtle">
      <CardHeader>
        <CardTitle>All Orders ({filteredOrders.length})</CardTitle>
        <CardDescription>Real orders from your Firestore database</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search and Filter Bar */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by Order ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Order Type Filter */}
            <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Order Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="assignment">Assignments</SelectItem>
                <SelectItem value="practical">Practicals</SelectItem>
              </SelectContent>
            </Select>

            {/* Time Filter */}
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Time Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters Display */}
          {(searchTerm || orderTypeFilter !== "all" || timeFilter !== "all") && (
            <div className="flex flex-wrap gap-2">
              {searchTerm && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: {searchTerm}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setSearchTerm("")}
                  />
                </Badge>
              )}
              {orderTypeFilter !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Type: {orderTypeFilter}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setOrderTypeFilter("all")}
                  />
                </Badge>
              )}
              {timeFilter !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Time: {timeFilter}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setTimeFilter("all")}
                  />
                </Badge>
              )}
            </div>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-center">Pages</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Files</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {searchTerm || orderTypeFilter !== "all" || timeFilter !== "all" 
                    ? "No orders match your filters" 
                    : "No orders found"
                  }
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map(order => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs" title={order.id}>
                    {order.id}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-semibold">{order.studentName || 'Unknown Student'}</div>
                      <div className="text-sm text-muted-foreground">{order.studentBranch} - {order.studentYear}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="flex justify-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          order.orderType === 'assignment' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                            : order.orderType === 'practical'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300'
                        }`}>
                          {order.orderType || 'Unknown'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground text-center truncate max-w-[200px] mx-auto" title={order.assignmentTitle}>
                        {order.assignmentTitle || 'Untitled'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{order.pageCount}</TableCell>
                  <TableCell>
                    <StatusDropdown
                      currentStatus={order.status}
                      onStatusChange={(newStatus) => handleStatusChange(order.id, order.studentId, newStatus)}
                      disabled={updatingStatus === order.id}
                    />
                  </TableCell>
                  <TableCell>
                    {order.createdAt ? (() => {
                      const orderDate = order.createdAt instanceof Date ? order.createdAt : order.createdAt.toDate();
                      const now = new Date();
                      const diffHours = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60));
                      
                      if (diffHours < 1) return 'Just now';
                      if (diffHours < 24) return `${diffHours}h ago`;
                      if (diffHours < 168) return `${Math.floor(diffHours / 24)}d ago`;
                      return format(orderDate, 'MMM dd');
                    })() : 'Unknown'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {order.originalFiles.map((file, index) => (
                        <Button
                          key={index}
                          asChild
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          <a href={file.url} target="_blank" rel="noopener noreferrer">
                            <Download className="mr-1 h-3 w-3" />
                            {file.name.length > 10 ? file.name.substring(0, 10) + '...' : file.name}
                          </a>
                        </Button>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

