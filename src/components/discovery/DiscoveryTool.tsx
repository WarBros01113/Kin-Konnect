
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Info, Link as LinkIconLucide, CheckCircle, ArrowRightLeft, UserCheck, ShieldAlert, BadgePercent, Eye, UsersRound, UserPlus, Hourglass, CheckSquare, XSquare, Lock, ShieldBan, ShieldQuestion, Filter } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { getFunctions, httpsCallable, type FunctionsHttpsCallableResult } from 'firebase/functions';
import { Badge } from '@/components/ui/badge';
import type { MatchedMemberInfo, MatchedIndividualPairClient, KonnectionStatus, Profile } from '@/types';
import { sendKonnectRequest, getKonnectionStatusBetweenUsers, getUserProfile, cancelKonnectRequest } from '@/lib/firebase/firestore';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Link from 'next/link';


interface MatchedTreeResultFromFunction {
  matchedUserId: string;
  matchedUserName?: string;
  score: number;
  totalMembersInTree: number;
  detailedContributingPairs: MatchedIndividualPairClient[];
  myMatchedPersons: MatchedMemberInfo[];
  otherMatchedPersons: MatchedMemberInfo[];
}

interface FindSimilarTreesResponse {
  matches: MatchedTreeResultFromFunction[];
}

const SESSION_STORAGE_SCAN_INITIATED_KEY = 'discoveryScanInitiated';
const SESSION_STORAGE_MATCHED_TREES_KEY = 'discoveryMatchedTrees';

const DnaLoadingAnimation = () => {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-primary">
      <svg 
        width="80" 
        height="120" 
        viewBox="-10 -15 70 130"
        xmlns="http://www.w3.org/2000/svg" 
        className="animate-spin-slow drop-shadow-[0_0_6px_hsl(var(--primary)/0.6)]"
      >
        <path 
          d="M0,0 C0,20 50,20 50,40 C50,60 0,60 0,80 C0,100 50,100 50,100"
          stroke="hsl(var(--primary))" 
          strokeWidth="7" 
          fill="none" 
          strokeLinecap="round"
        />
        <path 
          d="M50,0 C50,20 0,20 0,40 C0,60 50,60 50,80 C50,100 0,100 0,100"
          stroke="hsl(var(--primary))" 
          strokeWidth="7" 
          fill="none" 
          strokeLinecap="round"
        />
        <line x1="10" y1="10" x2="40" y2="10" stroke="hsl(var(--accent))" strokeWidth="5" strokeLinecap="round"/>
        <line x1="5" y1="30" x2="45" y2="30" stroke="hsl(var(--accent))" strokeWidth="5" strokeLinecap="round"/>
        <line x1="10" y1="50" x2="40" y2="50" stroke="hsl(var(--accent))" strokeWidth="5" strokeLinecap="round"/>
        <line x1="5" y1="70" x2="45" y2="70" stroke="hsl(var(--accent))" strokeWidth="5" strokeLinecap="round"/>
        <line x1="10" y1="90" x2="40" y2="90" stroke="hsl(var(--accent))" strokeWidth="5" strokeLinecap="round"/>
      </svg>
      <p className="mt-6 text-lg font-semibold text-primary">Scanning for konnections...</p>
      <p className="text-sm text-muted-foreground">This may take a moment, please wait.</p>
    </div>
  );
};


