
"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User as AppUser } from '@/types';
import { useFirebase, useUser, useFirestore, useMemoFirebase } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { signOut, User as FirebaseUser } from "firebase/auth";
import { Skeleton } from '@/components/ui/skeleton';


interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { auth } = useFirebase();
  const { user: firebaseUser, isUserLoading: isFirebaseUserLoading } = useUser();
  const firestore = useFirestore();
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
            setAppUser(userDoc.data() as AppUser);
          } else {
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

  const logout = () => {
    signOut(auth);
    setAppUser(null);
    router.push('/login');
  };

  const value = { user: appUser, firebaseUser, loading, logout };
  
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
