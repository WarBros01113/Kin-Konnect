'use client'; 

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 bg-background">
      <AlertTriangle className="w-16 h-16 text-destructive mb-6" />
      <h1 className="text-4xl font-headline font-bold text-destructive mb-4">Oops! Something went wrong.</h1>
      <p className="text-lg text-foreground/80 mb-8 max-w-md">
        We encountered an unexpected issue. Please try again, or contact support if the problem persists.
      </p>
      <p className="text-sm text-muted-foreground mb-6">Error: {error.message}</p>
      <Button
        onClick={() => reset()}
        size="lg"
        className="bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        Try Again
      </Button>
    </div>
  );
}
