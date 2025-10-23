"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Save, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { doc, updateDoc } from "firebase/firestore";
import { useFirebase } from "@/firebase";
import { useAuthContext } from "@/context/AuthContext";
import Link from "next/link";
import type { User as UserType } from "@/types";

export default function ProfilePage() {
  const { user, setAppUser } = useAuthContext();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    whatsappNo: '',
    section: '',
    year: '1st Year' as const,
    sem: '1st Sem' as const,
  });

  // Update form data when user data loads
  React.useEffect(() => {
    if (user) {
      setFormData({
        whatsappNo: user.whatsappNo || '',
        section: user.section || '',
        year: user.year || '1st Year',
        sem: user.sem || '1st Sem',
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User data not available. Please try logging in again.",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const userRef = doc(firestore, "users", user.id);
      await updateDoc(userRef, {
        whatsappNo: formData.whatsappNo,
        section: formData.section,
        year: formData.year,
        sem: formData.sem,
      });

      // Update local state
      setAppUser({
        ...user,
        whatsappNo: formData.whatsappNo,
        section: formData.section,
        year: formData.year,
        sem: formData.sem,
      });

      toast({
        title: "Profile Updated!",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <Card className="shadow-subtle">
          <CardContent className="p-8 text-center">
            <p>Loading profile...</p>
            <p className="text-sm text-muted-foreground mt-2">User data not available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Link>
              </Button>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
                <p className="text-sm text-muted-foreground">Update your contact and academic details</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Form */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Keep your information up to date for better service
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* WhatsApp */}
                <div className="space-y-2">
                  <Label htmlFor="whatsapp" className="text-sm font-medium">
                    WhatsApp Number *
                  </Label>
                  <Input
                    id="whatsapp"
                    placeholder="+91 9876543210"
                    value={formData.whatsappNo}
                    onChange={(e) => setFormData({ ...formData, whatsappNo: e.target.value })}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    We'll use this to contact you about your orders
                  </p>
                </div>
                
                {/* Section */}
                <div className="space-y-2">
                  <Label htmlFor="section" className="text-sm font-medium">
                    Section *
                  </Label>
                  <Input
                    id="section"
                    placeholder="A, B, C, etc."
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="h-11"
                  />
                </div>

                {/* Year and Semester */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="year" className="text-sm font-medium">
                      Year *
                    </Label>
                    <Select value={formData.year} onValueChange={(value: UserType["year"]) => setFormData({ ...formData, year: value })}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1st Year">1st Year</SelectItem>
                        <SelectItem value="2nd Year">2nd Year</SelectItem>
                        <SelectItem value="3rd Year">3rd Year</SelectItem>
                        <SelectItem value="4th Year">4th Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sem" className="text-sm font-medium">
                      Semester *
                    </Label>
                    <Select value={formData.sem} onValueChange={(value: UserType["sem"]) => setFormData({ ...formData, sem: value })}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select semester" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1st Sem">1st Sem</SelectItem>
                        <SelectItem value="2nd Sem">2nd Sem</SelectItem>
                        <SelectItem value="3rd Sem">3rd Sem</SelectItem>
                        <SelectItem value="4th Sem">4th Sem</SelectItem>
                        <SelectItem value="5th Sem">5th Sem</SelectItem>
                        <SelectItem value="6th Sem">6th Sem</SelectItem>
                        <SelectItem value="7th Sem">7th Sem</SelectItem>
                        <SelectItem value="8th Sem">8th Sem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Info */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                  <p className="text-sm font-medium">{user.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Name</p>
                  <p className="text-sm font-medium">{user.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Credits</p>
                  <p className="text-sm font-medium text-green-600">{user.creditsRemaining}</p>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="sticky top-6">
              <Button 
                onClick={handleSave} 
                disabled={isLoading} 
                className="w-full h-11"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
