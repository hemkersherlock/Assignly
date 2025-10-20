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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { mockUsers } from "@/lib/mock-data";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Check, Loader2 } from "lucide-react";
import React from "react";
import { useToast } from "@/hooks/use-toast";

const students = mockUsers.filter(u => u.role === 'student');

const paymentStatusStyles = {
  paid: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
};

function MarkAsPaidModal({ studentId, onConfirm }: { studentId: string; onConfirm: () => void }) {
    const [date, setDate] = React.useState<Date | undefined>(new Date());
    const [isLoading, setIsLoading] = React.useState(false);

    const handleConfirm = () => {
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            onConfirm();
        }, 1000)
    }

    return (
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Mark as Paid</DialogTitle>
            <DialogDescription>
              Record a new payment for this student.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">Amount</Label>
              <Input id="amount" defaultValue="100" className="col-span-3" type="number" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
               <Label className="text-right">Payment Date</Label>
               <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="method" className="text-right">Method</Label>
                <Select>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                    </SelectContent>
                </Select>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">Notes</Label>
              <Input id="notes" className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="submit" onClick={handleConfirm} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Save Payment
            </Button>
          </DialogFooter>
        </DialogContent>
    )
}

export default function AdminPaymentsPage() {
    const { toast } = useToast();
    const handlePaymentConfirmation = () => {
        toast({ title: 'Payment Recorded!', description: 'The student\'s payment status has been updated.' });
    }

  return (
    <Card className="shadow-subtle">
      <CardHeader>
        <CardTitle>Payment Tracking</CardTitle>
        <CardDescription>Monitor and record student payments.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Payment Status</TableHead>
              <TableHead>Last Payment Date</TableHead>
              <TableHead>Amount Paid</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map(student => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">{student.email}</TableCell>
                <TableCell>
                  <Badge className={cn("border-transparent capitalize", paymentStatusStyles[student.paymentStatus])}>
                    {student.paymentStatus}
                  </Badge>
                </TableCell>
                <TableCell>{student.lastPaymentDate ? format(student.lastPaymentDate, "PPP") : 'N/A'}</TableCell>
                <TableCell>₹{student.amountPaid.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                    <Dialog>
                        <DialogTrigger asChild>
                           <Button variant="outline" size="sm">Mark as Paid</Button>
                        </DialogTrigger>
                        <MarkAsPaidModal studentId={student.id} onConfirm={handlePaymentConfirmation}/>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
             {students.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
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
