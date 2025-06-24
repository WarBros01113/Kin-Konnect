'use client';

import React from 'react';
import { useParams, useRouter } from "next/navigation"; 
import { useEffect, useState, useCallback } from "react";
import InteractiveTreeView from '@/components/tree/InteractiveTreeView';
import { Loader2, ArrowLeft, ShieldBan } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/AuthProvider';
import { getKonnectionStatusBetweenUsers } from '@/lib/firebase/firestore';
import type { KonnectionStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function FullTreeDisplayPageContent() {
  const params = useParams();
  const router = useRouter();
  const { user: loggedInUser, loading: authLoading } = useAuth();
  const userIdFromRoute = params.userId as string;

  const [pageTitle, setPageTitle] = useState<string>("Matched User's Family Tree");
  const [konnectionStatus, setKonnectionStatus] = useState<KonnectionStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const fetchStatusAndTitle = useCallback(async () => {
    if (loggedInUser && userIdFromRoute) {
      if (loggedInUser.uid === userIdFromRoute) {
        setKonnectionStatus('konnected'); // User viewing their own tree is implicitly "konnected" for viewing
        setPageTitle("Your Family Tree (Full View)");
        setLoadingStatus(false);
        return;
      }
      try {
        setLoadingStatus(true);
        const status = await getKonnectionStatusBetweenUsers(loggedInUser.uid, userIdFromRoute);
        setKonnectionStatus(status);
        // Fetch target user's name for title (optional, could be passed via query params too)
        // For now, using a generic title if not self.
        setPageTitle(status === 'konnected' ? `Konnected User's Tree` : "View Tree");
      } catch (error) {
        console.error("Error fetching konnection status:", error);
        setKonnectionStatus('not_konnected'); // Default to not connected on error
      } finally {
        setLoadingStatus(false);
      }
    } else if (!loggedInUser && !authLoading) {
      setLoadingStatus(false); // Not logged in, no status to fetch
    }
  }, [loggedInUser, userIdFromRoute, authLoading]);


  useEffect(() => {
    fetchStatusAndTitle();
  }, [fetchStatusAndTitle]);


  if (authLoading || loadingStatus) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading tree access status...</p>
      </div>
    );
  }

  if (!loggedInUser) {
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4">
        <Card className="max-w-md p-6 shadow-md">
          <CardHeader className="pb-2">
            <ShieldBan className="h-12 w-12 mx-auto text-destructive mb-3" />
            <CardTitle className="text-xl font-bold text-destructive">Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center">
              You must be logged in to view family trees.
            </p>
            <Button onClick={() => router.push('/login')} className="w-full mt-6">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!userIdFromRoute) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading user ID...</p>
      </div>
    );
  }
  
  if (konnectionStatus !== 'konnected') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4">
        <Card className="max-w-md p-6 shadow-md">
          <CardHeader className="pb-2">
            <ShieldBan className="h-12 w-12 mx-auto text-destructive mb-3" />
            <CardTitle className="text-xl font-bold text-destructive">Access Restricted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center">
              ❗ You must be Konnected with this user to view their tree.
            </p>
            <Button onClick={() => router.back()} className="w-full mt-6">
              <ArrowLeft className="mr-2 h-4 w-4"/> Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h1 className="text-2xl font-headline text-primary">{pageTitle}</h1>
            <Button onClick={() => router.back()} variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4"/> Back
            </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
            You are viewing this tree. { loggedInUser.uid !== userIdFromRoute && "You cannot make changes."}
            Use the tree navigation to explore relationships from different perspectives within this tree.
        </p>
        <InteractiveTreeView targetUserId={userIdFromRoute} isUserViewingOwnTree={loggedInUser.uid === userIdFromRoute} />
    </div>
  );
}

export default function FullTreeDisplayPage() {
  return (
    <AuthGuard> 
      <FullTreeDisplayPageContent />
    </AuthGuard>
  );
}
