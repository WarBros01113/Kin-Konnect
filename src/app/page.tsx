'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2, Users, Search } from 'lucide-react';
import Image from 'next/image';

export default function HomePage() {
  const { user, authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  if (authLoading || (!authLoading && user)) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center px-4">
      {/* Video Section */}
      <div className="w-full max-w-4xl mx-auto mb-8">
        <div className="aspect-video bg-muted rounded-lg shadow-lg overflow-hidden">
          <video
            src="/videos/kinkonnect-intro.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
            onContextMenu={(e) => e.preventDefault()} // Attempt to disable right-click
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </div>

      <p className="text-lg sm:text-xl text-foreground/90 mb-4 italic">
        Every branch holds a story — start yours.
      </p>
      <h1 className="text-4xl sm:text-5xl font-headline font-bold mb-6 text-primary">Welcome to KinKonnect</h1>
      <p className="text-lg sm:text-xl text-foreground/80 mb-8 max-w-2xl">
        Discover, preserve, and share your family history. KinKonnect helps you build your family tree,
        connect with relatives, and uncover your roots with ease.
      </p>
      <div className="space-x-4">
        <Button size="lg" asChild>
          <Link href="/login">Login</Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/signup">Sign Up</Link>
        </Button>
      </div>
      <div className="mt-12 grid md:grid-cols-2 gap-8 w-full max-w-4xl">
        <div className="bg-card p-6 rounded-lg shadow-md">
          <Users className="h-10 w-10 text-accent mb-3 mx-auto md:mx-0" />
          <h3 className="text-2xl font-headline font-semibold mb-2">Build Your Tree</h3>
          <p className="text-muted-foreground">Easily add family members and visualize your lineage. Keep track of important dates and relationships.</p>
        </div>
        <div className="bg-card p-6 rounded-lg shadow-md">
          <Search className="h-10 w-10 text-accent mb-3 mx-auto md:mx-0" />
          <h3 className="text-2xl font-headline font-semibold mb-2">Discover Your Kins</h3>
          <p className="text-muted-foreground">Explore potential connections and find new relatives across the KinKonnect network using our smart discovery tools.</p>
        </div>
      </div>
    </div>
  );
}
