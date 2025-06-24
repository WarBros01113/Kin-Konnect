
'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, Network, Loader2 } from 'lucide-react';
import { getAllUsers, getAllFamilyMembers } from '@/lib/firebase/firestore';
import type { Profile, FamilyMember } from '@/types'; // Ensure types are imported
import { useToast } from '@/hooks/use-toast'; // Import useToast

export default function AdminDashboardPage() {
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [totalMembers, setTotalMembers] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const { toast } = useToast(); // Initialize toast

  useEffect(() => {
    async function fetchStats() {
      setLoadingStats(true);
      try {
        const users = await getAllUsers();
        setTotalUsers(users.length);
        
        const membersData = await getAllFamilyMembers(); // This includes all family members across users
        // Total members = all unique users + all unique family members they've added.
        // If a user is also listed as a family member for someone else, they'd be counted in both.
        // The current approach counts distinct users + distinct family member entries.
        // For a simpler count of "people entities in the system (users + members they added)":
        setTotalMembers(users.length + membersData.length); 

      } catch (error: any) {
        console.error("Failed to fetch admin stats:", error);
        toast({
          title: "Error Fetching Dashboard Stats",
          description: `Could not load admin statistics. This might be due to Firestore security rules. Please check console for details. Error: ${error.message}`,
          variant: "destructive",
          duration: 9000,
        });
        setTotalUsers(0); // Fallback
        setTotalMembers(0); // Fallback
      } finally {
        setLoadingStats(false);
      }
    }
    fetchStats();
  }, [toast]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-bold text-primary">Admin Dashboard Overview</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Registered Users</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : (
              <div className="text-2xl font-bold">{totalUsers ?? 'N/A'}</div>
            )}
            <p className="text-xs text-muted-foreground">
              All users in the system.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profile Entities</CardTitle>
            <Network className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : (
              <div className="text-2xl font-bold">{totalMembers ?? 'N/A'}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Sum of registered users and all family members added.
            </p>
          </CardContent>
        </Card>
        {/* More stat cards can be added here as features are built out */}
      </div>

      {/* Placeholder for future charts or more detailed stats */}
      {/* <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Activity Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">Charts and detailed stats coming soon.</p>
          </CardContent>
        </Card>
      </div> */}
    </div>
  );
}
