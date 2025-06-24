
'use client';

import type { ChangeEvent, FormEvent } from 'react';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Profile, FamilyMember, BadgeDetails as UserBadgeDetails, Konnection } from '@/types';
import { useAuth } from '@/providers/AuthProvider';
import {
  updateUserProfile,
  getUserProfile,
  getFamilyMembers,
  getKonnections,
  removeKonnection,
} from '@/lib/firebase/firestore';
import { signOut } from '@/lib/firebase/auth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Award, TrendingUp, Info, Users, UserX, Link2 as KonnectIconLucide, Lock, Unlock, Eye, Search, AlertTriangle, LogOut, ChevronsUpDown, Check } from 'lucide-react';
import { calculateAge } from '@/lib/utils';
import { getBadgeForMemberCount, getNextBadgeDetails, NO_BADGE, BADGE_LEVELS } from '@/lib/badgeUtils';
import { Progress } from '@/components/ui/progress';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useRouter } from 'next/navigation';
import { religions } from '@/lib/data/demographics';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';


interface ProfileFormProps {
  onProfileUpdate?: (profile: Profile) => void;
}

export default function ProfileForm({ onProfileUpdate }: ProfileFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [profile, setProfile] = useState<Partial<Profile>>({
    email: user?.email || '',
    gender: 'Other',
    fatherId: null,
    motherId: null,
    spouseIds: [],
    divorcedSpouseIds: [],
    childIds: [],
    siblingIds: [],
    isAlternateProfile: false,
    siblingOrderIndex: undefined,
    aliasName: '',
    isPublic: true,
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [age, setAge] = useState<number | null>(null);

  const [allFamilyMembers, setAllFamilyMembers] = useState<FamilyMember[]>([]);
  const [familyMemberCount, setFamilyMemberCount] = useState(0);
  const [currentBadge, setCurrentBadge] = useState<UserBadgeDetails>(NO_BADGE);
  const [nextBadgeInfo, setNextBadgeInfo] = useState<{ nextBadge: UserBadgeDetails; membersNeeded: number; progressPercentage: number } | null>(null);

  const [konnections, setKonnections] = useState<Konnection[]>([]);
  const [loadingKonnections, setLoadingKonnections] = useState(false);
  const [userToUnkonnect, setUserToUnkonnect] = useState<Konnection | null>(null);
  const [isUnkonnectDialogOpen, setIsUnkonnectDialogOpen] = useState(false);
  const [konnectionSearchTerm, setKonnectionSearchTerm] = useState('');

  const [isReligionComboboxOpen, setIsReligionComboboxOpen] = useState(false);

  const sortedBadgeLevelsForDisplay = React.useMemo(() => {
    return [...BADGE_LEVELS].sort((a, b) => a.membersRequired - b.membersRequired);
  }, []);

  const fetchInitialData = useCallback(async () => {
    if (user) {
      setInitialLoading(true);
      try {
        const userProfileData = await getUserProfile(user.uid);
        if (userProfileData) {
          setProfile({
            ...userProfileData,
            aliasName: userProfileData.aliasName || '',
            spouseIds: userProfileData.spouseIds || [],
            divorcedSpouseIds: userProfileData.divorcedSpouseIds || [],
            childIds: userProfileData.childIds || [],
            siblingIds: userProfileData.siblingIds || [],
            siblingOrderIndex: userProfileData.siblingOrderIndex === undefined ? undefined : Number(userProfileData.siblingOrderIndex),
            isPublic: userProfileData.isPublic === undefined ? true : userProfileData.isPublic,
          });
          if (userProfileData.dob && userProfileData.dob !== "N/A") {
            setAge(calculateAge(userProfileData.dob));
          } else {
            setAge(null);
          }
        } else {
          const newProfile: Profile = {
            id: user.uid,
            userId: user.uid,
            email: user.email || '',
            name: user.displayName || user.email || 'New User',
            aliasName: '',
            gender: 'Other',
            fatherId: null, motherId: null,
            spouseIds: [], divorcedSpouseIds: [], childIds: [], siblingIds: [],
            siblingOrderIndex: undefined,
            isDeceased: false,
            isAlternateProfile: false,
            isPublic: true,
          };
          await updateUserProfile(user.uid, newProfile);
          setProfile(newProfile);
          setAge(null);
        }

        const familyMembersData = await getFamilyMembers(user.uid);
        setAllFamilyMembers(familyMembersData);
        const activeMembersCount = familyMembersData.filter(fm => !fm.isAlternateProfile).length;
        setFamilyMemberCount(activeMembersCount);
        setCurrentBadge(getBadgeForMemberCount(activeMembersCount));
        setNextBadgeInfo(getNextBadgeDetails(activeMembersCount));

        setLoadingKonnections(true);
        const fetchedKonnections = await getKonnections(user.uid);
        setKonnections(fetchedKonnections.sort((a,b) => b.konnectedAt.seconds - a.konnectedAt.seconds));

      } catch (error: any) {
         console.error("Error fetching initial profile/family data:", error);
         toast({ title: 'Error fetching data', description: `Could not load profile information. ${error.message}`, variant: 'destructive' });
      } finally {
        setInitialLoading(false);
        setLoadingKonnections(false);
      }
    } else {
        setInitialLoading(false);
        setLoadingKonnections(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const filteredKonnections = useMemo(() => {
    if (!konnectionSearchTerm.trim()) {
      return konnections;
    }
    return konnections.filter(kon =>
      kon.name?.toLowerCase().includes(konnectionSearchTerm.toLowerCase())
    );
  }, [konnections, konnectionSearchTerm]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let finalValue: string | number | undefined = value;
    if (name === "siblingOrderIndex") {
        finalValue = value === '' ? undefined : Number(value);
    }

    setProfile((prev) => ({ ...prev, [name]: finalValue }));

    if (name === 'dob') {
      if (value && value !== "N/A") {
        setAge(calculateAge(value));
      } else {
        setAge(null);
      }
    }
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenderChange = (value: string) => {
    setProfile((prev) => ({ ...prev, gender: value as 'Male' | 'Female' | 'Other' }));
  };

  const handlePrivacyToggle = async (checked: boolean) => {
    if (!user || !profile.id) return;
    setLoading(true);
    const newIsPublicState = checked;
    try {
      await updateUserProfile(user.uid, { isPublic: newIsPublicState });
      setProfile(prev => ({ ...prev, isPublic: newIsPublicState }));
      toast({
        title: 'Privacy Mode Updated',
        description: newIsPublicState
          ? "You’re now in Public Mode. You can Discover others and receive Konnection requests."
          : "You’ve switched to Private Mode. You can no longer Discover others or receive Konnection requests.",
      });
      if (onProfileUpdate) {
        const updatedFullProfile = await getUserProfile(user.uid);
        if (updatedFullProfile) onProfileUpdate(updatedFullProfile);
      }
    } catch (error: any) {
      toast({ title: 'Error updating privacy', description: error.message, variant: 'destructive' });
      setProfile(prev => ({ ...prev, isPublic: !newIsPublicState }));
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (typeof window !== 'undefined') {
        sessionStorage.removeItem('discoveryScanInitiated');
        sessionStorage.removeItem('discoveryMatchedTrees');
    }
    await signOut();
    toast({ title: "Signed Out", description: "You have been successfully signed out." });
    router.push('/login');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !profile.id) {
      toast({ title: 'Error', description: 'User or profile ID missing.', variant: 'destructive' });
      return;
    }
    if (!profile.gender) {
      toast({ title: 'Error', description: 'Please select a gender.', variant: 'destructive' });
      return;
    }

    const nativePlace = profile.nativePlace?.trim() || '';
    if (nativePlace && !nativePlace.includes(',')) {
      toast({
        title: 'Invalid Format for Native Place',
        description: 'Please use "City, Country" format (e.g., "New York, USA").',
        variant: 'destructive',
      });
      return;
    }

    const currentPlace = profile.currentPlace?.trim() || '';
    if (currentPlace && !currentPlace.includes(',')) {
      toast({
        title: 'Invalid Format for Current Location',
        description: 'Please use "City, Country" format (e.g., "London, UK").',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    try {
      const profileDataToUpdate: Partial<Omit<Profile, 'id' | 'email' | 'userId'>> = {
        ...profile,
        name: profile.name || user.displayName || user.email!,
        aliasName: profile.aliasName || null,
        spouseIds: profile.spouseIds || [],
        divorcedSpouseIds: profile.divorcedSpouseIds || [],
        childIds: profile.childIds || [],
        siblingIds: profile.siblingIds || [],
        siblingOrderIndex: profile.siblingOrderIndex === undefined ? undefined : Number(profile.siblingOrderIndex),
        isPublic: profile.isPublic === undefined ? true : profile.isPublic,
      };

      const { id, userId, email, isAdmin, ...cleanedProfileData } = profileDataToUpdate;

      await updateUserProfile(user.uid, cleanedProfileData);

      if (onProfileUpdate) {
        const updatedFullProfile = await getUserProfile(user.uid);
        if (updatedFullProfile) onProfileUpdate(updatedFullProfile);
      }

      toast({ title: 'Profile Updated', description: 'Your profile details have been saved.' });
    } catch (error: any)
{
      toast({ title: 'Update Failed', description: error.message || 'Could not update profile.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const promptUnkonnect = (konnection: Konnection) => {
    setUserToUnkonnect(konnection);
    setIsUnkonnectDialogOpen(true);
  };

  const handleUnkonnect = async () => {
    if (!user || !userToUnkonnect) return;
    setLoading(true);
    try {
      await removeKonnection(user.uid, userToUnkonnect.konnectedUserId);
      toast({ title: "Unkonnected", description: `You are no longer konnected with ${userToUnkonnect.name}.` });
      setKonnections(prev => prev.filter(k => k.id !== userToUnkonnect.id));
    } catch (error: any) {
      toast({ title: "Error", description: `Failed to unkonnect. ${error.message}`, variant: "destructive" });
    } finally {
      setLoading(false);
      setIsUnkonnectDialogOpen(false);
      setUserToUnkonnect(null);
    }
  };

  const handleViewTree = (konnectedUserId: string) => {
    router.push(`/full-tree/${konnectedUserId}`);
  };


  if (initialLoading || !profile || !profile.id) {
    return <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <>
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-3xl font-headline">Your KinKonnect Hub</CardTitle>
                <CardDescription>Manage your personal details, badge progress, privacy, and konnections.</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
                <ThemeToggle />
                <Button variant="outline" size="icon" onClick={handleSignOut} title="Sign Out">
                    <LogOut className="h-5 w-5" />
                    <span className="sr-only">Sign Out</span>
                </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 mb-6">
            <TabsTrigger value="profile">My Profile &amp; Privacy</TabsTrigger>
            <TabsTrigger value="konnections">My Konnections ({filteredKonnections.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="profile">
            <section className="mb-8 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-semibold text-primary flex items-center">
                  <Award className="mr-2 h-6 w-6" /> Your KinKonnect Badge
                </h3>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Badge information">
                      <Info className="h-5 w-5 text-muted-foreground hover:text-primary" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none text-primary">KinKonnect Badge Levels</h4>
                      <p className="text-sm text-muted-foreground">
                        Earn badges by adding family members to your tree!
                      </p>
                      <ul className="space-y-1.5 text-sm mt-2">
                        {sortedBadgeLevelsForDisplay.map((badge) => (
                          <li key={badge.name} className="flex items-center">
                            <span className={`mr-2 text-lg ${badge.textColor}`}>{badge.icon}</span>
                            <span className="font-medium mr-1">{badge.name}:</span>
                            <span className="text-muted-foreground text-xs">({badge.membersRequired}+ members)</span>
                          </li>
                        ))}
                        <li className="flex items-center">
                            <span className={`mr-2 text-lg ${NO_BADGE.textColor}`}>{NO_BADGE.icon}</span>
                            <span className="font-medium mr-1">{NO_BADGE.name}:</span>
                            <span className="text-muted-foreground text-xs">({NO_BADGE.description})</span>
                        </li>
                      </ul>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {currentBadge.name !== 'None' ? (
                <div className="flex items-center space-x-3">
                  <span className={`text-3xl px-2 py-1 rounded-md ${currentBadge.colorClasses}`}>{currentBadge.icon}</span>
                  <div>
                    <p className={`text-lg font-medium ${currentBadge.textColor || 'text-foreground'}`}>{currentBadge.name} Badge</p>
                    <p className="text-sm text-muted-foreground">Earned for adding {currentBadge.membersRequired}+ members.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <span className={`text-3xl px-2 py-1 rounded-md ${NO_BADGE.colorClasses}`}>{NO_BADGE.icon}</span>
                  <div>
                    <p className={`text-lg font-medium ${NO_BADGE.textColor || 'text-foreground'}`}>{NO_BADGE.description}</p>
                    <p className="text-sm text-muted-foreground">Start adding family members to earn your first badge!</p>
                  </div>
                </div>
              )}

              {nextBadgeInfo && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Progress to {nextBadgeInfo.nextBadge.name} Badge ({nextBadgeInfo.nextBadge.icon})</span>
                    <span className="font-medium">{familyMemberCount} / {nextBadgeInfo.nextBadge.membersRequired} members</span>
                  </div>
                  <Progress value={nextBadgeInfo.progressPercentage} className="w-full h-2.5" />
                  <p className="text-xs text-primary mt-1 text-right">
                    {nextBadgeInfo.membersNeeded} more member(s) to go!
                  </p>
                </div>
              )}
              {currentBadge.name === 'Platinum' && !nextBadgeInfo && (
                <p className="text-md font-medium text-accent mt-3 flex items-center"><TrendingUp className="mr-2 h-5 w-5"/> You've achieved the highest rank! Truly a KinKonnect Platinum Historian! 🎉</p>
              )}
            </section>

            <form onSubmit={handleSubmit} className="space-y-8">
              <section className="space-y-6 border-b pb-6">
                 <h3 className="text-xl font-semibold text-primary">Profile Privacy</h3>
                 <div className="flex items-center space-x-3 p-4 border rounded-lg bg-background">
                    <Switch
                        id="profile-privacy"
                        checked={!!profile.isPublic}
                        onCheckedChange={handlePrivacyToggle}
                        disabled={loading}
                        aria-label="Profile Privacy Toggle"
                    />
                    <div className="flex-1">
                    <Label htmlFor="profile-privacy" className="text-base font-medium flex items-center">
                        {profile.isPublic ? <Unlock className="w-4 h-4 mr-2 text-green-600" /> : <Lock className="w-4 h-4 mr-2 text-red-600" />}
                        Profile is currently {profile.isPublic ? 'Public' : 'Private'}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                        {profile.isPublic
                        ? 'Your tree is discoverable, and you can send/receive Konnection requests.'
                        : "Your tree is hidden. You can't use Discover or send/receive Konnection requests."}
                    </p>
                    </div>
                </div>
              </section>

              <section className="space-y-6 border-b pb-6">
                <h3 className="text-xl font-semibold text-primary">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" name="name" value={profile.name || ''} onChange={handleChange} placeholder="Your full name (e.g. Arjun Narayanan R)" />
                    <p className="text-xs text-muted-foreground mt-1 flex items-center">
                      <AlertTriangle className="w-3 h-3 mr-1 text-orange-500 flex-shrink-0" />
                      Only the first name (e.g. “Arjun” from “Arjun Narayanan R”) will be used for Discover Search. Please type your full name as shown in the example.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aliasName">Alias Name (Optional)</Label>
                    <Input id="aliasName" name="aliasName" value={profile.aliasName || ''} onChange={handleChange} placeholder="Nickname, pet name, etc." />
                  </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="email">Email (cannot be changed)</Label>
                    <Input id="email" name="email" type="email" value={profile.email || ''} readOnly disabled />
                  </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input id="dob" name="dob" type="date" value={profile.dob === "N/A" ? "" : profile.dob || ''} onChange={handleChange} />
                  </div>
                  {age !== null && !profile.isDeceased && (
                    <div className="space-y-2">
                      <Label>Age</Label>
                      <Input value={`${age} years old`} readOnly disabled />
                    </div>
                  )}
                  {profile.isDeceased && (
                      <div className="space-y-2">
                          <Label>Status</Label>
                          <Input value="Deceased" readOnly disabled />
                      </div>
                  )}
                </div>

                {(!profile.dob || profile.dob === "N/A") && (
                    <div className="space-y-2">
                        <Label htmlFor="siblingOrderIndex">Your Sibling Order (if DOB unknown, smaller # is older)</Label>
                        <Input
                            id="siblingOrderIndex"
                            name="siblingOrderIndex"
                            type="number"
                            min="0"
                            value={profile.siblingOrderIndex === undefined ? '' : profile.siblingOrderIndex.toString()}
                            onChange={handleChange}
                            placeholder="e.g., 1 for eldest"
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender <span className="text-destructive">*</span></Label>
                    <Select value={profile.gender || 'Other'} onValueChange={handleGenderChange} required>
                      <SelectTrigger id="gender"><SelectValue placeholder="Select gender" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input id="phoneNumber" name="phoneNumber" type="tel" value={profile.phoneNumber || ''} onChange={handleChange} placeholder="+1 (555) 123-4567" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="nativePlace">Native Place</Label>
                    <Input id="nativePlace" name="nativePlace" value={profile.nativePlace || ''} onChange={handleChange} placeholder="City, Country" />
                     <p className="text-xs text-primary mt-1">👉 Native Place is compulsory for discovering your kins!</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentPlace">Current Location</Label>
                    <Input id="currentPlace" name="currentPlace" value={profile.currentPlace || ''} onChange={handleChange} placeholder="City, Country" />
                    <p className="text-xs text-primary mt-1">👉 Current Place is useful for discovering your kins!</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="religion">Religion</Label>
                        <Popover open={isReligionComboboxOpen} onOpenChange={setIsReligionComboboxOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={isReligionComboboxOpen} className="w-full justify-between">
                              {profile.religion ? religions.find((r) => r.toLowerCase() === profile.religion?.toLowerCase()) || profile.religion : "Select religion..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                              <CommandInput placeholder="Search religion..." />
                              <CommandEmpty>No religion found.</CommandEmpty>
                              <CommandGroup>
                                <ScrollArea className="h-48">
                                  {religions.map((r) => (
                                    <CommandItem
                                      key={r}
                                      value={r}
                                      onSelect={(currentValue) => {
                                        handleSelectChange('religion', currentValue === profile.religion ? '' : currentValue);
                                        setIsReligionComboboxOpen(false);
                                      }}
                                    >
                                      <Check className={cn("mr-2 h-4 w-4", profile.religion?.toLowerCase() === r.toLowerCase() ? "opacity-100" : "opacity-0")} />
                                      {r}
                                    </CommandItem>
                                  ))}
                                </ScrollArea>
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <p className="text-xs text-primary mt-1">👉 Religion is useful for discovering your kins!</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="caste">Caste</Label>
                        <Input id="caste" name="caste" value={profile.caste || ''} onChange={handleChange} placeholder="Your caste name" />
                        <p className="text-xs text-muted-foreground mt-1 flex items-start">
                            <Info className="w-4 h-4 mr-1.5 mt-0.5 text-primary flex-shrink-0" />
                            <span>Please type your caste name correctly. This will be used for discovering relatives. You can check Google to ensure the correct spelling.</span>
                        </p>
                    </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Short Description</Label>
                  <Textarea id="description" name="description" value={profile.description || ''} onChange={handleChange} placeholder="Tell us a bit about yourself." />
                </div>
              </section>

              <Button type="submit" className="w-full text-lg py-3" disabled={loading || initialLoading}>
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Save Profile Details'}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="konnections">
            <h3 className="text-xl font-semibold text-primary mb-4 flex items-center">
                <KonnectIconLucide className="mr-2 h-6 w-6"/> Accepted Konnections
            </h3>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search konnections by name..."
                  value={konnectionSearchTerm}
                  onChange={(e) => setKonnectionSearchTerm(e.target.value)}
                  className="pl-9 w-full md:w-2/3"
                />
              </div>
            </div>
            {loadingKonnections && <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>}
            {!loadingKonnections && filteredKonnections.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  {konnectionSearchTerm ? 'No konnections match your search.' : 'You have no konnections yet. Send some requests from the Discover page!'}
                </p>
            )}
            {!loadingKonnections && filteredKonnections.length > 0 && (
                <div className="space-y-3">
                    {filteredKonnections.map(konnection => (
                        <Card key={konnection.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 shadow-sm gap-2">
                            <div className="flex items-center">
                                <Users className="h-8 w-8 text-accent mr-3" />
                                <div>
                                    <p className="font-medium">{konnection.name}</p>
                                    <p className="text-xs text-muted-foreground">Konnected on: {new Date(konnection.konnectedAt.toDate()).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="flex space-x-2 self-end sm:self-center">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewTree(konnection.konnectedUserId)}
                                    disabled={loading}
                                >
                                    <Eye className="mr-1.5 h-4 w-4" /> View Tree
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => { setUserToUnkonnect(konnection); setIsUnkonnectDialogOpen(true); }}
                                    disabled={loading}
                                >
                                    <UserX className="mr-1.5 h-4 w-4" /> Unkonnect
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>

    {userToUnkonnect && (
        <AlertDialog open={isUnkonnectDialogOpen} onOpenChange={setIsUnkonnectDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Unkonnect</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove {userToUnkonnect.name} from your konnections? This action will remove the konnection for both of you.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setUserToUnkonnect(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleUnkonnect} disabled={loading} className="bg-destructive hover:bg-destructive/90">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
                Yes, Unkonnect
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
