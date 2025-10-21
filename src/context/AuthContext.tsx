
"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User as AppUser } from '@/types';
import { useFirebase } from "@/firebase";
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { signOut, User as FirebaseUser, onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


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
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    const manageUser = async () => {
        if (firebaseUser === undefined) {
          setLoading(true);
          return;
        }; 
        
        if (firebaseUser) {
          const userDocRef = doc(firestore, "users", firebaseUser.uid);
          const adminRoleRef = doc(firestore, "roles_admin", firebaseUser.uid);

          // Fetch both documents concurrently
          const [userDoc, adminDoc] = await Promise.all([
            getDoc(userDocRef),
            getDoc(adminRoleRef)
          ]);

          const currentRole = adminDoc.exists() ? "admin" : "student";
          let userData = userDoc.data();

          if (!userDoc.exists()) {
            console.log(`User document for ${firebaseUser.uid} not found. Creating it now.`);
            
            const newUser: Omit<AppUser, 'id' | 'quotaLastReplenished' | 'createdAt' | 'lastPaymentDate'> & { quotaLastReplenished: any, createdAt: any, lastPaymentDate: any } = {
                email: firebaseUser.email || 'unknown@example.com',
                role: currentRole,
                pageQuota: currentRole === 'student' ? 40 : 999,
                quotaLastReplenished: serverTimestamp(),
                totalOrdersPlaced: 0,
                totalPagesUsed: 0,
                createdAt: serverTimestamp(),
                isActive: true,
                paymentStatus: "paid",
                lastPaymentDate: null,
                amountPaid: 0,
            };
            
            // This is the operation that is likely failing.
            // We've replaced the try/catch with the non-blocking error emitting pattern.
            setDoc(userDocRef, newUser).catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: userDocRef.path,
                    operation: 'create',
                    requestResourceData: newUser,
                });
                errorEmitter.emit('permission-error', permissionError);

                // If document creation fails, we can't proceed.
                setAppUser(null);
                setLoading(false);
            });

            // Optimistically assume the write will succeed for the UI,
            // the listener will catch the failure.
            const newUserDoc = await getDoc(userDocRef);
            userData = newUserDoc.data();

          }

          if (userData) {
            const lastReplenished = userData.quotaLastReplenished as Timestamp;
            const createdAt = userData.createdAt as Timestamp;
            const lastPayment = userData.lastPaymentDate as Timestamp | null;

            setAppUser({
              ...(userData as Omit<AppUser, 'id' | 'quotaLastReplenished' | 'createdAt' | 'lastPaymentDate'>),
              id: firebaseUser.uid,
              role: currentRole, // Always use the most up-to-date role
              quotaLastReplenished: lastReplenished?.toDate(),
              createdAt: createdAt?.toDate(),
              lastPaymentDate: lastPayment ? lastPayment.toDate() : null
            });
          } else {
             // This case might be hit if the document creation failed above.
             // We log this but avoid setting state here as the error handler does it.
             console.error("Failed to get or create user data for", firebaseUser.uid);
             setAppUser(null);
          }
        } else {
          setAppUser(null);
        }
        setLoading(false);
    };

    manageUser();
  }, [firebaseUser, firestore]);
  

  useEffect(() => {
    if (loading) {
      return;
    }

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
    await signInWithEmailAndPassword(auth, email, pass);
  }

  const logout = async () => {
    await signOut(auth);
    setAppUser(null);
    setFirebaseUser(null);
    router.push('/login');
  };

  const value = { user: appUser, firebaseUser, loading, login, logout };
  
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
