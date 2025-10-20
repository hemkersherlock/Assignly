"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, File as FileIcon, X, Loader2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { mockUsers } from "@/lib/mock-data";
import { Progress } from "@/components/ui/progress";

// Mock current user
const currentUser = mockUsers.find(u => u.role === 'student');

export default function NewOrderPage() {
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const totalPageCount = useMemo(() => {
    // In a real app, this would involve analyzing the files.
    // Here, we'll assign a random page count to each file for simulation.
    return files.reduce((acc) => acc + (Math.floor(Math.random() * 5) + 1), 0);
  }, [files]);

  const remainingQuota = currentUser ? currentUser.pageQuota - totalPageCount : 0;
  const hasSufficientQuota = remainingQuota >= 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const allFiles = [...files, ...newFiles];

      // Simple validation for file size and type
      const validFiles = allFiles.filter(file => {
        if (file.size > 50 * 1024 * 1024) { // 50MB
          toast({
            variant: "destructive",
            title: "File too large",
            description: `${file.name} is larger than 50MB.`,
          });
          return false;
        }
        return true;
      });
      setFiles(validFiles);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };
  
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.files) {
      const newFiles = Array.from(event.dataTransfer.files);
      setFiles(prevFiles => [...prevFiles, ...newFiles]);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);


  const handleSubmit = () => {
    if (!assignmentTitle.trim()) {
      toast({ variant: "destructive", title: "Assignment title is required." });
      return;
    }
    if (files.length === 0) {
      toast({ variant: "destructive", title: "Please upload at least one file." });
      return;
    }
    if (!hasSufficientQuota) {
        toast({ variant: "destructive", title: "Insufficient quota to submit." });
        return;
    }

    setIsSubmitting(true);
    // Simulate order submission
    setTimeout(() => {
        toast({
            title: "Order Submitted!",
            description: "Your assignment is now being processed.",
        });
        router.push('/dashboard');
    }, 2000);
  }

  return (
    <div className="container mx-auto p-0 grid lg:grid-cols-3 gap-8 items-start">
      <div className="lg:col-span-2 space-y-6">
        <Card className="shadow-subtle">
          <CardHeader>
            <CardTitle>Create New Order</CardTitle>
            <CardDescription>Give your assignment a title and upload the necessary files.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="assignment-title">Assignment Title</Label>
                <Input 
                    id="assignment-title" 
                    placeholder="e.g. Modern History Midterm Essay"
                    value={assignmentTitle}
                    onChange={(e) => setAssignmentTitle(e.target.value)}
                    disabled={isSubmitting}
                />
            </div>
            
            <div className="space-y-2">
                <Label>Assignment Files</Label>
                <div 
                  className="relative border-2 border-dashed border-muted-foreground/50 rounded-lg p-8 text-center flex flex-col items-center justify-center hover:border-primary transition-colors"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                    <UploadCloud className="h-10 w-10 text-muted-foreground" />
                    <p className="mt-2 font-semibold">Drag & drop files or click to browse</p>
                    <p className="text-sm text-muted-foreground">PDF, DOCX, JPG, PNG up to 50MB each</p>
                    <input 
                        type="file" 
                        multiple
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                        onChange={handleFileChange}
                        accept=".pdf,.docx,.jpg,.jpeg,.png"
                        disabled={isSubmitting}
                    />
                </div>
            </div>

            {files.length > 0 && (
                <div className="space-y-2">
                    <h3 className="font-medium text-sm">Uploaded Files</h3>
                    <div className="space-y-2">
                        {files.map((file, index) => (
                            <div key={index} className="flex items-center gap-3 rounded-md border p-3 bg-muted/20">
                                <FileIcon className="h-6 w-6 text-muted-foreground" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium truncate">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFile(index)} disabled={isSubmitting}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1 space-y-6 sticky top-24">
        <Card className="shadow-subtle">
            <CardHeader>
                <CardTitle>Billing Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Estimated Page Count</span>
                    <span className="font-semibold">{totalPageCount} pages</span>
                </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Your Current Quota</span>
                    <span className="font-semibold">{currentUser?.pageQuota} pages</span>
                </div>
                <div className="space-y-2">
                    <Progress value={hasSufficientQuota ? (totalPageCount / (currentUser?.pageQuota || 1)) * 100 : 100} className={!hasSufficientQuota ? "bg-destructive/20 [&>*]:bg-destructive" : ""} />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Used: {totalPageCount}</span>
                        <span>Remaining: {remainingQuota < 0 ? 0 : remainingQuota}</span>
                    </div>
                </div>
                {!hasSufficientQuota && (
                    <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-destructive">
                        <Info className="h-5 w-5 mt-0.5" />
                        <p className="text-sm">You've exceeded your quota. Please remove files or upgrade your plan.</p>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleSubmit}
                    disabled={!hasSufficientQuota || files.length === 0 || !assignmentTitle.trim() || isSubmitting}
                >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSubmitting ? 'Submitting...' : `Submit Order (${totalPageCount} pages)`}
                </Button>
            </CardFooter>
        </Card>
      </div>
    </div>
  );
}
