
'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import InteractiveTreeView from '@/components/tree/InteractiveTreeView';
import { Loader2 } from 'lucide-react';
// AdminGuard is applied via AdminLayout, so no need to wrap here directly

function AdminViewTreePageContent() {
  const params = useParams();
  const userIdFromRoute = params.userId as string;

  if (!userIdFromRoute) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading user ID...</p>
      </div>
    );
  }

  return <InteractiveTreeView targetUserId={userIdFromRoute} isUserViewingOwnTree={false} />;
}

export default function AdminViewTreePage() {
  // The AdminLayout already wraps this page with AdminGuard
  return <AdminViewTreePageContent />;
}

    