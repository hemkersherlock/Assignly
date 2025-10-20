"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from '@/types';
import { mockUsers } from '@/lib/mock-data';
import { Skeleton } from '@/components/ui/skeleton';

interface AuthContextType {
  user: User | null;
  login: (email: string) => Promise<User | null>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Simulate checking for a logged-in user in session/local storage
    const storedUserEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
    if (storedUserEmail) {
      const foundUser = mockUsers.find(u => u.email === storedUserEmail);
      setUser(foundUser || null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading) {
      const isAuthPage = pathname === '/login';
      if (!user && !isAuthPage) {
        router.push('/login');
      }
      if (user && isAuthPage) {
        router.push(user.role === 'admin' ? '/admin' : '/dashboard');
      }
    }
  }, [user, loading, pathname, router]);


  const login = async (email: string): Promise<User | null> => {
    setLoading(true);
    // Simulate API call
    return new Promise(resolve => {
        setTimeout(() => {
            const foundUser = mockUsers.find(u => u.email === email);
            if (foundUser) {
                setUser(foundUser);
                if (typeof window !== 'undefined') {
                    localStorage.setItem('userEmail', foundUser.email);
                }
                router.push(foundUser.role === 'admin' ? '/admin' : '/dashboard');
                resolve(foundUser);
            } else {
                resolve(null);
            }
            setLoading(false);
        }, 1000);
    });
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
        localStorage.removeItem('userEmail');
    }
    router.push('/login');
  };

  const value = { user, login, logout, loading };

  if (loading || (!user && pathname !== '/login')) {
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
