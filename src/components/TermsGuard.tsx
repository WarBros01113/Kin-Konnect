
'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { Loader2 } from 'lucide-react';

interface TermsGuardProps {
  children: ReactNode;
}

export default function TermsGuard({ children }: TermsGuardProps) {
  const { user, authLoading, profileLoading, hasAgreedToTerms } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Wait until all loading is complete before making a decision
    if (authLoading || profileLoading) {
      return;
    }

    // If there is a user, they are authenticated.
    if (user) {
      // If they haven't agreed to the terms and aren't already on the terms page, redirect them.
      if (hasAgreedToTerms === false && pathname !== '/terms') {
        router.push('/terms');
      }
    }
  }, [user, hasAgreedToTerms, authLoading, profileLoading, pathname, router]);

  // Show a loader while we determine the user's status and terms agreement.
  if (authLoading || (user && profileLoading)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading session...</p>
      </div>
    );
  }

  // If user is being redirected to /terms, show a minimal loading state to avoid flashing content.
  if (user && hasAgreedToTerms === false && pathname !== '/terms') {
      return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Redirecting...</p>
      </div>
    );
  }

  return <>{children}</>;
}
