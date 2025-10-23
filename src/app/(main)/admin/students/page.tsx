"use client";

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
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCollection } from "@/firebase/firestore/use-collection";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { useFirebase, useMemoFirebase } from "@/firebase";
import { useAuthContext } from "@/context/AuthContext";
import { safeFormat } from "@/lib/date-utils";
import { Edit, Eye, Plus, Copy, Check } from "lucide-react";
import Link from 'next/link';
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@/types";

export default function AdminStudentsPage() {
  const { firestore } = useFirebase();
  const { user: currentUser } = useAuthContext();
  const { toast } = useToast();

  // Create student form state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createdStudent, setCreatedStudent] = useState<{email: string, password: string} | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    name: ''
  });

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle form submission
  const handleCreateStudent = async () => {
    if (!formData.email || !formData.name) {
      toast({
        title: "Error",
        description: "Email and name are required",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/create-student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setCreatedStudent({
          email: result.student.email,
          password: result.student.password
        });
        toast({
          title: "Success",
          description: "Student account created successfully!",
        });
        // Reset form
        setFormData({
          email: '',
          name: ''
        });
      } else {
        toast({
          title: "Error",
          description: result.error || 'Failed to create student account',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating student:', error);
      toast({
        title: "Error",
        description: "Failed to create student account",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Copy password to clipboard
  const copyPassword = async () => {
    if (createdStudent?.password) {
      try {
        await navigator.clipboard.writeText(createdStudent.password);
        setPasswordCopied(true);
        toast({
          title: "Success",
          description: "Password copied to clipboard!",
        });
        setTimeout(() => setPasswordCopied(false), 2000);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to copy password",
          variant: "destructive",
        });
      }
    }
  };

  // Close dialog and reset state
  const closeDialog = () => {
    setIsCreateDialogOpen(false);
    setCreatedStudent(null);
    setPasswordCopied(false);
  };

  // Get all users (students)
  const usersQuery = useMemoFirebase(() => {
    if (!currentUser || currentUser.role !== 'admin') return null;
    const q = query(collection(firestore, 'users'), limit(100));
    console.log('🔍 Creating users query:', q);
    return q;
  }, [firestore, currentUser?.role]);

  const { data: allUsers, isLoading, error } = useCollection<User>(usersQuery);

  // Filter to only show students (non-admin users)
  const students = allUsers?.filter(user => user.role !== 'admin') || [];

  console.log('🔍 Students Page Debug:', {
    currentUser: currentUser?.email,
    userRole: currentUser?.role,
    isAdmin: currentUser?.role === 'admin',
    usersQuery: usersQuery,
    allUsers: allUsers?.length,
    students: students.length,
    isLoading,
    error: error?.message
  });

  if (isLoading) {
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
                <TableHead className="text-center">Credits</TableHead>
                <TableHead className="text-center">Total Orders</TableHead>
                <TableHead className="text-center">Total Pages</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Order</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-8 mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-8 mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-8 mx-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-24" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-subtle">
        <CardHeader>
          <CardTitle>Student Management</CardTitle>
          <CardDescription>View and manage all student accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-500">Error loading students: {error.message}</p>
            <p className="text-sm text-muted-foreground mt-2">Please try refreshing the page.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-subtle">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Student Management</CardTitle>
            <CardDescription>View and manage all student accounts.</CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Student
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Student Account</DialogTitle>
                <DialogDescription>
                  Create a new student account with automatically generated password.
                </DialogDescription>
              </DialogHeader>
              
              {!createdStudent ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="student@example.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The student will be prompted to complete their profile (WhatsApp, Section, Year, Semester, Branch) during onboarding after first login.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">Student Account Created Successfully!</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium">Email:</span> {createdStudent.email}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Password:</span>
                        <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-mono">
                          {createdStudent.password}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={copyPassword}
                          className="h-8"
                        >
                          {passwordCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                      Share these credentials with the student. They can change their password after first login.
                    </p>
                  </div>
                </div>
              )}
              
              <DialogFooter>
                {!createdStudent ? (
                  <>
                    <Button variant="outline" onClick={closeDialog}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateStudent} disabled={isCreating}>
                      {isCreating ? 'Creating...' : 'Create Student'}
                    </Button>
                  </>
                ) : (
                  <Button onClick={closeDialog}>
                    Done
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead className="text-center">Credits</TableHead>
              <TableHead className="text-center">Total Orders</TableHead>
              <TableHead className="text-center">Total Pages</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Order</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map(student => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">
                  <div>
                    <div className="font-semibold">{student.name || 'No Name'}</div>
                    <div className="text-sm text-muted-foreground">{student.email}</div>
                    <div className="text-xs text-muted-foreground">{student.branch} - {student.year}</div>
                  </div>
                </TableCell>
                <TableCell className="text-center font-semibold">{student.creditsRemaining}</TableCell>
                <TableCell className="text-center">{student.totalOrders}</TableCell>
                <TableCell className="text-center">{student.totalPages}</TableCell>
                <TableCell>
                  <Badge className={cn("border-transparent", student.isActive ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300")}>
                    {student.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>{safeFormat(student.lastOrderAt, "PPP", "Never")}</TableCell>
                <TableCell className="text-right">
                   <div className="flex gap-2 justify-end">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/orders?student=${student.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          View Orders
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/credits?student=${student.id}`}>
                          <Edit className="h-4 w-4 mr-1" />
                          Adjust Credits
                        </Link>
                      </Button>
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
