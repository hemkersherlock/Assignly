
"use client";

import { useState, useEffect } from "react";
import { useFirebase, useFirestore } from "@/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, UserCredential } from "firebase/auth";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { useRouter } from "next/navigation";
import type { User } from "@/types";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password"); // Default password
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { auth, user } = useFirebase();
  const firestore = useFirestore();
  const router = useRouter();

  useEffect(() => {
    if (user && firestore) {
      // The redirect is now handled by the AuthProvider,
      // so we can keep this effect minimal or remove it.
      // For now, let's keep it to be safe during the transition.
      const userDocRef = doc(firestore, "users", user.uid);
      getDoc(userDocRef).then(userDoc => {
        if (userDoc.exists()) {
          const userData = userDoc.data();
          router.push(userData.role === 'admin' ? '/admin' : '/dashboard');
        }
      });
    }
  }, [user, firestore, router]);

  const createUserDocument = async (userCredential: UserCredential) => {
    const user = userCredential.user;
    if (!firestore) return;

    const userDocRef = doc(firestore, "users", user.uid);
    const role = email.startsWith('admin') ? 'admin' : 'student';

    const newUser: Omit<User, 'id'> = {
        email: user.email || '',
        role: role,
        pageQuota: role === 'student' ? 40 : 9999,
        quotaLastReplenished: new Date(),
        totalOrdersPlaced: 0,
        totalPagesUsed: 0,
        createdAt: new Date(),
        isActive: true,
        paymentStatus: 'paid',
        lastPaymentDate: null,
        amountPaid: 0,
    };
    await setDoc(userDocRef, newUser);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    if (!auth) {
        setError("Authentication service not available.");
        setLoading(false);
        return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // On success, the AuthProvider/useEffect will handle redirection
    } catch (error: any) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            // If user doesn't exist, try creating them.
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await createUserDocument(userCredential);
                // On success, the AuthProvider/useEffect will handle redirection
            } catch (creationError: any) {
                 console.error("User creation failed:", creationError);
                 setError(`Could not sign in or create account. (${creationError.code})`);
            }
        } else {
            console.error("Login failed:", error);
            setError(`Login failed: ${error.message}`);
        }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mx-auto max-w-sm w-full shadow-subtle">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center items-center gap-2 mb-2">
            <Logo className="h-8 w-8" />
            <CardTitle className="text-3xl font-bold">Assignly</CardTitle>
        </div>
        <CardDescription>Enter your email below to login to your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="student@assignly.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
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
                disabled={loading}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
         <Alert className="mt-4">
            <Terminal className="h-4 w-4" />
            <AlertDescription className="text-xs">
                Use <code className="font-semibold">student@assignly.com</code> or <code className="font-semibold">admin@assignly.com</code> to log in. Any password will work.
            </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
