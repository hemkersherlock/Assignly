
export interface User {
  // Core identification
  id: string;
  email: string;
  
  // Role & Status (essential)
  role: "student" | "admin";
  isActive: boolean;
  
  // Profile Information (new)
  name: string;                    // Student's full name
  whatsappNo: string;              // WhatsApp number
  section: string;                 // Section (A, B, C, etc.)
  year: "1st Year" | "2nd Year" | "3rd Year" | "4th Year";
  sem: "1st Sem" | "2nd Sem" | "3rd Sem" | "4th Sem" | "5th Sem" | "6th Sem" | "7th Sem" | "8th Sem";
  branch: "CS" | "EXTC" | "MECH" | "CHEM" | "IT" | "INSTRU";
  
  // Credit System (core functionality)
  creditsRemaining: number;
  
  // Analytics (for admin dashboard)
  totalOrders: number;          // Renamed from totalOrdersPlaced
  totalPages: number;           // Renamed from totalPagesUsed
  
  // Timestamps (minimal)
  createdAt: Date;
  lastOrderAt?: Date;          // New field for last activity
}

export interface AppUser extends User {
  // AppUser is the same as User for now
}

export interface Order {
  id: string;
  studentId: string;
  studentEmail: string;
  studentName?: string;
  studentBranch?: string;
  studentYear?: string;
  assignmentTitle: string;
  originalFiles: { name: string, url: string }[];
  orderType: "assignment" | "practical";
  pageCount: number;
  status: "pending" | "writing" | "on the way" | "delivered";
  completedFileUrl: string | null;
  createdAt: any;
  startedAt: any | null;
  completedAt: any | null;
  turnaroundTimeHours: number | null;
  notes: string | null;
  driveFolderId?: string;
}

export interface DailyAnalytics {
    id: string; // e.g., "daily_2023_10_27"
    date: Date;
    ordersReceived: number;
    ordersCompleted: number;
    pagesProcessed: number;
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    totalPagesProcessed: number;
    averageTurnaroundHours: number;
    activeStudents: number;
}

export interface MonthlyAnalytics {
    id: string; // e.g., "monthly_2023_10"
    month: string;
    totalOrders: number;
    totalPagesProcessed: number;
    averageTurnaroundHours: number;
    completedOrders: number;
    pendingOrders: number;
    activeStudents: number;
    revenue?: number; // Optional
}
