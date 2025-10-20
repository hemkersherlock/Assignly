"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User as AppUser } from '@/types'; // Renamed to avoid conflict
import { useFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { auth, user: firebaseUser, isUserLoading, firestore } = useFirebase();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkUser = async () => {
      if (!isUserLoading && firestore) {
        if (firebaseUser) {
          const userDocRef = doc(firestore, 'users', firebaseUser.uid);
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
        setAuthLoading(false);
      }
    };
    checkUser();
  }, [firebaseUser, isUserLoading, firestore]);
  
  useEffect(() => {
    if (!authLoading) {
      const isAuthPage = pathname === '/login';
      if (!appUser && !isAuthPage) {
        router.push('/login');
      }
      if (appUser && isAuthPage) {
        router.push(appUser.role === 'admin' ? '/admin' : '/dashboard');
      }
    }
  }, [appUser, authLoading, pathname, router]);


  const logout = () => {
    auth?.signOut();
    setAppUser(null);
    router.push('/login');
  };

  const value = { user: appUser, loading: authLoading, logout };

  if (authLoading || (!appUser && pathname !== '/login')) {
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

export const useAuthContext = () => { // Renamed to avoid conflict with firebase/useAuth
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
