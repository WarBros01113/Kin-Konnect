
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/providers/AuthProvider';
import { getFamilyWithGenerations } from '@/lib/tree-utils/calculateGenerations';
import type { MemberWithGeneration, MatchedMemberInfo, MatchedIndividualPairClient } from '@/types';
import { Loader2, Users, Milestone, Search as SearchIcon, ArrowLeft, UsersRound, UserSquare2, UserCheck, Info } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { calculateAge } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DisplayableMatchedMember extends MatchedMemberInfo {
  generation?: number | null;
}

// SESSION_STORAGE_COMMON_MEMBERS_PREFIX is removed as it's not used in this reverted version

function CommonMembersPageContent() {
  const { user: authUser } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const matchedUserId = params.matchedUserId as string;
  const [matchedUserName, setMatchedUserName] = useState<string>('Matched User');

  const [myCommonMembers, setMyCommonMembers] = useState<DisplayableMatchedMember[]>([]);
  const [theirCommonMembers, setTheirCommonMembers] = useState<DisplayableMatchedMember[]>([]);
  // const [detailedPairs, setDetailedPairs] = useState<MatchedIndividualPairClient[]>([]); // Kept for potential future use

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataTrulyMissing, setDataTrulyMissing] = useState(false); 

  const [searchTermMy, setSearchTermMy] = useState('');
  const [searchTermTheir, setSearchTermTheir] = useState('');

  useEffect(() => {
    let parsedMyPersons: MatchedMemberInfo[] = [];
    let parsedTheirPersons: MatchedMemberInfo[] = [];
    // let parsedPairsData: MatchedIndividualPairClient[] = []; // If needed later

    const myPersonsQueryParam = searchParams.get('myPersonsData');
    const theirPersonsQueryParam = searchParams.get('otherPersonsData');
    // const pairsQueryParam = searchParams.get('pairsData'); // If needed later
    const nameQueryParam = searchParams.get('matchedUserName');

    if (nameQueryParam) {
      setMatchedUserName(decodeURIComponent(nameQueryParam));
    }

    if (typeof window !== 'undefined' && matchedUserId) {
      try {
        if (myPersonsQueryParam) {
          parsedMyPersons = JSON.parse(myPersonsQueryParam);
        }
        if (theirPersonsQueryParam) {
          parsedTheirPersons = JSON.parse(theirPersonsQueryParam);
        }
        // if (pairsQueryParam) { // If needed later
        //   parsedPairsData = JSON.parse(pairsQueryParam);
        // }
        console.log("[CommonMembersPage] Retrieved My Matched Persons (from URL):", parsedMyPersons);
        console.log("[CommonMembersPage] Retrieved Their Matched Persons (from URL):", parsedTheirPersons);

      } catch (e: any) {
        console.error("Error parsing common members data from URL:", e);
        setError(`Could not load data for common members (invalid data format in URL: ${e.message}).`);
        setDataTrulyMissing(true);
        setLoading(false);
        return; 
      }
    } else if (!matchedUserId) {
        console.error("[CommonMembersPage] matchedUserId is missing from params.");
        setError("Matched user ID is missing.");
        setDataTrulyMissing(true);
    }


    setTheirCommonMembers(parsedTheirPersons); // Set this directly

    if (parsedMyPersons.length === 0 && parsedTheirPersons.length === 0 && (!myPersonsQueryParam && !theirPersonsQueryParam)) {
      setDataTrulyMissing(true); 
    }


    if (authUser && parsedMyPersons.length > 0) {
      setLoading(true); 
      getFamilyWithGenerations(authUser.uid)
        .then(allMyMembersWithGenerations => {
          const idToGenerationMap = new Map<string, number | null>();
          allMyMembersWithGenerations.forEach(m => {
            idToGenerationMap.set(m.id, m.generation);
          });

          const myEnrichedMembers = parsedMyPersons.map(person => ({
            ...person,
            generation: idToGenerationMap.get(person.id) ?? null,
          }));
          setMyCommonMembers(myEnrichedMembers);
          console.log("[CommonMembersPage] My Enriched Members (with generation):", myEnrichedMembers);
        })
        .catch(err => {
          console.error("Error fetching generations for my common members:", err);
          setError(err.message || "Could not load generation data for your members.");
          setMyCommonMembers(parsedMyPersons.map(p => ({ ...p, generation: null })));
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (authUser && parsedMyPersons.length === 0) {
        setMyCommonMembers([]); 
        setLoading(false); 
        console.log("[CommonMembersPage] No 'My Matched Persons' data to process with generations from URL.");
    } else if (!authUser) {
        setError("User not authenticated.");
        setLoading(false);
    } else { 
        setLoading(false); 
    }

  }, [authUser, matchedUserId, searchParams]); 

  const filterAndSortMembers = (members: DisplayableMatchedMember[], term: string) => {
    let processed = members;
    if (term.trim()) {
      processed = processed.filter(member =>
        member.name?.toLowerCase().includes(term.trim().toLowerCase()) ||
        member.relationshipToTheirOwner?.toLowerCase().includes(term.trim().toLowerCase())
      );
    }
    return processed.sort((a, b) => {
      const genA = a.generation === undefined || a.generation === null ? Infinity : a.generation;
      const genB = b.generation === undefined || b.generation === null ? Infinity : b.generation;
      if (genA !== genB) return genA - genB;
      const dateA = a.dob && a.dob !== "N/A" ? new Date(a.dob).getTime() : Infinity;
      const dateB = b.dob && b.dob !== "N/A" ? new Date(b.dob).getTime() : Infinity;
      if (dateA !== dateB) return dateA - dateB;
      return (a.name || '').localeCompare(b.name || '');
    });
  };

  const filteredMyCommonMembers = useMemo(() => filterAndSortMembers(myCommonMembers, searchTermMy), [myCommonMembers, searchTermMy]);
  const filteredTheirCommonMembers = useMemo(() => filterAndSortMembers(theirCommonMembers, searchTermTheir), [theirCommonMembers, searchTermTheir]);

  const groupMembersByGeneration = (members: DisplayableMatchedMember[]) => {
    const groups: { [key: string]: DisplayableMatchedMember[] } = {};
    members.forEach(member => {
      const genKey = member.generation === null || member.generation === undefined ? "Unknown Generation" : `Generation ${member.generation}`;
      if (!groups[genKey]) groups[genKey] = [];
      groups[genKey].push(member);
    });
    return Object.entries(groups).sort(([keyA], [keyB]) => {
        if (keyA === "Unknown Generation") return 1;
        if (keyB === "Unknown Generation") return -1;
        const numA = parseInt(keyA.replace("Generation ", ""), 10);
        const numB = parseInt(keyB.replace("Generation ", ""), 10);
        return numA - numB;
    });
  };

  const groupedMyCommonMembers = useMemo(() => groupMembersByGeneration(filteredMyCommonMembers), [filteredMyCommonMembers]);

  const renderMemberTable = (members: DisplayableMatchedMember[], title: string, showGeneration: boolean, searchTerm: string, setSearchTerm: (term: string) => void) => (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl font-headline flex items-center">
          {showGeneration ? <UserCheck className="mr-2 h-6 w-6 text-primary" /> : <UserSquare2 className="mr-2 h-6 w-6 text-accent" />}
           {title} ({members.length})
        </CardTitle>
        <div className="relative mt-2">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            {searchTerm ? "No members match your search." : "No members to display for this view."}
          </p>
        ) : showGeneration ? (
          <Accordion type="multiple" defaultValue={groupedMyCommonMembers.map(([key]) => key)} className="w-full">
            {groupedMyCommonMembers.map(([generationKey, genMembers]) => (
              <AccordionItem value={generationKey} key={generationKey}>
                <AccordionTrigger className="text-lg font-semibold hover:no-underline text-primary/90 py-2.5 px-1.5">
                  <div className="flex items-center"><Milestone className="mr-2 h-5 w-5" /> {generationKey} ({genMembers.length})</div>
                </AccordionTrigger>
                <AccordionContent className="pt-0">
                  {renderBasicTable(genMembers, true)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          renderBasicTable(members, false)
        )}
      </CardContent>
    </Card>
  );

  const renderBasicTable = (membersToRender: DisplayableMatchedMember[], showGenerationCol: boolean) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[35%]">Name</TableHead>
            <TableHead>DOB</TableHead>
            <TableHead>Age / Status</TableHead>
            <TableHead>Gender</TableHead>
            {showGenerationCol && <TableHead>Generation (to You)</TableHead>}
            {!showGenerationCol && <TableHead>Role (in Their Tree)</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {membersToRender.map((member) => {
            const age = member.dob && member.dob !== "N/A" ? calculateAge(member.dob) : null;
            const displayDob = member.dob === "N/A" ? "N/A" : (member.dob ? new Date(member.dob).toLocaleDateString() : "N/A");
            let ageStatus = member.isDeceased ? "Deceased" : (age !== null ? `${age} years` : "N/A");
            return (
              <TableRow key={member.id}>
                <TableCell className="font-medium">{member.name || 'Unnamed'}</TableCell>
                <TableCell>{displayDob}</TableCell>
                <TableCell>{ageStatus}</TableCell>
                <TableCell>{member.gender || 'N/A'}</TableCell>
                {showGenerationCol && <TableCell>{member.generation !== null && member.generation !== undefined ? member.generation : 'N/A'}</TableCell>}
                {!showGenerationCol && <TableCell>{member.relationshipToTheirOwner || 'N/A'}</TableCell>}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  if (loading && !dataTrulyMissing) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading common family members...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-4">Error Loading Data</h1>
        <p className="text-destructive-foreground bg-destructive/20 p-3 rounded-md">{error}</p>
        <Button onClick={() => router.back()} className="mt-6">
            <ArrowLeft className="mr-2 h-4 w-4"/> Go Back
        </Button>
      </div>
    );
  }

  if (dataTrulyMissing) { 
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4 text-center">
        <Card className="max-w-md p-6 shadow-md">
            <CardHeader className="pb-2">
                 <Info className="h-12 w-12 mx-auto text-primary mb-3" />
                <CardTitle className="text-xl font-bold text-primary">No Common Members Data</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                No specific common members data was passed to this page, or the data was invalid/cleared.
                This can happen if you navigated here directly or refreshed the page after viewing. Please go back to the Discovery page and re-run the scan.
                </p>
            </CardContent>
            <CardFooter>
                <Button onClick={() => router.back()} className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4"/> Back to Discovery
                </Button>
            </CardFooter>
        </Card>
      </div>
    );
  }
  
  if (!loading && !dataTrulyMissing && filteredMyCommonMembers.length === 0 && filteredTheirCommonMembers.length === 0 && !searchTermMy && !searchTermTheir) {
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4 text-center">
         <Card className="max-w-md p-6 shadow-md">
            <CardHeader className="pb-2">
                 <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <CardTitle className="text-xl font-bold text-primary">No Common Members to Display</CardTitle>
            </CardHeader>
            <CardContent>
                 <p className="text-muted-foreground">
                    Although a potential match was found, no specific common individuals could be displayed with current information or filters (perhaps no pairs scored above the threshold).
                </p>
            </CardContent>
             <CardFooter>
                <Button onClick={() => router.back()} className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4"/> Back to Discovery
                </Button>
            </CardFooter>
        </Card>
      </div>
    );
  }


  return (
    <div className="container mx-auto py-8">
      <Card className="shadow-xl mb-8">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <CardTitle className="text-3xl font-headline flex items-center">
              <UsersRound className="mr-3 h-8 w-8 text-primary" /> Common Members with {matchedUserName}
            </CardTitle>
            <Button onClick={() => router.back()} variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4"/> Back to Discovery
            </Button>
          </div>
          <CardDescription>
            Showing individuals who contributed to the match. "My Members" are from your tree, "Their Members" are from {matchedUserName}'s tree.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="my_members" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="my_members">My Matched Members ({filteredMyCommonMembers.length})</TabsTrigger>
          <TabsTrigger value="their_members">Their Matched Members ({filteredTheirCommonMembers.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="my_members">
          {renderMemberTable(filteredMyCommonMembers, "From Your Tree", true, searchTermMy, setSearchTermMy)}
        </TabsContent>
        <TabsContent value="their_members">
          {renderMemberTable(filteredTheirCommonMembers, `From ${matchedUserName}'s Tree`, false, searchTermTheir, setSearchTermTheir)}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function CommonMembersPage() {
  return (
    <AuthGuard>
      <CommonMembersPageContent />
    </AuthGuard>
  );
}

    