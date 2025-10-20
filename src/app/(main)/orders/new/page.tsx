"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadCloud, File as FileIcon, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { mockUsers } from "@/lib/mock-data";

type UploadStep = 'upload' | 'analyzing' | 'confirm' | 'submitting';

// Mock current user
const currentUser = mockUsers.find(u => u.role === 'student');

export default function NewOrderPage() {
  const [step, setStep] = useState<UploadStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const router = useRouter();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
       if (selectedFile.size > 50 * 1024 * 1024) { // 50MB
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please upload a file smaller than 50MB.",
        });
        return;
      }
      setFile(selectedFile);
      setStep('analyzing');
      // Simulate page count analysis
      setTimeout(() => {
        const randomPageCount = Math.floor(Math.random() * 20) + 1;
        setPageCount(randomPageCount);
        setStep('confirm');
      }, 2000);
    }
  };

  const handleSubmit = () => {
    setStep('submitting');
    // Simulate order submission
    setTimeout(() => {
        toast({
            title: "Order Submitted!",
            description: "Your assignment has been successfully submitted.",
        });
        router.push('/orders');
    }, 1500);
  }

  const hasSufficientQuota = currentUser && currentUser.pageQuota >= pageCount;

  return (
    <Card className="max-w-2xl mx-auto shadow-subtle">
      <CardHeader>
        <CardTitle>Order New Assignment</CardTitle>
        <CardDescription>Upload your document and we'll handle the rest.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 'upload' && (
          <div className="relative border-2 border-dashed border-muted-foreground/50 rounded-lg p-12 text-center">
            <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 font-semibold">Drag & drop your file here</p>
            <p className="text-sm text-muted-foreground">or click to browse</p>
            <p className="text-xs text-muted-foreground mt-2">PDF, DOCX, JPG, PNG up to 50MB</p>
            <input 
                type="file" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                onChange={handleFileChange}
                accept=".pdf,.docx,.jpg,.jpeg,.png"
            />
          </div>
        )}
        
        {step === 'analyzing' && (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 font-semibold">Analyzing document...</p>
                <p className="text-sm text-muted-foreground">{file?.name}</p>
            </div>
        )}

        {step === 'confirm' && file && (
            <div className="space-y-4">
                 <div className="flex items-center gap-4 rounded-lg border p-4">
                    <FileIcon className="h-8 w-8 text-muted-foreground" />
                    <div>
                        <p className="font-semibold">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                            This document is estimated to be <span className="font-bold text-foreground">{pageCount} pages</span>.
                        </p>
                    </div>
                </div>

                {hasSufficientQuota ? (
                    <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <p className="text-sm text-green-800 dark:text-green-300">
                            This will be deducted from your available quota of {currentUser?.pageQuota} pages.
                        </p>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <p className="text-sm text-red-800 dark:text-red-300">
                            Insufficient quota. You have {currentUser?.pageQuota} pages remaining.
                        </p>
                    </div>
                )}
                
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setStep('upload')}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!hasSufficientQuota || step === 'submitting'}>
                        {step === 'submitting' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Order ({pageCount} pages)
                    </Button>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
