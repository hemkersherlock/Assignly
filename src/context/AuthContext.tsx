
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
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('ðŸ” Auth state changed:', user?.uid || 'null');
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
          console.log('âœ… User is authenticated:', firebaseUser.email);
          const userDocRef = doc(firestore, "users", firebaseUser.uid);
          console.log('ðŸ“„ Attempting to read user doc at:', `users/${firebaseUser.uid}`);
          
          try {
            const userDoc = await getDoc(userDocRef);
            console.log('ðŸ“¥ getDoc completed. Exists?', userDoc.exists());

            if (userDoc.exists()) {
              console.log('âœ… User document found');
              const adminRoleRef = doc(firestore, "roles_admin", firebaseUser.uid);
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

            } else {
              console.log('âš ï¸ User document does NOT exist. Creating new profile...');
              const newUser = {
                  email: firebaseUser.email || 'unknown@example.com',
                  role: 'student',
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

              console.log('ðŸ“ Attempting setDoc with data:', newUser);
              console.log('ðŸ”‘ Auth UID:', firebaseUser.uid);
              console.log('ðŸ“ Document path:', `users/${firebaseUser.uid}`);

              // Add retry logic with exponential backoff to handle auth token propagation
              let retryCount = 0;
              const maxRetries = 3;
              const baseDelay = 100; // Start with 100ms delay
              
              while (retryCount < maxRetries) {
                try {
                  // Add a small delay to ensure auth token is propagated
                  if (retryCount > 0) {
                    const delay = baseDelay * Math.pow(2, retryCount - 1);
                    console.log(`🔄 Retry attempt ${retryCount + 1}/${maxRetries} after ${delay}ms delay`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                  }
                  
                  await setDoc(userDocRef, newUser);
                  console.log('✅ User document created successfully!');
                  break; // Success, exit retry loop
                  
                } catch (error: any) {
                  retryCount++;
                  console.error(`❌ Retry ${retryCount}/${maxRetries} failed:`, error.message);
                  
                  if (retryCount >= maxRetries) {
                    throw error; // Re-throw the last error if all retries failed
                  }
                }
              }

              console.log('âœ… User document created successfully!');

              // Re-fetch to confirm
              const verifyDoc = await getDoc(userDocRef);
              if (verifyDoc.exists()) {
                console.log('âœ… Verification successful - document exists');
                const userData = verifyDoc.data();
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
              } else {
                  console.error('âŒ CRITICAL: Document does not exist even after creation attempt.');
              }
            }
          } catch (err: any) {
              console.error('âŒ ERROR in AuthContext:', err);
              console.error('âŒ Error code:', err.code);
              console.error('âŒ Error message:', err.message);
              console.error('âŒ Full error:', JSON.stringify(err, null, 2));
              setError(err.message);
              // Aggressively sign out user if their profile is broken
              await signOut(auth);
          }
        } else {
          console.log('ðŸšª User logged out');
          setAppUser(null);
        }
        setLoading(false);
    };

    manageUser();
  }, [firebaseUser, firestore, auth]);
  

  useEffect(() => {
    if (loading || !pathname) {
      return;
    }

    const isAuthPage = pathname === '/login';

    if (appUser && isAuthPage) {
      const targetDashboard = appUser.role === 'admin' ? '/admin' : '/dashboard';
      console.log(`User is on auth page, redirecting to ${targetDashboard}`);
      router.push(targetDashboard);
    }
    
    if (!appUser && !isAuthPage) {
       console.log(`User is not authenticated and not on auth page, redirecting to /login`);
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
