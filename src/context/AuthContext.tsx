
"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User as AppUser } from '@/types';
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
        return; // Wait until firebase auth state is resolved and firestore is available
      }

      if (firebaseUser) {
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        try {
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                setAppUser(userDoc.data() as AppUser);
            } else {
                // This can happen if the document isn't created yet.
                // We'll set appUser to null for now, and the redirection logic will wait.
                // The login page is responsible for creating the document.
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
    // This effect handles all redirection logic for the app.
    if (authLoading) {
      return; // Do nothing while we are determining auth state.
    }

    const isAuthPage = pathname === '/login';

    if (appUser) {
      // User is logged in.
      if (isAuthPage) {
        // If they are on the login page, redirect them to their dashboard.
        const targetDashboard = appUser.role === 'admin' ? '/admin' : '/dashboard';
        router.push(targetDashboard);
      }
    } else {
      // User is not logged in.
      if (!isAuthPage) {
        // If they are on any page other than login, redirect them to login.
        router.push('/login');
      }
    }
  }, [appUser, authLoading, pathname, router]);


  const logout = () => {
    if (auth) {
      auth.signOut();
    }
  };

  const value = { user: appUser, loading: authLoading, logout };
  
  const isAuthPage = pathname === '/login';

  // While loading, if we aren't on the login page, show a skeleton screen.
  // This prevents a flash of content for protected pages.
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

  // If we have finished loading, and we are not on an auth page, but there's no user,
  // we return null. The redirection effect will handle sending them to the login page.
  if (!authLoading && !isAuthPage && !appUser) {
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
