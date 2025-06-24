
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getFamilyMembers, deleteFamilyMember, getUserProfile, updateUserProfile } from '@/lib/firebase/firestore';
import type { FamilyMember, Profile, BasicPerson } from '@/types';
import FamilyMemberCard from '@/components/family/FamilyMemberCard';
import FamilyMemberForm from '@/components/family/FamilyMemberForm';
import FamilyStatsSummary from '@/components/family/FamilyStatsSummary';
import FamilyTreeVisualization from '@/components/tree/FamilyTreeVisualization';
import { ReactFlowProvider } from 'reactflow';
import { Loader2, UserPlus, Users, ListTree, Home, ArrowLeft, Search as SearchIcon, Filter as FilterIcon, SortAsc, Heart, ShieldQuestion, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { calculateAge, sortPeopleByAge, getOrdinal } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card as UiCard, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useAuth } from '@/providers/AuthProvider';

interface InteractiveTreeViewProps {
  targetUserId: string;
  isUserViewingOwnTree: boolean;
}

export default function InteractiveTreeView({ targetUserId, isUserViewingOwnTree }: InteractiveTreeViewProps) {
  const { user: loggedInUser } = useAuth();
  const { toast } = useToast();
  const [targetUserProfile, setTargetUserProfile] = useState<Profile | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<FamilyMember | null>(null);

  const [currentAnchorMember, setCurrentAnchorMember] = useState<BasicPerson | null>(null);
  const [currentRootId, setCurrentRootId] = useState<string | null>(null);
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);

  const [activeTab, setActiveTab] = useState<string>("tree"); // Default to tree view

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [memberToDeleteId, setMemberToDeleteId] = useState<string | null>(null);

  const [displayedMembers, setDisplayedMembers] = useState<FamilyMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [filterAgeMin, setFilterAgeMin] = useState('');
  const [filterAgeMax, setFilterAgeMax] = useState('');
  const [filterPlace, setFilterPlace] = useState('');
  const [filterCaste, setFilterCaste] = useState('');
  const [filterReligion, setFilterReligion] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const scrollPositionRef = useRef<number>(0);

  useEffect(() => {
    if (targetUserId) {
      setLoadingProfile(true);
      getUserProfile(targetUserId)
        .then(profile => {
          if (profile) {
            setTargetUserProfile({
              ...profile,
              gender: profile.gender || 'Other',
              childIds: profile.childIds || [],
              spouseIds: profile.spouseIds || [],
              divorcedSpouseIds: profile.divorcedSpouseIds || [],
              siblingIds: profile.siblingIds || [],
            });
            if (!currentRootId) { 
                 setCurrentRootId(profile.id);
            }
            if (!currentAnchorMember && !isFormOpen && isUserViewingOwnTree) { // Only set anchor if own tree and not opening form
                 setCurrentAnchorMember(profile);
            }

          } else {
            toast({ title: "Error", description: `Profile for user ${targetUserId} not found.`, variant: "destructive" });
            setTargetUserProfile(null);
          }
        })
        .catch(err => {
          console.error(`Failed to fetch profile for user ${targetUserId}:`, err);
          toast({ title: "Error", description: `Could not fetch profile. Error: ${(err as Error).message}`, variant: "destructive" });
          setTargetUserProfile(null);
        })
        .finally(() => setLoadingProfile(false));
    } else {
      setLoadingProfile(false);
      setTargetUserProfile(null);
    }
  }, [targetUserId, toast, isUserViewingOwnTree]); 

  const fetchMembers = useCallback(async () => {
    if (targetUserId) {
      setLoading(true);
      try {
        const members = await getFamilyMembers(targetUserId);
        setFamilyMembers(members);
      } catch (error) {
        console.error(`Failed to fetch family members for user ${targetUserId}:`, error);
        toast({ title: "Error", description: `Could not fetch family members. Error: ${(error as Error).message}`, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
  }, [targetUserId, toast]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    let processedMembers = [...familyMembers];
    if (searchTerm.trim()) {
      processedMembers = processedMembers.filter(member =>
        member.name?.toLowerCase().includes(searchTerm.trim().toLowerCase())
      );
    }
    if (filterPlace.trim()) {
        processedMembers = processedMembers.filter(member =>
            (member.bornPlace?.toLowerCase().includes(filterPlace.trim().toLowerCase())) ||
            (member.currentPlace?.toLowerCase().includes(filterPlace.trim().toLowerCase()))
        );
    }
    if (filterCaste.trim()) {
        processedMembers = processedMembers.filter(member =>
            member.caste?.toLowerCase().includes(filterCaste.trim().toLowerCase())
        );
    }
    if (filterReligion.trim()) {
        processedMembers = processedMembers.filter(member =>
            member.religion?.toLowerCase().includes(filterReligion.trim().toLowerCase())
        );
    }
    if (filterGender && filterGender !== 'any_gender') {
      processedMembers = processedMembers.filter(member => member.gender === filterGender);
    }
    if (filterStatus && filterStatus !== 'any_status') {
      if (filterStatus === 'alive') {
        processedMembers = processedMembers.filter(member => !member.isDeceased);
      } else if (filterStatus === 'deceased') {
        processedMembers = processedMembers.filter(member => member.isDeceased);
      }
    }
    const ageMin = parseInt(filterAgeMin, 10);
    const ageMax = parseInt(filterAgeMax, 10);
    if (!isNaN(ageMin) || !isNaN(ageMax)) {
        processedMembers = processedMembers.filter(member => {
            if (member.isDeceased) return false;
            const age = calculateAge(member.dob || "N/A");
            if (age === null) return false;
            const passesMin = isNaN(ageMin) || age >= ageMin;
            const passesMax = isNaN(ageMax) || age <= ageMax;
            return passesMin && passesMax;
        });
    }
    switch (sortBy) {
        case 'name-asc':
            processedMembers.sort((a, b) => (a.name?.toLowerCase() || '').localeCompare(b.name?.toLowerCase() || ''));
            break;
        case 'name-desc':
            processedMembers.sort((a, b) => (b.name?.toLowerCase() || '').localeCompare(a.name?.toLowerCase() || ''));
            break;
        case 'dob-asc':
            processedMembers = sortPeopleByAge(processedMembers, true);
            break;
        case 'dob-desc':
            processedMembers = sortPeopleByAge(processedMembers, false);
            break;
        default:
            processedMembers.sort((a, b) => (a.name?.toLowerCase() || '').localeCompare(b.name?.toLowerCase() || ''));
            break;
    }
    setDisplayedMembers(processedMembers);
  }, [
    familyMembers, searchTerm, sortBy,
    filterAgeMin, filterAgeMax, filterPlace, filterCaste, filterReligion, filterGender, filterStatus
  ]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterAgeMin(''); setFilterAgeMax(''); setFilterPlace('');
    setFilterCaste(''); setFilterReligion(''); setFilterGender(''); setFilterStatus('');
  };

  const handleOpenAddForm = () => {
    if (!isUserViewingOwnTree) return;
    setMemberToEdit(null);
    const anchor = currentRootId ? (familyMembers.find(fm => fm.id === currentRootId) || targetUserProfile) : targetUserProfile;
    setCurrentAnchorMember(anchor);
    setIsFormOpen(true);
  };

  const handleOpenAddRelativeToForm = (member: BasicPerson) => {
    if (!isUserViewingOwnTree) return;
    setMemberToEdit(null);
    setCurrentAnchorMember(member);
    setIsFormOpen(true);
  };

  const handleEditMember = (member: FamilyMember) => {
    if (!isUserViewingOwnTree) return;
    setMemberToEdit(member);
    setCurrentAnchorMember(null);
    setIsFormOpen(true);
  };

  const handleDeleteMember = async () => {
    if (!targetUserId || !memberToDeleteId || !isUserViewingOwnTree) return;
    try {
      await deleteFamilyMember(targetUserId, memberToDeleteId);
      toast({ title: "Success", description: "Family member deleted." });
      await fetchMembers();
      if (targetUserProfile) {
        const updatedProfile = await getUserProfile(targetUserId);
        if (updatedProfile) setTargetUserProfile({...updatedProfile, childIds: updatedProfile.childIds || [], spouseIds: updatedProfile.spouseIds || [], divorcedSpouseIds: updatedProfile.divorcedSpouseIds || [], siblingIds: updatedProfile.siblingIds || [] });
      }
      if (currentRootId === memberToDeleteId && targetUserProfile) {
        setCurrentRootId(targetUserProfile.id);
        setNavigationHistory([]);
      } else {
        setNavigationHistory(prev => prev.filter(id => id !== memberToDeleteId));
      }
    } catch (error) {
      console.error("Failed to delete family member:", error);
      toast({ title: "Error", description: `Could not delete family member. Error: ${(error as Error).message}`, variant: "destructive" });
      fetchMembers();
    } finally {
        setIsDeleteDialogOpen(false);
        setMemberToDeleteId(null);
    }
  };

  const openDeleteConfirmDialog = (memberId: string) => {
    if (!isUserViewingOwnTree) return;
    setMemberToDeleteId(memberId);
    setIsDeleteDialogOpen(true);
  };

  const handleFormSave = async (savedMember: FamilyMember) => {
    await fetchMembers();
    if (targetUserProfile) {
      const updatedProfile = await getUserProfile(targetUserId);
       if (updatedProfile) setTargetUserProfile({...updatedProfile, childIds: updatedProfile.childIds || [], spouseIds: updatedProfile.spouseIds || [], divorcedSpouseIds: updatedProfile.divorcedSpouseIds || [], siblingIds: updatedProfile.siblingIds || [] });
    }
  };

  const handleSetCurrentRoot = (newRootId: string) => {
    if (newRootId !== currentRootId) {
      scrollPositionRef.current = window.scrollY;
      if (currentRootId) {
        setNavigationHistory(prev => [...prev, currentRootId]);
      }
    }
    setCurrentRootId(newRootId);
    if (activeTab !== "tree") {
      setActiveTab("tree");
    }
  };

  const handleGoBackInTreeNav = () => {
    if (navigationHistory.length > 0) {
      scrollPositionRef.current = window.scrollY;
      const previousRootId = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory(prev => prev.slice(0, -1));
      setCurrentRootId(previousRootId);
      if (activeTab !== "tree") {
        setActiveTab("tree");
      }
    }
  };

  const handleReturnToMainTree = () => {
    if (targetUserProfile) {
        scrollPositionRef.current = window.scrollY;
        setCurrentRootId(targetUserProfile.id);
        setNavigationHistory([]);
        if (activeTab !== "tree") {
          setActiveTab("tree");
        }
    }
  };

  useLayoutEffect(() => {
    window.scrollTo(0, scrollPositionRef.current);
  }, [currentRootId]); 

  const getCurrentRootPersonForDisplay = (): BasicPerson | null => {
    if (!currentRootId || !targetUserProfile) return targetUserProfile;
    if (currentRootId === targetUserProfile.id) return targetUserProfile;
    return familyMembers.find(fm => fm.id === currentRootId) || targetUserProfile;
  };

  const rootForDisplay = getCurrentRootPersonForDisplay();
  const isViewingCurrentRootTargetUser = targetUserProfile && currentRootId === targetUserProfile.id;
  const currentRootDisplayName = () => {
    if (!rootForDisplay || !targetUserProfile) return "Selected Member's";
    if (rootForDisplay.id === targetUserProfile.id) return isUserViewingOwnTree ? "Your" : `${targetUserProfile.name || 'User'}'s`;
    return rootForDisplay?.name ? `${rootForDisplay.name}'s` : "Selected Member's";
  };

  const memberToDeleteName = familyMembers.find(m => m.id === memberToDeleteId)?.name || 'this family member';

  if ((loading && familyMembers.length === 0) || loadingProfile || !targetUserProfile || !currentRootId) {
    return <div className="flex justify-center items-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start gap-4 py-6 border-b">
        <div className="text-center md:text-left">
            <h1 className="text-3xl sm:text-4xl font-headline font-bold text-primary flex items-center">
                <Users className="w-10 h-10 mr-3"/> {currentRootDisplayName()} Family Tree
            </h1>
            <p className="text-muted-foreground mt-1">
                {isViewingCurrentRootTargetUser ? `Viewing ${isUserViewingOwnTree ? "your" : (targetUserProfile.name || "the user") + "'s"} main tree.` : `Viewing the tree from ${currentRootDisplayName()} perspective.`}
                 {!isUserViewingOwnTree && <span className="font-semibold text-accent ml-1">(Read-only)</span>}
            </p>
            <div className="mt-2 space-x-2">
              {!isViewingCurrentRootTargetUser && (
                  <Button onClick={handleReturnToMainTree} variant="outline" size="sm">
                      <Home className="mr-2 h-4 w-4" /> Return to {targetUserProfile.name || 'User'}'s Main Tree
                  </Button>
              )}
              {navigationHistory.length > 0 && (
                <Button onClick={handleGoBackInTreeNav} variant="outline" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                </Button>
              )}
            </div>
        </div>
        {isUserViewingOwnTree && (
          <Button onClick={handleOpenAddForm} size="lg" disabled={!targetUserProfile} className="w-full md:w-auto">
            <UserPlus className="mr-2 h-5 w-5" /> Add Family Member
          </Button>
        )}
      </header>

      {isUserViewingOwnTree && <FamilyStatsSummary familyMembers={familyMembers} userProfile={targetUserProfile} /> }

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-1/2 lg:w-1/3 mx-auto">
          <TabsTrigger value="cards"><Users className="mr-2 h-4 w-4" />Member Cards</TabsTrigger>
          <TabsTrigger value="tree"><ListTree className="mr-2 h-4 w-4" />Tree View</TabsTrigger>
        </TabsList>
        <TabsContent value="cards">
           <UiCard className="mb-6 p-4 shadow-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="space-y-1">
                <Label htmlFor="searchName" className="flex items-center"><SearchIcon className="mr-2 h-4 w-4 text-primary"/>Search by Name</Label>
                <Input id="searchName" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Enter name..." />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sortBy" className="flex items-center"><SortAsc className="mr-2 h-4 w-4 text-primary"/>Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger id="sortBy"><SelectValue placeholder="Select sort order" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                    <SelectItem value="dob-asc">Date of Birth (Oldest First)</SelectItem>
                    <SelectItem value="dob-desc">Date of Birth (Youngest First)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Accordion type="single" collapsible className="w-full mt-4">
              <AccordionItem value="filters">
                <AccordionTrigger className="text-base font-medium hover:no-underline">
                  <FilterIcon className="mr-2 h-5 w-5 text-primary" /> Advanced Filters
                </AccordionTrigger>
                <AccordionContent className="pt-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 pt-4">
                    <div className="space-y-1">
                      <Label>Age Range (for living)</Label>
                      <div className="flex gap-2">
                        <Input value={filterAgeMin} onChange={(e) => setFilterAgeMin(e.target.value)} placeholder="Min Age" type="number" min="0" />
                        <Input value={filterAgeMax} onChange={(e) => setFilterAgeMax(e.target.value)} placeholder="Max Age" type="number" min="0" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="filterPlace">Place (Birth or Current)</Label>
                      <Input id="filterPlace" value={filterPlace} onChange={(e) => setFilterPlace(e.target.value)} placeholder="City or Country..." />
                    </div>
                     <div className="space-y-1">
                      <Label htmlFor="filterGender" className="flex items-center"><ShieldQuestion className="mr-2 h-4 w-4 text-primary" />Gender</Label>
                      <Select value={filterGender} onValueChange={setFilterGender}>
                        <SelectTrigger id="filterGender"><SelectValue placeholder="Any Gender" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any_gender">Any Gender</SelectItem>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="filterStatus" className="flex items-center"><Heart className="mr-2 h-4 w-4 text-primary" />Status</Label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger id="filterStatus"><SelectValue placeholder="Any Status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any_status">Any Status</SelectItem>
                          <SelectItem value="alive">Alive</SelectItem>
                          <SelectItem value="deceased">Deceased</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="filterCaste">Caste</Label>
                      <Input id="filterCaste" value={filterCaste} onChange={(e) => setFilterCaste(e.target.value)} placeholder="Caste..." />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="filterReligion">Religion</Label>
                      <Input id="filterReligion" value={filterReligion} onChange={(e) => setFilterReligion(e.target.value)} placeholder="Religion..." />
                    </div>
                    <div className="flex items-end justify-end md:col-span-2 lg:col-span-3">
                       <Button onClick={handleClearFilters} variant="outline" className="w-full sm:w-auto">Clear All Filters</Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </UiCard>
          {familyMembers.length === 0 && !loading && (
            <div className="text-center py-12 bg-card rounded-lg shadow-md mt-4">
              <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Family Tree is Empty</h2>
              <p className="text-muted-foreground mb-6">Start building this family tree by adding the first family member.</p>
              {isUserViewingOwnTree && (
                <Button onClick={handleOpenAddForm} disabled={!targetUserProfile}>
                    <UserPlus className="mr-2 h-4 w-4" /> Add First Member
                </Button>
              )}
            </div>
          )}
          {familyMembers.length > 0 && displayedMembers.length === 0 && !loading && (
             <div className="text-center py-12 bg-card rounded-lg shadow-md mt-4">
                <SearchIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-2xl font-semibold mb-2">No Members Match Criteria</h2>
                <p className="text-muted-foreground mb-6">Try adjusting your search or filter options, or clear all filters.</p>
                <Button onClick={handleClearFilters} variant="outline">Clear All Filters</Button>
            </div>
          )}
          {displayedMembers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
              {displayedMembers.map((member) => (
                <FamilyMemberCard
                  key={member.id}
                  member={member}
                  onEdit={handleEditMember}
                  onDelete={openDeleteConfirmDialog}
                  onAddRelativeTo={handleOpenAddRelativeToForm}
                  onViewTree={handleSetCurrentRoot}
                  isCurrentRoot={currentRootId === member.id}
                  isEditable={isUserViewingOwnTree}
                />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="tree">
          <div className="mt-4 p-4 bg-card rounded-lg shadow-md">
            {targetUserProfile && currentRootId ? (
              <ReactFlowProvider>
                <FamilyTreeVisualization
                  originalUserProfile={targetUserProfile}
                  allFamilyMembers={familyMembers}
                  currentRootId={currentRootId}
                  onAddRelativeTo={handleOpenAddRelativeToForm}
                  onSetCurrentRoot={handleSetCurrentRoot}
                />
              </ReactFlowProvider>
            ) : (
                 <div className="text-center py-12">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Loading profile to display the tree...</p>
                 </div>
            )}
             {targetUserProfile && familyMembers.length === 0 && !loading && (
                <div className="text-center py-12">
                    <ListTree className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h2 className="text-2xl font-semibold mb-2">Tree View Is Empty</h2>
                    {isUserViewingOwnTree && (
                        <>
                        <p className="text-muted-foreground">Add family members to see the tree visualization.</p>
                        <Button onClick={handleOpenAddForm} className="mt-4" disabled={!targetUserProfile}>
                            <UserPlus className="mr-2 h-4 w-4" /> Add First Member to See Tree
                        </Button>
                        </>
                    )}
                    {!isUserViewingOwnTree && (
                         <p className="text-muted-foreground">This user has not added any family members yet.</p>
                    )}
                </div>
             )}
          </div>
          <Accordion type="single" collapsible className="w-full mt-4">
            <AccordionItem value="legend">
              <AccordionTrigger className="text-base font-medium hover:no-underline bg-card p-3 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <Info className="w-5 h-5 mr-2 text-primary" /> Spouse & Child Color Legend
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-0 bg-card p-4 rounded-b-lg border border-t-0">
                <div className="p-3 mb-4 text-sm text-muted-foreground bg-accent/10 border-l-4 border-accent rounded-r-md">
                    <p>The display order of spouses is determined by the following priority: 1st by <strong>Anniversary Date</strong>, then by <strong>Date of Birth</strong> (older first). If dates are not available, the order is based on when they were added to the tree. A child's node color matches the color of their co-parent's spouse group.</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-2">
                  {Array.from({ length: 20 }).map((_, i) => (
                      <div key={i} className="flex items-center">
                          <div
                              className="w-4 h-4 rounded-sm border-2 mr-2"
                              style={{
                                  borderColor: `hsl(var(--kin-spouse-${i}-border-h), var(--kin-spouse-${i}-border-s), var(--kin-spouse-${i}-border-l))`,
                                  backgroundColor: `hsl(var(--kin-spouse-${i}-bg-h), var(--kin-spouse-${i}-bg-s), var(--kin-spouse-${i}-bg-l))`
                              }}
                          ></div>
                          <span className="text-muted-foreground">{getOrdinal(i + 1)} Spouse</span>
                      </div>
                  ))}
                  <div className="flex items-center">
                      <div
                          className="w-4 h-4 rounded-sm border-2 mr-2"
                          style={{
                              borderColor: `hsl(var(--kin-spouse-child-border))`,
                              backgroundColor: `hsl(var(--kin-spouse-child-bg))`
                          }}
                      ></div>
                      <span className="text-muted-foreground">{getOrdinal(21)}+ Spouse</span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>
      </Tabs>

      {targetUserProfile && isUserViewingOwnTree && (
        <FamilyMemberForm
            isOpen={isFormOpen}
            onOpenChange={setIsFormOpen}
            onSave={handleFormSave}
            memberToEdit={memberToEdit}
            anchorMember={currentAnchorMember}
            currentFamilyMembers={familyMembers}
            userProfile={targetUserProfile}
        />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete {memberToDeleteName}?</AlertDialogTitle>
            <AlertDialogDescription>
               This action cannot be undone. This will permanently delete them from the tree and update all related links.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMemberToDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMember}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
