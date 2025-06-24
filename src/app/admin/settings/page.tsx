
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function RemovedSettingsPage() {
  return (
    <div className="flex items-center justify-center py-12">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
          <CardTitle className="mt-4 text-2xl font-headline">Page Removed</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The &quot;App Settings&quot; section has been removed or is not yet implemented.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
