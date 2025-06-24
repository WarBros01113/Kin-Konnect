
'use client';

import React from 'react';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/providers/AuthProvider';
import InteractiveTreeView from '@/components/tree/InteractiveTreeView';
import { Loader2 } from 'lucide-react';

function FamilyTreePageContent() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading || !user) {
    return <div className="flex justify-center items-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return <InteractiveTreeView targetUserId={user.uid} isUserViewingOwnTree={true} />;
}

export default function FamilyTreePage() {
  return (
    <AuthGuard>
      <FamilyTreePageContent />
    </AuthGuard>
  );
}

    