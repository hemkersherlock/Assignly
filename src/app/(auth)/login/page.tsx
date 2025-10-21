
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
import Logo from "@/components/shared/Logo";
import { useFirebase } from "@/firebase";
import { Loader2 } from "lucide-react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";


export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { auth } = useFirebase();
  const { toast } = useToast();

  const handleLoginOrSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // First, try to sign in
      await signInWithEmailAndPassword(auth, email, password);
      // On successful login, the AuthContext's onAuthStateChanged will handle redirection.
    } catch (err: any) {
        // If user does not exist, create a new account
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
            try {
                toast({
                    title: 'Creating Account',
                    description: 'First time? We are setting up your account.',
                });
                await createUserWithEmailAndPassword(auth, email, password);
                // On successful signup, the AuthContext's onAuthStateChanged will handle everything else.
            } catch (createErr: any) {
                const message = createErr.message?.replace('Firebase: ','') || "Failed to create account.";
                setError(message);
                console.error("Signup Error:", createErr);
            }
        } else {
            // Handle other login errors
            const message = err.message?.replace('Firebase: ','') || "An unexpected error occurred.";
            setError(message);
            console.error("Login Error:", err);
        }
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Card className="mx-auto max-w-sm w-full shadow-subtle">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center items-center gap-2 mb-2">
            <Logo className="h-8 w-8" />
            <CardTitle className="text-3xl font-bold">Assignly</CardTitle>
        </div>
        <CardDescription>Enter your email and password to login or sign up</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLoginOrSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center">
              <Label htmlFor="password">Password</Label>
            </div>
            <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 animate-spin" /> : null}
            {isLoading ? "Please wait..." : "Login / Sign Up"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
