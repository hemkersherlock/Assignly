"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  UploadCloud,
  File as FileIcon,
  X,
  Loader2,
  Info,
  Plus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import * as pdfjs from "pdfjs-dist";
import { useAuthContext } from "@/context/AuthContext";
import { useFirebase } from "@/firebase";
import {
  collection,
  doc,
  increment,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { createOrderFolder, uploadFileToDrive } from "@/lib/google-drive";

// Configure pdf.js worker
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface FileUploadProgress {
  fileName: string;
  progress: number; // 0 to 100
  error?: string;
}

function FilePreview({
  file,
  onRemove,
  isSubmitting,
}: {
  file: File;
  onRemove: () => void;
  isSubmitting: boolean;
}) {
  const isImage = file.type.startsWith("image/");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isImage) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [file, isImage, previewUrl]);

  return (
    <div className="relative group w-full aspect-video rounded-lg border bg-muted/20 flex items-center justify-center">
      {isImage && previewUrl ? (
        <img
          src={previewUrl}
          alt={file.name}
          className="object-cover h-full w-full rounded-lg"
        />
      ) : (
        <div className="flex flex-col items-center gap-2 text-muted-foreground p-2">
          <FileIcon className="h-8 w-8" />
          <span className="text-xs font-medium text-center break-all">
            {file.name}
          </span>
        </div>
      )}
      <Button
        variant="destructive"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onRemove}
        disabled={isSubmitting}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function NewOrderPage() {
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [orderType, setOrderType] = useState<"assignment" | "practical">(
    "assignment"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageCounts, setPageCounts] = useState<Record<string, number>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  );

  const router = useRouter();
  const { toast } = useToast();
  const { user: appUser } = useAuthContext();
  const { firestore } = useFirebase();

  const totalPageCount = useMemo(() => {
    return files.reduce((acc, file) => acc + (pageCounts[file.name] || 0), 0);
  }, [files, pageCounts]);

  const getPageCount = useCallback(
    async (file: File) => {
      if (file.type === "application/pdf") {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjs.getDocument(arrayBuffer).promise;
          return pdf.numPages;
        } catch (error) {
          console.error("Error reading PDF:", error);
          toast({
            variant: "destructive",
            title: `Could not read ${file.name}.`,
          });
          return 1; // Default to 1 page on error
        }
      }
      return 1; // 1 page for non-PDF files
    },
    [toast]
  );

  useEffect(() => {
    const newFiles = files.filter((file) => !(file.name in pageCounts));
    if (newFiles.length > 0) {
      const processFiles = async () => {
        const newCounts: Record<string, number> = {};
        for (const file of newFiles) {
          newCounts[file.name] = await getPageCount(file);
        }
        setPageCounts((prev) => ({ ...prev, ...newCounts }));
      };
      processFiles();
    }
  }, [files, pageCounts, getPageCount]);

  const currentUserQuota = appUser?.pageQuota ?? 0;
  const remainingQuota = currentUserQuota - totalPageCount;
  const hasSufficientQuota = remainingQuota >= 0;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const allFiles = [...files, ...newFiles];

      const validFiles = allFiles.filter((file) => {
        if (file.size > 10 * 1024 * 1024) {
          // 10MB
          toast({
            variant: "destructive",
            title: "File too large",
            description: `${file.name} is larger than 10MB.`,
          });
          return false;
        }
        return true;
      });
      setFiles(validFiles);
      if (e.target) {
        e.target.value = "";
      }
    }
  };

  const removeFile = (index: number) => {
    const fileToRemove = files[index];
    setFiles(files.filter((_, i) => i !== index));

    const newPageCounts = { ...pageCounts };
    delete newPageCounts[fileToRemove.name];
    setPageCounts(newPageCounts);
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.files) {
      const newFiles = Array.from(event.dataTransfer.files);
      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleSubmit = async () => {
    if (!appUser) {
      toast({
        variant: "destructive",
        title: "You must be logged in to submit an order.",
      });
      return;
    }
    if (!assignmentTitle.trim()) {
      toast({
        variant: "destructive",
        title: "Assignment title is required.",
      });
      return;
    }
    if (files.length === 0) {
      toast({
        variant: "destructive",
        title: "Please upload at least one file.",
      });
      return;
    }
    if (!hasSufficientQuota) {
      toast({
        variant: "destructive",
        title: "Insufficient quota to submit.",
      });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress({});

    try {
      toast({
        title: "Submitting...",
        description: "Your order is being processed.",
      });

      const ordersCollectionRef = collection(
        firestore,
        "users",
        appUser.id,
        "orders"
      );
      const newOrderRef = doc(ordersCollectionRef); // Create new doc with id
      const orderId = newOrderRef.id;

      // 1. Create a folder for the order in Google Drive (Server Action)
      const driveFolderId = await createOrderFolder(orderId);

      // 2. Upload files to that folder
      const uploadedFiles = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Convert File to serializable format
        const fileData = {
          name: file.name,
          type: file.type,
          size: file.size,
          data: Array.from(new Uint8Array(await file.arrayBuffer())),
        };

        // Pass serializable data to server action
        const uploadedFile = await uploadFileToDrive(fileData, driveFolderId);
        uploadedFiles.push({ name: file.name, url: uploadedFile.webViewLink });
        setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
      }

      // 3. Batch write to Firestore
      const batch = writeBatch(firestore);

      const newOrderData = {
        id: orderId,
        assignmentTitle,
        orderType,
        pageCount: totalPageCount,
        originalFiles: uploadedFiles,
        driveFolderId,
        status: "pending",
        studentId: appUser.id,
        studentEmail: appUser.email,
        createdAt: serverTimestamp(),
        startedAt: null,
        completedAt: null,
        turnaroundTimeHours: null,
        notes: null,
      };
      batch.set(newOrderRef, newOrderData);

      // 3b. Update user quota & order counts
      const userRef = doc(firestore, "users", appUser.id);
      batch.update(userRef, {
        pageQuota: increment(-totalPageCount),
        totalOrdersPlaced: increment(1),
        totalPagesUsed: increment(totalPageCount),
      });

      // 4. Commit batch
      await batch.commit();

      toast({
        title: "Order Submitted Successfully!",
        description: "We've received your files and will begin processing shortly.",
      });
      router.push("/dashboard");
    } catch (error) {
      console.error("Order submission failed: ", error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalProgress = useMemo(() => {
    if (files.length === 0) return 0;
    const uploadedCount = Object.keys(uploadProgress).length;
    return (uploadedCount / files.length) * 100;
  }, [uploadProgress, files.length]);

  return (
    <div className="container mx-auto p-0 grid lg:grid-cols-3 gap-8 items-start">
      <div className="lg:col-span-2 space-y-6">
        <Card className="shadow-subtle">
          <CardHeader>
            <CardTitle>Create New Order</CardTitle>
            <CardDescription>
              Give your assignment a title and upload the necessary files.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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

            <div className="space-y-3">
              <Label>Order Type</Label>
              <RadioGroup
                defaultValue="assignment"
                className="flex gap-4"
                onValueChange={(value: "assignment" | "practical") =>
                  setOrderType(value)
                }
                disabled={isSubmitting}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="assignment" id="r1" />
                  <Label htmlFor="r1" className="font-normal cursor-pointer">
                    Assignment
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="practical" id="r2" />
                  <Label htmlFor="r2" className="font-normal cursor-pointer">
                    Practical
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Assignment Files</Label>
              <input
                type="file"
                multiple
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,image/jpeg,image/png"
                disabled={isSubmitting}
              />
              {files.length === 0 ? (
                <div
                  className="relative border-2 border-dashed border-muted-foreground/50 rounded-lg p-8 text-center flex flex-col items-center justify-center hover:border-primary transition-colors cursor-pointer"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud className="h-10 w-10 text-muted-foreground" />
                  <p className="mt-2 font-semibold">Drag & drop files or click to browse</p>
                  <p className="text-sm text-muted-foreground">
                    PDF, DOCX, JPG, PNG up to 10MB each
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {files.map((file, index) => (
                    <FilePreview
                      key={index}
                      file={file}
                      onRemove={() => removeFile(index)}
                      isSubmitting={isSubmitting}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    className={cn(
                      "aspect-video rounded-lg border-2 border-dashed border-muted-foreground/50 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors",
                      isSubmitting && "cursor-not-allowed opacity-50"
                    )}
                  >
                    <Plus className="h-8 w-8" />
                    <span className="text-sm font-semibold mt-1">Add More</span>
                  </button>
                </div>
              )}
            </div>
            {isSubmitting && (
              <div className="space-y-2">
                <Label>Upload Progress</Label>
                <Progress value={totalProgress} />
                <p className="text-sm text-muted-foreground text-center">
                  {Math.round(totalProgress)}% complete
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Additional UI here, e.g. billing summary card */}
    </div>
  );
}
