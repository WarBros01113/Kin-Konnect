
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { onAuthChanged } from '@/lib/firebase/auth';
import { getUserProfile, getKonnectRequests } from '@/lib/firebase/firestore';
import type { User, Profile } from '@/types';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean | null;
  authLoading: boolean;
  profileLoading: boolean;
  hasAgreedToTerms: boolean | null;
  hasPendingKonnectRequests: boolean;
  clearPendingKonnectRequestsIndicator: () => void;
  refreshPendingKonnectRequests: () => Promise<void>;
  refreshAuthContext: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState<boolean | null>(null);
  const [hasPendingKonnectRequests, setHasPendingKonnectRequests] = useState(false);

  const fetchUserData = useCallback(async (authUser: User | null) => {
    if (authUser) {
      setProfileLoading(true);
      try {
        const profile = await getUserProfile(authUser.uid);
        setIsAdmin(!!profile?.isAdmin);
        setHasAgreedToTerms(!!profile?.hasAgreedToTerms);
        
        const requests = await getKonnectRequests(authUser.uid);
        setHasPendingKonnectRequests(requests.length > 0);

      } catch (error) {
        console.error("Failed to fetch user profile or konnect requests:", error);
        setIsAdmin(false);
        setHasAgreedToTerms(null); // Set to null on error to indicate indeterminate state
        setHasPendingKonnectRequests(false);
      } finally {
        setProfileLoading(false);
      }
    } else {
      setIsAdmin(null);
      setHasAgreedToTerms(null);
      setHasPendingKonnectRequests(false);
      setProfileLoading(false);
    }
  }, []);


  useEffect(() => {
    const unsubscribe = onAuthChanged(async (authUser) => {
      setUser(authUser);
      setAuthLoading(false);
      await fetchUserData(authUser);
    });
    return () => unsubscribe();
  }, [fetchUserData]);

  const refreshAuthContext = useCallback(async () => {
    if (user) {
      await fetchUserData(user);
    }
  }, [user, fetchUserData]);
  
  const refreshPendingKonnectRequests = useCallback(async () => {
    if (user) {
      try {
        const requests = await getKonnectRequests(user.uid);
        setHasPendingKonnectRequests(requests.length > 0);
      } catch (error) {
        console.error("Failed to refresh pending konnect requests:", error);
        setHasPendingKonnectRequests(false);
      }
    } else {
      setHasPendingKonnectRequests(false);
    }
  }, [user]);

  const clearPendingKonnectRequestsIndicator = useCallback(() => {
    setHasPendingKonnectRequests(false);
  }, []);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAdmin,
      authLoading,
      profileLoading,
      hasAgreedToTerms,
      hasPendingKonnectRequests,
      clearPendingKonnectRequestsIndicator,
      refreshPendingKonnectRequests,
      refreshAuthContext
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
