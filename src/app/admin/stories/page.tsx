
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function RemovedStoriesPage() {
  return (
    <div className="flex items-center justify-center py-12">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
          <CardTitle className="mt-4 text-2xl font-headline">Page Removed</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The &quot;Stories &amp; Comments Management&quot; section has been removed from the admin panel.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
