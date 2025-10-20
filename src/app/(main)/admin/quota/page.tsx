"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mockUsers } from "@/lib/mock-data";
import { RefreshCw, UserPlus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const students = mockUsers.filter(u => u.role === 'student');

export default function AdminQuotaPage() {
    const [selectedStudent, setSelectedStudent] = useState('');
    const [adjustment, setAdjustment] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleReplenish = () => {
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            toast({ title: 'Success!', description: 'All student quotas have been replenished to 40 pages.'});
        }, 1500)
    }

    const handleAdjustment = () => {
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            toast({ title: 'Success!', description: `Quota for the selected student has been adjusted.`});
            setSelectedStudent('');
            setAdjustment('');
        }, 1500)
    }

    const studentData = students.find(s => s.id === selectedStudent);

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Card className="shadow-subtle">
        <CardHeader>
          <CardTitle>Bulk Replenishment</CardTitle>
          <CardDescription>Reset all student quotas to the default monthly amount.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">The last bulk replenishment was on October 1, 2023.</p>
          <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Replenish All Quotas to 40 Pages
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                          This action will reset the page quota for ALL students to 40 pages. This cannot be undone.
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleReplenish}>Continue</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
      
      <Card className="shadow-subtle">
        <CardHeader>
          <CardTitle>Individual Adjustments</CardTitle>
          <CardDescription>Manually add or set the quota for a specific student.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student-select">Select Student</Label>
            <Select onValueChange={setSelectedStudent} value={selectedStudent}>
              <SelectTrigger id="student-select">
                <SelectValue placeholder="Select a student..." />
              </SelectTrigger>
              <SelectContent>
                {students.map(student => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {studentData && (
              <div className="p-4 bg-muted/50 rounded-lg text-sm">
                  Current quota: <span className="font-bold">{studentData.pageQuota} pages</span>
              </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="adjustment">Pages to Add/Set</Label>
            <Input id="adjustment" type="number" placeholder="e.g., 10 or -5" value={adjustment} onChange={e => setAdjustment(e.target.value)} disabled={!selectedStudent} />
          </div>

           <div className="space-y-2">
            <Label htmlFor="reason">Reason / Notes (optional)</Label>
            <Input id="reason" placeholder="e.g., Bonus for referral" disabled={!selectedStudent} />
          </div>

          <Button className="w-full" onClick={handleAdjustment} disabled={!selectedStudent || !adjustment || isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            Save Adjustment
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
