
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
      if (isUserLoading || !firestore) {
        // Wait until firebase auth state is resolved and firestore is available
        return;
      }

      if (firebaseUser) {
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        try {
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                setAppUser(userDoc.data() as AppUser);
            } else {
                // This can happen briefly if the document isn't created yet.
                // We will retry or depend on the login page to create it.
                console.warn("User document not found in Firestore, might be a race condition.");
                setAppUser(null);
            }
        } catch (e) {
            console.error("Error fetching user document:", e);
            setAppUser(null);
        }
      } else {
        setAppUser(null);
      }
      setAuthLoading(false);
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
    if (auth) {
      auth.signOut();
    }
    setAppUser(null);
    router.push('/login');
  };

  const value = { user: appUser, loading: authLoading, logout };
  
  const isAuthPage = pathname === '/login';

  // Show loading skeleton if we are loading auth state and not on the login page
  if (authLoading && !isAuthPage) {
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

  // If we are not loading, and we don't have a user, and we're not on the login page,
  // the effect to redirect will fire, but we can prevent rendering the children to avoid flashes.
  if (!authLoading && !appUser && !isAuthPage) {
      return null; // Or return the loading skeleton
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