export default function DiscoveryTool() {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const [loadingScan, setLoadingScan] = useState(false);
  const [loadingKonnectAction, setLoadingKonnectAction] = useState<Record<string, boolean>>({});
  const [currentUserName, setCurrentUserName] = useState<string>('Your Name');
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [filterByNativePlace, setFilterByNativePlace] = useState(false);
  const [filterByReligionCaste, setFilterByReligionCaste] = useState(false);


  const [scanInitiated, setScanInitiated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const storedScanInitiated = sessionStorage.getItem(SESSION_STORAGE_SCAN_INITIATED_KEY);
      return storedScanInitiated === 'true';
    }
    return false;
  });

  const [matchedTrees, setMatchedTrees] = useState<MatchedTreeResultFromFunction[]>(() => {
    if (typeof window !== 'undefined') {
      const storedMatchedTrees = sessionStorage.getItem(SESSION_STORAGE_MATCHED_TREES_KEY);
      try {
        return storedMatchedTrees ? JSON.parse(storedMatchedTrees) : [];
      } catch (e) {
        console.error("Error parsing stored matched trees from sessionStorage", e);
        return [];
      }
    }
    return [];
  });

  const [konnectionStatuses, setKonnectionStatuses] = useState<Record<string, KonnectionStatus>>({});
  const [errorState, setErrorState] = useState<{ title: string, description: string } | null>(null);

   useEffect(() => {
    if (user) {
      setLoadingProfile(true);
      getUserProfile(user.uid).then(profile => {
        if (profile) {
          setCurrentUserName(profile.name || 'Your Name');
          setCurrentUserProfile(profile);
        }
      }).catch(err => {
        console.error("Failed to fetch user profile for discovery:", err);
        toast({ title: "Profile Error", description: "Could not load your profile details.", variant: "destructive" });
      }).finally(() => {
        setLoadingProfile(false);
      });
    } else {
      setLoadingProfile(false);
    }
  }, [user, toast]);

  const fetchKonnectionStatuses = useCallback(async (trees: MatchedTreeResultFromFunction[]) => {
    if (!user) return;
    const newStatuses: Record<string, KonnectionStatus> = {};
    for (const tree of trees) {
      if (tree.matchedUserId !== user.uid) {
        const status = await getKonnectionStatusBetweenUsers(user.uid, tree.matchedUserId);
        newStatuses[tree.matchedUserId] = status;
      }
    }
    setKonnectionStatuses(prev => ({...prev, ...newStatuses}));
  }, [user]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SESSION_STORAGE_SCAN_INITIATED_KEY, String(scanInitiated));
      try {
        sessionStorage.setItem(SESSION_STORAGE_MATCHED_TREES_KEY, JSON.stringify(matchedTrees));
      } catch (e) {
        console.error("Error stringifying matched trees for sessionStorage", e);
      }
    }
    if (matchedTrees.length > 0) {
      fetchKonnectionStatuses(matchedTrees);
    }
  }, [scanInitiated, matchedTrees, fetchKonnectionStatuses]);


  const handleBackendScan = async () => {
    if (!user || !currentUserProfile) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to perform a scan.', variant: 'destructive' });
      return;
    }
    if (currentUserProfile.isPublic === false) {
        toast({title: "Private Mode Active", description: "Switch to Public Mode in your profile to use Discover.", variant: "default"});
        return;
    }
    
    let filterOption = '';
    if (filterByNativePlace && filterByReligionCaste) {
      filterOption = 'combined';
    } else if (filterByNativePlace) {
      filterOption = 'nativePlace';
    } else if (filterByReligionCaste) {
      filterOption = 'religionAndCaste';
    }

    if (!filterOption) {
      toast({ title: "Filter Required", description: "Please select at least one filter to start a scan.", variant: "destructive" });
      return;
    }
    
    if (filterByNativePlace && !currentUserProfile.nativePlace) {
      toast({ title: "Profile Incomplete", description: "You must set your Native Place in your profile to use this filter.", variant: "destructive", duration: 7000 });
      return;
    }
    if (filterByReligionCaste && (!currentUserProfile.religion || !currentUserProfile.caste)) {
      toast({ title: "Profile Incomplete", description: "You must set both your Religion and Caste in your profile to use this filter.", variant: "destructive", duration: 7000 });
      return;
    }


    setLoadingScan(true);
    setScanInitiated(true);
    setMatchedTrees([]);
    setErrorState(null);
    setKonnectionStatuses({});
    setSearchTerm('');

    try {
      const functions = getFunctions();
      const findSimilarFamilyTreesCallable = httpsCallable<any, FindSimilarTreesResponse>(functions, 'findSimilarFamilyTrees');

      const result: FunctionsHttpsCallableResult<FindSimilarTreesResponse> = await findSimilarFamilyTreesCallable({ filterOption });

      if (result.data && result.data.matches) {
        const sortedMatches = result.data.matches.sort((a, b) => b.score - a.score);
        setMatchedTrees(sortedMatches);

        if (sortedMatches.length > 0) {
            toast({ title: 'Scan Complete', description: `Found ${sortedMatches.length} potentially similar tree(s). Review the details below.` });
        } else {
            toast({ title: 'Scan Complete', description: 'No similar trees found matching the current criteria.' });
        }
      } else {
        setMatchedTrees([]);
        toast({ title: 'Scan Complete', description: 'No similar trees found or unexpected response structure from the server.' });
      }
    } catch (error: any) {
      console.error("Error calling findSimilarFamilyTrees function:", error);
      let title = 'Scan Failed';
      let description = "An error occurred while scanning for similar trees. Please check the Firebase Function logs for more details.";

      if (error.code === 'functions/deadline-exceeded' || (error.message && error.message.toLowerCase().includes('deadline exceeded'))) {
        description = "The search took too long and timed out. This can happen with many users. Try using a filter or try again later.";
      } else if (error.code === 'functions/internal') {
         description = `An internal error occurred with the scan. Details: ${error.message}. Please check server logs.`;
      } else if (error.code === 'functions/failed-precondition') {
         description = `A precondition for the scan was not met. ${error.message}`;
      } else if (error.message) {
        description = error.message;
      }
      toast({ title, description, variant: 'destructive', duration: 12000 });
      setErrorState({ title, description });
      setMatchedTrees([]);
    } finally {
      setLoadingScan(false);
    }
  };

  const handleKonnectClick = async (recipientUserId: string) => {
    if (!user || !currentUserProfile) return;
     if (currentUserProfile.isPublic === false) {
      toast({ title: "Private Mode", description: "You cannot send Konnect requests while in Private Mode.", variant: "default" });
      return;
    }
    setLoadingKonnectAction(prev => ({ ...prev, [recipientUserId]: true }));
    try {
      const result = await sendKonnectRequest(user.uid, currentUserName, recipientUserId);
      toast({ title: result.success ? 'Success' : 'Info', description: result.message });
      if (result.status) {
        setKonnectionStatuses(prev => ({ ...prev, [recipientUserId]: result.status! }));
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to send Konnect request.", variant: "destructive" });
    } finally {
      setLoadingKonnectAction(prev => ({ ...prev, [recipientUserId]: false }));
    }
  };

  const handleCancelRequest = async (recipientOfOriginalRequestId: string) => {
    if (!user) return;
    setLoadingKonnectAction(prev => ({ ...prev, [recipientOfOriginalRequestId]: true }));
    try {
      await cancelKonnectRequest(user.uid, recipientOfOriginalRequestId);
      toast({ title: "Request Cancelled", description: "Your Konnect request has been successfully cancelled." });
      setKonnectionStatuses(prev => ({ ...prev, [recipientOfOriginalRequestId]: 'not_konnected' }));
    } catch (error: any) {
      toast({ title: "Error Cancelling Request", description: error.message || "Failed to cancel request.", variant: "destructive" });
    } finally {
      setLoadingKonnectAction(prev => ({ ...prev, [recipientOfOriginalRequestId]: false }));
    }
  };

  const handleViewFullTree = (match: MatchedTreeResultFromFunction) => {
    if (!user) return;
    const status = konnectionStatuses[match.matchedUserId] || 'not_konnected';
    if (status !== 'konnected') {
      toast({
        title: "Access Restricted",
        description: "❗ You must be Konnected with this user to view their tree.",
        variant: "default",
        duration: 5000,
      });
      return;
    }
    router.push(`/full-tree/${match.matchedUserId}`);
  };

  const handleViewCommonMembers = (match: MatchedTreeResultFromFunction) => {
    try {
      const myPersonsData = JSON.stringify(match.myMatchedPersons || []);
      const otherPersonsData = JSON.stringify(match.otherMatchedPersons || []);
      const pairsData = JSON.stringify(match.detailedContributingPairs || []);
      const matchedUserName = encodeURIComponent(match.matchedUserName || 'Matched User');
      router.push(`/common-members/${match.matchedUserId}?myPersonsData=${encodeURIComponent(myPersonsData)}&otherPersonsData=${encodeURIComponent(otherPersonsData)}&pairsData=${encodeURIComponent(pairsData)}&matchedUserName=${matchedUserName}`);
    } catch (e) {
      console.error("Error preparing data for common members page:", e);
      toast({title: "Navigation Error", description: "Could not prepare data for common members view.", variant: "destructive"});
    }
  };

  const filteredMatchedTrees = useMemo(() => {
    if (!searchTerm.trim()) {
      return matchedTrees;
    }
    return matchedTrees.filter(match =>
      match.matchedUserName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [matchedTrees, searchTerm]);


  const renderKonnectButton = (matchedUser: MatchedTreeResultFromFunction) => {
    if (!user || matchedUser.matchedUserId === user.uid || (currentUserProfile && currentUserProfile.isPublic === false)) return null;

    const status = konnectionStatuses[matchedUser.matchedUserId] || 'not_konnected';
    const isLoading = loadingKonnectAction[matchedUser.matchedUserId] || false;

    switch (status) {
      case 'konnected':
        return <Button variant="outline" size="sm" disabled><CheckSquare className="mr-2 h-4 w-4 text-green-500" />Konnected</Button>;
      case 'request_sent':
        return (
            <Button onClick={() => handleCancelRequest(matchedUser.matchedUserId)} variant="outline" size="sm" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XSquare className="mr-2 h-4 w-4 text-destructive"/>}
              Cancel Request
            </Button>
        );
      case 'request_received':
        return (
          <Button asChild variant="default" size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="/konnections">
              <UserPlus className="mr-2 h-4 w-4" /> Respond to Request
            </Link>
          </Button>
        );
      default: // not_konnected
        return (
          <Button onClick={() => handleKonnectClick(matchedUser.matchedUserId)} disabled={isLoading} size="sm">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIconLucide className="mr-2 h-4 w-4" />}
            Konnect
          </Button>
        );
    }
  };

  if (loadingProfile) {
    return <div className="flex justify-center items-center h-[calc(100vh-20rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (currentUserProfile && currentUserProfile.isPublic === false) {
    return (
      <Card className="max-w-lg mx-auto text-center p-6 shadow-md bg-card mt-8">
        <CardHeader className="pb-2">
          <Lock className="h-12 w-12 mx-auto text-primary mb-3" />
          <CardTitle className="text-2xl">Private Mode Active</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-base">
            You're currently in Private Mode. Switch to Public Mode in your profile to discover family trees and send/receive Konnection requests.
          </p>
          <Button asChild className="mt-6">
            <Link href="/profile">Go to Profile Settings</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loadingScan) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 bg-card rounded-lg shadow-xl my-8 min-h-[400px]">
        <DnaLoadingAnimation />
      </div>
    );
  }


  return (
    <div className="space-y-8">
      <Card className="max-w-3xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center">
            <Filter className="mr-3 h-7 w-7 text-primary" /> Discovery Filters
          </CardTitle>
          <CardDescription className="text-base">
            Select filters to find matching trees faster. A filter is required to begin a scan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-sm text-muted-foreground p-4 bg-accent/10 border border-accent/30 rounded-lg space-y-2">
              <p className="flex items-start">
                  <Info className="inline-block h-5 w-5 mr-2 text-accent flex-shrink-0 mt-0.5" />
                  <span>Use filters to find matching trees faster. Broad scans are disabled to prevent delays or timeouts.</span>
              </p>
          </div>

           <div className="text-sm text-muted-foreground p-4 bg-primary/10 border border-primary/30 rounded-lg space-y-2">
              <p className="flex items-start">
                  <ShieldQuestion className="inline-block h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                  <span>
                     For filters to work, please ensure your own <strong>Native Place, Religion, and Caste</strong> are correctly entered in your <Link href="/profile" className="font-semibold text-primary hover:underline">Profile</Link>. The scan first matches these details before comparing full family trees.
                  </span>
              </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-md">
            <div className="flex items-center space-x-3">
              <Checkbox id="filterNativePlace" checked={filterByNativePlace} onCheckedChange={(checked) => setFilterByNativePlace(!!checked)} />
              <Label htmlFor="filterNativePlace" className="text-base font-medium">
                Filter by Native Place
                <p className="text-xs text-muted-foreground">Matches users with the same Native Place as you.</p>
              </Label>
            </div>
             <div className="flex items-center space-x-3">
              <Checkbox id="filterReligionCaste" checked={filterByReligionCaste} onCheckedChange={(checked) => setFilterByReligionCaste(!!checked)} />
              <Label htmlFor="filterReligionCaste" className="text-base font-medium">
                Filter by Religion &amp; Caste
                <p className="text-xs text-muted-foreground">Matches users with the same Religion and Caste as you.</p>
              </Label>
            </div>
          </div>

          <Button 
            onClick={handleBackendScan} 
            className="w-full py-3 text-lg" 
            disabled={loadingScan || !user || loadingProfile || (!filterByNativePlace && !filterByReligionCaste)}
          >
            {loadingScan ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Search className="mr-2 h-5 w-5" />}
            {loadingScan ? 'Scanning Database...' : 'Scan for Similar Trees'}
          </Button>
        </CardContent>
      </Card>

      {scanInitiated && !loadingScan && (
        <div className="mt-12">
          <h2 className="text-3xl font-headline font-semibold text-center mb-6">Scan Results</h2>
          
          {matchedTrees.length > 0 && (
            <div className="mb-6 max-w-lg mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search matched trees by user name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-base"
                />
              </div>
            </div>
          )}

          {errorState ? (
            <Card className="max-w-lg mx-auto text-center p-6 shadow-md bg-destructive/10 border-destructive">
              <CardHeader className="pb-2">
                <ShieldAlert className="h-12 w-12 mx-auto text-destructive mb-3" />
                <CardTitle className="text-2xl text-destructive">{errorState.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-destructive/90 text-base">
                  {errorState.description}
                </p>
                <p className="text-sm text-muted-foreground mt-3">Please try again later or check your profile details. If the issue persists, contact support or check the function logs in Firebase.</p>
              </CardContent>
            </Card>
          ) : filteredMatchedTrees.length > 0 ? (
            <div className="space-y-8">
              {filteredMatchedTrees.map((match) => (
                <Card key={match.matchedUserId} className="shadow-md hover:shadow-lg transition-shadow bg-card">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="font-headline text-2xl flex items-center text-primary">
                                <UserCheck className="mr-3 h-6 w-6"/>
                                {match.matchedUserName || `User ID: ${match.matchedUserId.substring(0,6)}...`}
                                {match.totalMembersInTree > 0 && (
                                    <span className="text-sm font-medium text-muted-foreground ml-2">({match.totalMembersInTree} members)</span>
                                )}
                            </CardTitle>
                            <CardDescription className="text-base flex items-center">
                               <BadgePercent className="mr-2 h-4 w-4 text-accent"/> Overall Tree Similarity Score: <strong className="text-foreground ml-1">{match.score.toFixed(1)}</strong>
                            </CardDescription>
                        </div>
                         <Badge variant="secondary" className="text-sm">Potential Match</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(match.detailedContributingPairs && match.detailedContributingPairs.length > 0) ? (
                       <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                          <AccordionTrigger className="text-lg font-semibold text-foreground hover:no-underline">
                            <div className="flex items-center">
                                <LinkIconLucide className="mr-2 h-5 w-5 text-accent" />Key Contributing Individual Links
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-2 space-y-4">
                            {match.detailedContributingPairs.slice(0, 4).map((pair, index) => (
                                <Card key={index} className="p-4 bg-background shadow-inner">
                                    <div className="grid grid-cols-1 md:grid-cols-11 gap-2 items-center">
                                        <div className="md:col-span-5">
                                            <p className="font-medium text-sm text-primary-foreground bg-primary/80 px-2 py-1 rounded-t-md">In Your Tree</p>
                                            <div className="p-2 border rounded-b-md border-primary/50 min-h-[60px]">
                                                <p><strong>{pair.person1Name}</strong></p>
                                                <p className="text-xs text-muted-foreground">{pair.person1Details}</p>
                                            </div>
                                        </div>
                                         <div className="md:col-span-1 text-center flex justify-center items-center my-2 md:my-0">
                                            <ArrowRightLeft className="h-6 w-6 text-accent" />
                                        </div>
                                        <div className="md:col-span-5">
                                             <p className="font-medium text-sm text-accent-foreground bg-accent/80 px-2 py-1 rounded-t-md">In Their Tree</p>
                                            <div className="p-2 border rounded-b-md border-accent/50 min-h-[60px]">
                                                <p><strong>{pair.person2Name}</strong></p>
                                                <p className="text-xs text-muted-foreground">{pair.person2Details}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 pt-2 border-t border-dashed">
                                        <p className="text-xs font-semibold text-muted-foreground mb-1">Pair Score: <strong className="text-foreground">{pair.pairScore.toFixed(1)}</strong>. Matched on:</p>
                                        <div className="flex flex-wrap gap-1">
                                        {pair.matchReasons.map(reason => (
                                            <Badge key={reason} variant="outline" className="text-xs py-0.5 px-1.5 border-green-500/50 text-green-700 bg-green-500/10">
                                                <CheckCircle className="h-3 w-3 mr-1"/> {reason}
                                            </Badge>
                                        ))}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                            {match.detailedContributingPairs.length > 4 && <p className="text-xs text-muted-foreground text-center">...and {match.detailedContributingPairs.length - 4} more pair(s).</p>}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    ) : (
                        <p className="text-muted-foreground">This tree was flagged as potentially similar due to overall profile characteristics or weaker cumulative links (no individual pairs met the score threshold of 6.5).</p>
                    )}
                     <div className="mt-6 flex flex-col sm:flex-row justify-center items-center gap-3">
                        {renderKonnectButton(match)}
                         {match.detailedContributingPairs && match.detailedContributingPairs.length > 0 && (
                             <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewCommonMembers(match)}
                            >
                               <UsersRound className="mr-2 h-4 w-4" /> View Common Members
                            </Button>
                         )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewFullTree(match)}
                        >
                           <Eye className="mr-2 h-4 w-4" /> View Their Full Tree
                        </Button>
                    </div>
                     {match.score >= 6.5 && (
                         <p className="text-xs text-muted-foreground italic mt-1 text-center">
                            A general tree similarity was detected (overall score >= 6.5).
                         </p>
                     )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !errorState && searchTerm && filteredMatchedTrees.length === 0 ? (
            <Card className="max-w-lg mx-auto text-center p-10 shadow-md bg-card">
                <CardHeader className="pb-2">
                    <Search className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <CardTitle className="text-2xl">No Matches for "{searchTerm}"</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-base">
                    No scanned results match your current search term. Try a different name or clear the search.
                    </p>
                </CardContent>
            </Card>
          ) : !errorState && matchedTrees.length === 0 ? (
            <Card className="max-w-lg mx-auto text-center p-10 shadow-md bg-card">
              <CardHeader className="pb-2">
                <ShieldQuestion className="h-16 w-16 mx-auto text-primary mb-4" />
                <CardTitle className="text-2xl">No Strong Matches Found</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-base mb-4">
                  👉 No members of your family tree details match other trees based on your selected filters.
                </p>
                <div className="text-sm text-muted-foreground/80 text-left space-y-2">
                  <p>Make sure the following details are accurate in your profile for better results:</p>
                  <ul className="list-disc list-inside space-y-1 pl-2">
                    <li><strong>Native Place</strong></li>
                    <li><strong>Religion &amp; Caste</strong></li>
                    <li>For full tree comparison, ensure other details like <strong>First Name</strong> and <strong>Date of Birth</strong> are also correct.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
