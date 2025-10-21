
"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User as AppUser } from '@/types';
import { useFirebase } from "@/firebase";
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { signOut, User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { Skeleton } from '@/components/ui/skeleton';

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
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

          const userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            console.log(`User document for ${firebaseUser.uid} not found. Creating it now.`);
            
            const newUser: Omit<AppUser, 'id' | 'quotaLastReplenished' | 'createdAt' | 'lastPaymentDate'> & { quotaLastReplenished: any, createdAt: any, lastPaymentDate: any } = {
                email: firebaseUser.email || 'unknown@example.com',
                role: 'student', // New users are always students
                pageQuota: 40,
                quotaLastReplenished: serverTimestamp(),
                totalOrdersPlaced: 0,
                totalPagesUsed: 0,
                createdAt: serverTimestamp(),
                isActive: true,
                paymentStatus: "paid",
                lastPaymentDate: null,
                amountPaid: 0,
            };
            
            try {
              await setDoc(userDocRef, newUser);
              // Re-fetch the user data after creation
              const newUserDoc = await getDoc(userDocRef);
              if (newUserDoc.exists()) {
                 const userData = newUserDoc.data();
                 const lastReplenished = userData.quotaLastReplenished as Timestamp;
                 const createdAt = userData.createdAt as Timestamp;
                 const lastPayment = userData.lastPaymentDate as Timestamp | null;

                  setAppUser({
                    ...(userData as Omit<AppUser, 'id' | 'quotaLastReplenished' | 'createdAt' | 'lastPaymentDate'>),
                    id: firebaseUser.uid,
                    quotaLastReplenished: lastReplenished?.toDate(),
                    createdAt: createdAt?.toDate(),
                    lastPaymentDate: lastPayment ? lastPayment.toDate() : null
                  });
              }
            } catch (error) {
              console.error("CRITICAL: Failed to create user document after sign-up.", error);
              setAppUser(null);
            }
          } else {
             const [userData, adminDoc] = await Promise.all([
                userDoc.data(),
                getDoc(adminRoleRef)
             ]);

             const currentRole = adminDoc.exists() ? "admin" : "student";
             const lastReplenished = userData.quotaLastReplenished as Timestamp;
             const createdAt = userData.createdAt as Timestamp;
             const lastPayment = userData.lastPaymentDate as Timestamp | null;

             setAppUser({
                ...(userData as Omit<AppUser, 'id' | 'role' | 'quotaLastReplenished' | 'createdAt' | 'lastPaymentDate'>),
                id: firebaseUser.uid,
                role: currentRole,
                quotaLastReplenished: lastReplenished?.toDate(),
                createdAt: createdAt?.toDate(),
                lastPaymentDate: lastPayment ? lastPayment.toDate() : null
              });
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

  const logout = async () => {
    await signOut(auth);
    setAppUser(null);
    setFirebaseUser(null);
    router.push('/login');
  };

  const value = { user: appUser, firebaseUser, loading, logout };
  
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
