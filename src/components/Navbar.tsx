'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Home, Users, UserCircle, LogIn, DatabaseZap, ShieldCheck, Loader2, Link2 as KonnectIcon } from 'lucide-react';

const Navbar = () => {
  const { user, isAdmin, profileLoading, hasPendingKonnectRequests } = useAuth();
  const router = useRouter();

  return (
    <nav className="bg-card shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-2xl font-headline font-bold text-primary hover:text-primary/80 transition-colors">
            KinKonnect
          </Link>
          <div className="flex items-center space-x-1 md:space-x-2">
            {user ? (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/dashboard" className="flex items-center text-xs md:text-sm">
                    <Home className="mr-0 md:mr-2 h-4 w-4 md:h-5 md:w-5" /> <span className="hidden md:inline">Dashboard</span>
                  </Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link href="/family-tree" className="flex items-center text-xs md:text-sm">
                    <Users className="mr-0 md:mr-2 h-4 w-4 md:h-5 md:w-5" /> <span className="hidden md:inline">Family Tree</span>
                  </Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link href="/discover" className="flex items-center text-xs md:text-sm">
                    <DatabaseZap className="mr-0 md:mr-2 h-4 w-4 md:h-5 md:w-5" /> <span className="hidden md:inline">Discover</span>
                  </Link>
                </Button>
                 <Button variant="ghost" asChild>
                  <Link href="/konnections" className="relative flex items-center text-xs md:text-sm">
                    <KonnectIcon className="mr-0 md:mr-2 h-4 w-4 md:h-5 md:w-5" />
                    <span className="hidden md:inline">Konnections</span>
                    {hasPendingKonnectRequests && (
                      <span className="absolute top-1 right-1 md:top-0 md:right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-card" />
                    )}
                  </Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link href="/profile" className="flex items-center text-xs md:text-sm">
                    <UserCircle className="mr-0 md:mr-2 h-4 w-4 md:h-5 md:w-5" /> <span className="hidden md:inline">Profile</span>
                  </Link>
                </Button>
                
                {profileLoading ? (
                  <Button variant="ghost" disabled size="icon" className="h-8 w-8 md:h-10 md:w-10">
                    <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
                  </Button>
                ) : isAdmin ? (
                  <Button variant="outline" className="border-primary text-primary hover:bg-primary/10 text-xs md:text-sm" asChild>
                    <Link href="/admin/dashboard" className="flex items-center">
                      <ShieldCheck className="mr-0 md:mr-2 h-4 w-4 md:h-5 md:w-5" /> <span className="hidden md:inline">Admin Panel</span>
                    </Link>
                  </Button>
                ) : null}

              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login" className="flex items-center">
                    <LogIn className="mr-2 h-5 w-5" /> Login
                  </Link>
                </Button>
                <Button variant="default" asChild>
                  <Link href="/signup" className="flex items-center">
                     Sign Up
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
