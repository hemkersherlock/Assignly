
"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User as AppUser } from '@/types';
import { useFirebase, useUser } from "@/firebase";
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { signOut, User as FirebaseUser, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { Skeleton } from '@/components/ui/skeleton';


interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { auth, firestore } = useFirebase();
  const { user: firebaseUser, isUserLoading: isFirebaseUserLoading } = useUser();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkUser = async () => {
        if (isFirebaseUserLoading) return;
        if (firebaseUser) {
          const userDocRef = doc(firestore, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data() as Omit<AppUser, 'id'>;
            // Ensure Timestamps are converted to Dates
            const lastReplenished = userData.quotaLastReplenished as unknown as Timestamp;
            const createdAt = userData.createdAt as unknown as Timestamp;
            const lastPayment = userData.lastPaymentDate as unknown as Timestamp | null;

            setAppUser({
              ...userData,
              id: firebaseUser.uid,
              quotaLastReplenished: lastReplenished.toDate(),
              createdAt: createdAt.toDate(),
              lastPaymentDate: lastPayment ? lastPayment.toDate() : null
            });
          } else {
            console.error("User document not found in Firestore.");
            // Keep appUser null, redirection logic will handle this
          }
        } else {
          setAppUser(null);
        }
        setLoading(false);
    };

    checkUser();
  }, [firebaseUser, isFirebaseUserLoading, firestore]);
  

  useEffect(() => {
    // Wait until the initial loading is complete before doing any redirects
    if (loading) {
      return;
    }

    const isAuthPage = pathname === '/login';

    // If we have a user and they are on the login page, redirect them.
    if (appUser && isAuthPage) {
      const targetDashboard = appUser.role === 'admin' ? '/admin' : '/dashboard';
      router.push(targetDashboard);
    }
    
    // If we DON'T have a user and they are NOT on the login page, send them to login.
    if (!appUser && !isAuthPage) {
      router.push('/login');
    }
  }, [appUser, loading, pathname, router]);

  const login = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // Let the useEffect hooks handle redirection after state updates.
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
          const isStudent = email.toLowerCase().includes('student');
          
          const userDocRef = doc(firestore, "users", userCredential.user.uid);
          const newUser: Omit<AppUser, 'id' | 'quotaLastReplenished' | 'createdAt' | 'lastPaymentDate'> & { quotaLastReplenished: any, createdAt: any, lastPaymentDate: any } = {
            email: email,
            role: isStudent ? "student" : "admin",
            pageQuota: isStudent ? 40 : 999,
            quotaLastReplenished: serverTimestamp(),
            totalOrdersPlaced: 0,
            totalPagesUsed: 0,
            createdAt: serverTimestamp(),
            isActive: true,
            paymentStatus: "paid",
            lastPaymentDate: null,
            amountPaid: 0,
          };
          await setDoc(userDocRef, newUser);
          // Again, let useEffects handle redirection.
        } catch (creationError: any) {
          console.error("Failed to create user:", creationError);
          throw new Error("Could not sign in or create account. (" + creationError.code + ")");
        }
      } else {
        console.error("Login failed:", error);
        throw new Error(error.message);
      }
    }
  }

  const logout = async () => {
    await signOut(auth);
    setAppUser(null);
    router.push('/login');
  };

  const value = { user: appUser, firebaseUser, loading, login, logout };
  
  // While loading and not on an auth page, show a skeleton loader.
  // This prevents a flash of the login page for already authenticated users.
  if (loading && pathname !== '/login') {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="w-full max-w-md space-y-4 p-4">
                <Skeleton className="h-10 w-1/2 mx-auto" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-10 w-full mt-4" />
            </div>
        </div>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
