export interface User {
  id: string;
  email: string;
  role: "student" | "admin";
  pageQuota: number;
  quotaLastReplenished: Date;
  totalOrdersPlaced: number;
  totalPagesUsed: number;
  createdAt: Date;
  isActive: boolean;
  paymentStatus: "paid" | "pending" | "overdue";
  lastPaymentDate: Date | null;
  amountPaid: number;
}

export interface Order {
  id: string;
  studentId: string;
  studentEmail: string;
  originalFileNames: string[];
  orderType: "assignment" | "practical";
  originalFileUrls: string[];
  pageCount: number;
  status: "pending" | "in_progress" | "completed";
  completedFileUrl: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  turnaroundTimeHours: number | null;
  notes: string | null;
}

export interface DailyAnalytics {
  id: string; // e.g., "daily_2023_10_27"
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  totalPagesProcessed: number;
  averageTurnaroundHours: number;
  activeStudents: number;
  ordersReceived: number;
  ordersCompleted: number;
  pagesProcessed: number;
  date: Date;
}

export interface MonthlyAnalytics {
    id: string; // e.g., "monthly_2023_10"
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    totalPagesProcessed: number;
    averageTurnaroundHours: number;
    activeStudents: number;
    revenue?: number; // Optional
    month: string;
}
