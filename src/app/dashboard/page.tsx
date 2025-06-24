'use client';

import React, { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { UserCircle, Users, Settings, Loader2, Search, LibraryBig, ListOrdered, GitCompareArrows, CalendarDays, Award } from 'lucide-react';
import Image from 'next/image';
import { getUserProfile, getFamilyMembers } from '@/lib/firebase/firestore';
import type { Profile, FamilyMember, BadgeDetails as UserBadgeDetails } from '@/types';
import { getBadgeForMemberCount, NO_BADGE } from '@/lib/badgeUtils';
import AppFooter from '@/components/AppFooter'; // Import the new footer

function DashboardContent() {
  const { user: authUser } = useAuth();
  const router = useRouter();
  const [firestoreProfile, setFirestoreProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [familyMemberCount, setFamilyMemberCount] = useState(0);
  const [currentBadge, setCurrentBadge] = useState<UserBadgeDetails>(NO_BADGE);

  useEffect(() => {
    if (authUser) {
      setProfileLoading(true);
      Promise.all([
        getUserProfile(authUser.uid),
        getFamilyMembers(authUser.uid)
      ]).then(([profile, members]) => {
        setFirestoreProfile(profile);
        const activeMemberCount = members.filter(fm => !fm.isAlternateProfile).length;
        setFamilyMemberCount(activeMemberCount);
        if (profile) { 
           setCurrentBadge(getBadgeForMemberCount(activeMemberCount)); 
        } else {
           setCurrentBadge(NO_BADGE);
        }
      }).catch(err => {
        console.error("Failed to fetch user profile or members for dashboard:", err);
        setCurrentBadge(NO_BADGE);
      }).finally(() => {
        setProfileLoading(false);
      });
    } else {
      setProfileLoading(false);
    }
  }, [authUser]);

  if ((profileLoading && !firestoreProfile) || authUser === null) {
    return <div className="flex justify-center items-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  const displayName = firestoreProfile?.name || authUser?.displayName || authUser?.email || "User";
  const badgeDisplay = currentBadge.name !== 'None' 
    ? `You're a ${currentBadge.name} Badge Holder ${currentBadge.icon}`
    : "Start building your tree to earn badges!";

  return (
    <div className="space-y-8">
      <header className="bg-card p-6 rounded-lg shadow-md">
        <h1 className="text-3xl sm:text-4xl font-headline font-bold text-primary">Welcome, {displayName}!</h1>
        <p className="text-base sm:text-lg text-muted-foreground mt-1 italic">
          Every branch holds a story — start yours.
        </p>
        <p className="text-muted-foreground mt-2 text-base sm:text-lg flex items-center">
           {badgeDisplay}
        </p>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <UserCircle className="h-10 w-10 text-accent mb-2" />
            <CardTitle className="font-headline text-2xl">My Profile</CardTitle>
            <CardDescription>View and update your personal information and badge progress.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/profile">Go to Profile</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <Users className="h-10 w-10 text-accent mb-2" />
            <CardTitle className="font-headline text-2xl">Family Tree</CardTitle>
            <CardDescription>Manage members, view stats, and add stories.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/family-tree">View Family Tree</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <Search className="h-10 w-10 text-accent mb-2" />
            <CardTitle className="font-headline text-2xl">Discover Connections</CardTitle>
            <CardDescription>Find potential relatives across the KinKonnect network.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="outline">
              <Link href="/discover">Explore Discover</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <ListOrdered className="h-10 w-10 text-accent mb-2" />
            <CardTitle className="font-headline text-2xl">Family List by Generation</CardTitle>
            <CardDescription>View all members sorted by their generation level.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/family-list">View Generational List</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <GitCompareArrows className="h-10 w-10 text-accent mb-2" />
            <CardTitle className="font-headline text-2xl">Find Relationship</CardTitle>
            <CardDescription>Discover how two members in your tree are related.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="outline">
              <Link href="/find-relationship">Find Relationship</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CalendarDays className="h-10 w-10 text-accent mb-2" />
            <CardTitle className="font-headline text-2xl">Family Calendar</CardTitle>
            <CardDescription>View important family dates and anniversaries.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/calendar">Open Calendar</Link>
            </Button>
          </CardContent>
        </Card>

      </div>

      <Card className="mt-8">
        <CardHeader>
            <CardTitle className="font-headline text-2xl">Quick Start Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
                <div className="bg-primary/20 text-primary p-2 rounded-full flex-shrink-0">
                    <UserCircle className="h-5 w-5" />
                </div>
                <p><strong>Complete Your Profile:</strong> Head to the <Link href="/profile" className="text-primary hover:underline">Profile</Link> page to add your details like name, photo, and birth place.</p>
            </div>
            <div className="flex items-start space-x-3">
                <div className="bg-primary/20 text-primary p-2 rounded-full flex-shrink-0">
                    <Users className="h-5 w-5" />
                </div>
                <p><strong>Add Family Members:</strong> Go to the <Link href="/family-tree" className="text-primary hover:underline">Family Tree</Link> section to start adding your relatives and their stories.</p>
            </div>
             <div className="flex items-start space-x-3">
                <div className="bg-primary/20 text-primary p-2 rounded-full flex-shrink-0">
                    <Image src="https://placehold.co/100x100.png" alt="Family Connections" width={24} height={24} className="rounded-sm" data-ai-hint="network connection"/>
                </div>
                <p><strong>Explore Connections:</strong> Use the <Link href="/discover" className="text-primary hover:underline">Discover</Link> page to find potential new relatives based on shared family data.</p>
            </div>
             <div className="flex items-start space-x-3">
                <div className="bg-primary/20 text-primary p-2 rounded-full flex-shrink-0">
                    <CalendarDays className="h-5 w-5" />
                </div>
                <p><strong>Check the Calendar:</strong> Visit the <Link href="/calendar" className="text-primary hover:underline">Family Calendar</Link> to see upcoming birthdays and anniversaries.</p>
            </div>
        </CardContent>
      </Card>
      
      <AppFooter />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
