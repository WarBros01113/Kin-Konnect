
'use client';

import type { FamilyMember, Profile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, VenetianMask, Heart, HeartCrack, Users2 } from 'lucide-react'; 

interface FamilyStatsSummaryProps {
  familyMembers: FamilyMember[];
  userProfile: Profile | null;
}

export default function FamilyStatsSummary({ familyMembers, userProfile }: FamilyStatsSummaryProps) {
  if (!userProfile) {
    return null; 
  }

  // Filter out family members marked as alternate profiles before counting
  const countedFamilyMembers = familyMembers.filter(member => !member.isAlternateProfile);

  // Ensure allPeople includes the user's profile and only non-alternate family members for accurate counting.
  const allPeople: (Profile | FamilyMember)[] = [userProfile, ...countedFamilyMembers];

  const totalMembers = allPeople.length;
  // Counts rely on the 'gender' field being explicitly set to 'Male', 'Female', or another value.
  const maleCount = allPeople.filter(p => p.gender === 'Male').length;
  const femaleCount = allPeople.filter(p => p.gender === 'Female').length;
  const otherGenderCount = allPeople.filter(p => p.gender && p.gender !== 'Male' && p.gender !== 'Female').length;
  
  const aliveCount = allPeople.filter(p => !p.isDeceased).length;
  const deceasedCount = allPeople.filter(p => p.isDeceased).length;

  return (
    <Card className="shadow-lg my-8">
      <CardHeader>
        <CardTitle className="text-2xl font-headline flex items-center">
          <Users2 className="w-7 h-7 mr-3 text-primary" />
          Family Tree Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
          <div className="p-3 bg-muted/50 rounded-md">
            <Users className="w-8 h-8 mx-auto mb-1 text-accent" />
            <p className="text-2xl font-semibold">{totalMembers}</p>
            <p className="text-xs text-muted-foreground">Total Members</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-md">
            <div className="flex justify-center items-center mb-1 h-8 w-8 mx-auto">
              {/* Male Icon SVG */}
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                <circle cx="12" cy="10" r="4"></circle>
                <line x1="12" y1="14" x2="12" y2="21"></line>
                <line x1="9" y1="18" x2="15" y2="18"></line>
                <line x1="12" y1="4" x2="12" y2="1"></line>
                 <line x1="15" y1="1" x2="9" y2="1"></line>
              </svg>
            </div>
            <p className="text-2xl font-semibold">{maleCount}</p>
            <p className="text-xs text-muted-foreground">Male</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-md">
            <div className="flex justify-center items-center mb-1 h-8 w-8 mx-auto">
              {/* Female Icon SVG */}
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-500">
                <circle cx="12" cy="12" r="4"></circle>
                <line x1="12" y1="16" x2="12" y2="21"></line>
                <line x1="9" y1="19" x2="15" y2="19"></line>
              </svg>
            </div>
            <p className="text-2xl font-semibold">{femaleCount}</p>
            <p className="text-xs text-muted-foreground">Female</p>
          </div>
           {otherGenderCount > 0 && (
            <div className="p-3 bg-muted/50 rounded-md">
                <VenetianMask className="w-8 h-8 mx-auto mb-1 text-purple-500" />
                <p className="text-2xl font-semibold">{otherGenderCount}</p>
                <p className="text-xs text-muted-foreground">Other Gender</p>
            </div>
           )}
          <div className="p-3 bg-muted/50 rounded-md">
            <Heart className="w-8 h-8 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-semibold">{aliveCount}</p>
            <p className="text-xs text-muted-foreground">Alive</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-md">
            <HeartCrack className="w-8 h-8 mx-auto mb-1 text-red-500" />
            <p className="text-2xl font-semibold">{deceasedCount}</p>
            <p className="text-xs text-muted-foreground">Deceased</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Note: Gender counts are based on the "Gender" field. Ensure this is updated for accuracy.
          <br />
          Alternate profiles are excluded from these totals to prevent double counting.
        </p>
      </CardContent>
    </Card>
  );
}
