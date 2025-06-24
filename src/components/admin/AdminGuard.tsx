
'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { getUserProfile } from '@/lib/firebase/firestore';
import type { Profile } from '@/types';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button'; // Added import

interface AdminGuardProps {
  children: ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      setProfileLoading(true);
      getUserProfile(user.uid)
        .then((profile: Profile | null) => {
          if (profile && profile.isAdmin) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
            // Optionally redirect non-admins immediately or show an unauthorized message
            // router.push('/dashboard'); // Or a dedicated "Not Authorized" page
          }
        })
        .catch(err => {
          console.error("Error fetching user profile for admin check:", err);
          setIsAdmin(false);
        })
        .finally(() => {
          setProfileLoading(false);
        });
    } else if (!authLoading && !user) {
      // No user logged in, redirect to login
      router.push('/login');
      setProfileLoading(false);
    }
  }, [user, authLoading, router]);

  if (authLoading || profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Verifying access...</p>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="flex flex-col h-screen items-center justify-center text-center p-4 bg-background">
        <ShieldAlert className="h-16 w-16 text-destructive mb-6" />
        <h1 className="text-3xl font-headline font-bold text-destructive mb-4">Access Denied</h1>
        <p className="text-lg text-foreground/80 mb-8 max-w-md">
          You do not have permission to view this page. Please contact an administrator if you believe this is an error.
        </p>
        <Button onClick={() => router.push('/dashboard')} variant="outline">
          Go to Dashboard
        </Button>
      </div>
    );
  }
  
  if (isAdmin === true) {
    return <>{children}</>;
  }

  // Fallback for any intermediate state, though ideally handled by loaders
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
