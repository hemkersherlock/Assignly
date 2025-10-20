
"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User as AppUser } from '@/types';
import { useFirebase, useUser } from "@/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
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
            setAppUser({
              ...userData,
              id: firebaseUser.uid,
              quotaLastReplenished: (userData.quotaLastReplenished as any).toDate(),
              createdAt: (userData.createdAt as any).toDate(),
              lastPaymentDate: userData.lastPaymentDate ? (userData.lastPaymentDate as any).toDate() : null
            });
          } else {
            // This case might happen briefly during first login if the doc creation is slow,
            // but the login function now handles creating the document.
            console.error("User document not found in Firestore.");
            setAppUser(null);
          }
        } else {
          setAppUser(null);
        }
        setLoading(false);
    };

    checkUser();
  }, [firebaseUser, isFirebaseUserLoading, firestore]);
  

  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === '/login';

    if (appUser && isAuthPage) {
      const targetDashboard = appUser.role === 'admin' ? '/admin' : '/dashboard';
      router.push(targetDashboard);
    }

    if (!appUser && !isAuthPage) {
      router.push('/login');
    }
  }, [appUser, loading, pathname, router]);

  const login = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // If user doesn't exist, create one
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        
        const isStudent = email.toLowerCase().includes('student');
        
        // Now create the user document in Firestore
        const userDocRef = doc(firestore, "users", userCredential.user.uid);
        const newUser: Omit<AppUser, 'id'> = {
          email: email,
          role: isStudent ? "student" : "admin",
          pageQuota: isStudent ? 40 : 999,
          quotaLastReplenished: serverTimestamp() as any,
          totalOrdersPlaced: 0,
          totalPagesUsed: 0,
          createdAt: serverTimestamp() as any,
          isActive: true,
          paymentStatus: "paid",
          lastPaymentDate: null,
          amountPaid: 0,
        };
        await setDoc(userDocRef, newUser);

      } else {
        // Re-throw other errors to be displayed on the login page
        throw error;
      }
    }
  }

  const logout = () => {
    signOut(auth);
    setAppUser(null);
    router.push('/login');
  };

  const value = { user: appUser, firebaseUser, loading, login, logout };
  
  const isAuthPage = pathname === '/login';

  if (loading && !isAuthPage) {
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
  
  if (!loading && !isAuthPage && !appUser) {
      return null;
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
