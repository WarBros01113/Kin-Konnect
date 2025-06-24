
'use client';

import type { ChangeEvent, FormEvent } from 'react';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { FamilyMember, Profile, BasicPerson, FamilyMemberFormData } from '@/types';
import { useAuth } from '@/providers/AuthProvider';
import { addFamilyMember, updateFamilyMember, getFamilyMembers, getPersonById } from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldAlert, UserPlus, Info, HeartCrack, CalendarDays, Gift, Users, Award, AlertTriangle, ChevronsUpDown, Check } from 'lucide-react';
import { getBadgeForMemberCount, NO_BADGE } from '@/lib/badgeUtils';
import { religions } from '@/lib/data/demographics';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, getOrdinal } from '@/lib/utils';


interface FamilyMemberFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (savedMember: FamilyMember) => void;
  memberToEdit?: FamilyMember | null;
  anchorMember?: BasicPerson | null;
  currentFamilyMembers: FamilyMember[];
  userProfile: Profile | null;
  initialGender?: 'Male' | 'Female';
  initialRelationshipToAnchor?: string;
}

const initialFormStateBase: FamilyMemberFormData = {
  name: '',
  aliasName: '',
  dob: '',
  gender: 'Other',
  isDeceased: false,
  deceasedDate: '',
  anniversaryDate: '',
  siblingOrderIndex: undefined,
  nativePlace: '',
  currentPlace: '',
  religion: '',
  caste: '',
  stories: '',
};

const anchorRelativeRelationshipOptions = [
  'Father', 'Mother', 'Brother', 'Sister', 'Spouse', 'Son', 'Daughter'
];

export default function FamilyMemberForm({
  isOpen,
  onOpenChange,
  onSave,
  memberToEdit,
  anchorMember: propAnchorMember,
  currentFamilyMembers: propCurrentFamilyMembers,
  userProfile,
  initialGender,
  initialRelationshipToAnchor,
}: FamilyMemberFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState<FamilyMemberFormData>(initialFormStateBase);
  const [relationshipToAnchor, setRelationshipToAnchor] = useState('');
  const [isDobNA, setIsDobNA] = useState(false);
  const [isDeceased, setIsDeceased] = useState(false);
  const [isDeceasedDateNA, setIsDeceasedDateNA] = useState(false);
  const [isAnniversaryDateNA, setIsAnniversaryDateNA] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [currentAnchorMember, setCurrentAnchorMember] = useState<BasicPerson | null>(null);
  const isInitialAddModeLoadRef = useRef(true);

  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [potentialDuplicateInfo, setPotentialDuplicateInfo] = useState<{ name: string; dob: string; nativePlace?: string | null; existingMemberName: string } | null>(null);
  const [confirmedNotDuplicate, setConfirmedNotDuplicate] = useState(false);

  const [selectedCoParentId, setSelectedCoParentId] = useState<string | null>(null);
  const [localFamilyMembers, setLocalFamilyMembers] = useState<FamilyMember[]>(propCurrentFamilyMembers);
  
  const [divorceSelections, setDivorceSelections] = useState<Record<string, boolean>>({});
  
  const [isReligionComboboxOpen, setIsReligionComboboxOpen] = useState(false);


  const resetFormState = useCallback(() => {
    setFormData({
        ...initialFormStateBase,
        aliasName: '',
        gender: initialGender || 'Other',
        siblingOrderIndex: undefined,
        deceasedDate: '',
        anniversaryDate: '',
    });
    setRelationshipToAnchor(initialRelationshipToAnchor || '');
    setIsDobNA(false);
    setIsDeceased(false);
    setIsDeceasedDateNA(false);
    setIsAnniversaryDateNA(false);
    setConfirmedNotDuplicate(false);
    setPotentialDuplicateInfo(null);
    setSelectedCoParentId(null);
    setDivorceSelections({});
  }, [initialGender, initialRelationshipToAnchor]);

  const resetFormAndClose = useCallback(() => {
    resetFormState();
    setCurrentAnchorMember(null);
    onOpenChange(false);
  }, [onOpenChange, resetFormState]);

  useEffect(() => {
    if (isOpen) {
      setLocalFamilyMembers(propCurrentFamilyMembers);
      if (memberToEdit) {
        isInitialAddModeLoadRef.current = true;
        setCurrentAnchorMember(null);
        setRelationshipToAnchor('');
        setSelectedCoParentId(null);
        setFormData({
          name: memberToEdit.name || '',
          aliasName: memberToEdit.aliasName || '',
          dob: memberToEdit.dob === "N/A" ? "" : memberToEdit.dob || '',
          gender: memberToEdit.gender || initialGender || 'Other',
          isDeceased: memberToEdit.isDeceased ?? false,
          deceasedDate: memberToEdit.deceasedDate === "N/A" ? "" : memberToEdit.deceasedDate || '',
          anniversaryDate: memberToEdit.anniversaryDate === "N/A" ? "" : memberToEdit.anniversaryDate || '',
          siblingOrderIndex: memberToEdit.siblingOrderIndex === undefined ? undefined : Number(memberToEdit.siblingOrderIndex),
          nativePlace: memberToEdit.nativePlace || '',
          currentPlace: memberToEdit.currentPlace || '',
          religion: memberToEdit.religion || '',
          caste: memberToEdit.caste || '',
          stories: memberToEdit.stories || '',
        });
        setIsDobNA(memberToEdit.dob === "N/A");
        setIsDeceased(!!memberToEdit.isDeceased);
        setIsDeceasedDateNA(memberToEdit.deceasedDate === "N/A");
        setIsAnniversaryDateNA(memberToEdit.anniversaryDate === "N/A");

        // Initialize divorce selections
        const everSpouseIds = new Set([
            ...(memberToEdit.spouseIds || []),
            ...(memberToEdit.divorcedSpouseIds || [])
        ]);
        const initialSelections: Record<string, boolean> = {};
        everSpouseIds.forEach(spouseId => {
            initialSelections[spouseId] = (memberToEdit.divorcedSpouseIds || []).includes(spouseId);
        });
        setDivorceSelections(initialSelections);

      } else {
        const defaultAnchor = propAnchorMember || userProfile;
        setCurrentAnchorMember(defaultAnchor);
        if (initialRelationshipToAnchor) {
          setRelationshipToAnchor(initialRelationshipToAnchor);
        }
        setSelectedCoParentId(null);
        setDivorceSelections({});

        if (isInitialAddModeLoadRef.current) {
          resetFormState();
          if (initialGender) setFormData(prev => ({ ...prev, gender: initialGender }));
          isInitialAddModeLoadRef.current = false;
        }
      }
    } else {
      resetFormState();
      setCurrentAnchorMember(null);
      isInitialAddModeLoadRef.current = true;
    }
  }, [isOpen, memberToEdit, propAnchorMember, userProfile, initialGender, initialRelationshipToAnchor, resetFormState, propCurrentFamilyMembers]);


  useEffect(() => {
    if (isOpen && !memberToEdit && relationshipToAnchor) {
      let newGender: FamilyMemberFormData['gender'] = formData.gender;

      if (['Father', 'Son', 'Brother'].includes(relationshipToAnchor)) newGender = 'Male';
      else if (['Mother', 'Daughter', 'Sister'].includes(relationshipToAnchor)) newGender = 'Female';
      else if (relationshipToAnchor === 'Spouse') {
        if (currentAnchorMember) {
          if (currentAnchorMember.gender === 'Male') newGender = 'Female';
          else if (currentAnchorMember.gender === 'Female') newGender = 'Male';
        }
      }

      setFormData(prev => ({
        ...prev,
        gender: newGender,
      }));

    }
  }, [isOpen, memberToEdit, currentAnchorMember, relationshipToAnchor, formData.gender]);


  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let finalValue: string | number | undefined = value;
    if (name === "siblingOrderIndex") {
        finalValue = value === '' ? undefined : Number(value);
    }
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
  };

   const handleSelectChange = (name: string, value: string) => {
     setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRelationshipSelectChange = (value: string) => {
    setRelationshipToAnchor(value);
    if (value !== "Son" && value !== "Daughter") {
        setSelectedCoParentId(null);
    }
  };

  const handleDobNACheck = (checked: boolean | 'indeterminate') => {
    const isChecked = !!checked;
    setIsDobNA(isChecked);
    if (isChecked) {
      setFormData(prev => ({ ...prev, dob: "N/A" }));
    } else {
      setFormData(prev => ({ ...prev, dob: prev.dob === "N/A" ? "" : prev.dob }));
    }
  };

  const handleDeceasedCheck = (checked: boolean | 'indeterminate') => {
    const isChecked = !!checked;
    setIsDeceased(isChecked);
    if (isChecked) {
      setFormData(prev => ({ ...prev, currentPlace: '' })); // Clear current place
    }
    if (!checked) { 
      setFormData(prev => ({ ...prev, deceasedDate: "" }));
      setIsDeceasedDateNA(false);
    }
  };
  
  const handleDeceasedDateNACheck = (checked: boolean | 'indeterminate') => {
    const isChecked = !!checked;
    setIsDeceasedDateNA(isChecked);
    if (isChecked) {
      setFormData(prev => ({ ...prev, deceasedDate: "N/A" }));
    } else {
      setFormData(prev => ({ ...prev, deceasedDate: prev.deceasedDate === "N/A" ? "" : prev.deceasedDate }));
    }
  };
  
  const handleAnniversaryDateNACheck = (checked: boolean | 'indeterminate') => {
    const isChecked = !!checked;
    setIsAnniversaryDateNA(isChecked);
    if (isChecked) {
      setFormData(prev => ({ ...prev, anniversaryDate: "N/A" }));
    } else {
      setFormData(prev => ({ ...prev, anniversaryDate: prev.anniversaryDate === "N/A" ? "" : prev.anniversaryDate }));
    }
  };

  const handleDivorceSelectionChange = (spouseId: string, isDivorced: boolean) => {
    setDivorceSelections(prev => ({ ...prev, [spouseId]: isDivorced }));
  };

  const proceedWithSubmit = async () => {
    if (!user || !userProfile) {
      toast({ title: 'Error', description: 'User profile not available.', variant: 'destructive' });
      setLoading(false); return;
    }

    const nativePlace = formData.nativePlace?.trim() || '';
    if (nativePlace && !nativePlace.includes(',')) {
      toast({
        title: 'Invalid Format for Native Place',
        description: 'Please use "City, Country" format (e.g., "New York, USA").',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const currentPlace = formData.currentPlace?.trim() || '';
    if (currentPlace && !currentPlace.includes(',')) {
      toast({
        title: 'Invalid Format for Current Place',
        description: 'Please use "City, Country" format (e.g., "London, UK").',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const effectiveAnchorMember = currentAnchorMember || userProfile;
    if (!memberToEdit && !effectiveAnchorMember) {
      toast({ title: 'Error', description: 'Anchor person not selected.', variant: 'destructive' });
      setLoading(false); return;
    }
    if (!memberToEdit && effectiveAnchorMember && !relationshipToAnchor) {
      toast({ title: 'Error', description: 'Please select a relationship.', variant: 'destructive' });
      setLoading(false); return;
    }
    if (!isDobNA && !formData.dob && (!memberToEdit || (memberToEdit && memberToEdit.dob !== "N/A"))) {
      toast({ title: 'Error', description: 'Please enter a Date of Birth or select N/A.', variant: 'destructive' });
      setLoading(false); return;
    }
    if (!formData.gender) {
      toast({ title: 'Error', description: 'Please select a gender.', variant: 'destructive' });
      setLoading(false); return;
    }
    if ((relationshipToAnchor === "Son" || relationshipToAnchor === "Daughter") &&
        effectiveAnchorMember && effectiveAnchorMember.spouseIds && effectiveAnchorMember.spouseIds.length > 1 && !selectedCoParentId) {
        toast({ title: 'Error', description: 'Please select the other parent for this child.', variant: 'destructive' });
        setLoading(false); return;
    }
     if (isDeceased && !isDeceasedDateNA && !formData.deceasedDate) {
      toast({ title: 'Error', description: 'Please enter a Deceased Date or select N/A for it.', variant: 'destructive' });
      setLoading(false); return;
    }
    if (!memberToEdit && relationshipToAnchor === 'Spouse' && !isAnniversaryDateNA && !formData.anniversaryDate) {
      toast({ title: 'Error', description: 'Anniversary Date is required when adding a spouse. Please enter a date or select N/A.', variant: 'destructive' });
      setLoading(false); return;
    }

    setLoading(true);

    const finalDob = isDobNA ? "N/A" : formData.dob;
    const finalDeceasedDate = isDeceased ? (isDeceasedDateNA ? "N/A" : formData.deceasedDate) : undefined;
    const finalAnniversaryDate = formData.anniversaryDate ? (isAnniversaryDateNA ? "N/A" : formData.anniversaryDate) : undefined;

    const finalFormData: FamilyMemberFormData = {
        ...formData,
        aliasName: formData.aliasName || null,
        dob: finalDob,
        isDeceased: isDeceased,
        deceasedDate: finalDeceasedDate,
        anniversaryDate: finalAnniversaryDate,
        siblingOrderIndex: formData.siblingOrderIndex === undefined ? undefined : Number(formData.siblingOrderIndex),
    };

    if (memberToEdit) {
      const updatePayload: Partial<Omit<FamilyMember, 'id' | 'userId'>> = {
        name: finalFormData.name,
        aliasName: finalFormData.aliasName,
        dob: finalFormData.dob,
        isDeceased: finalFormData.isDeceased,
        deceasedDate: finalFormData.deceasedDate,
        anniversaryDate: finalFormData.anniversaryDate,
        gender: finalFormData.gender,
        siblingOrderIndex: finalFormData.siblingOrderIndex,
        nativePlace: finalFormData.nativePlace || null,
        currentPlace: finalFormData.currentPlace || null,
        religion: finalFormData.religion || null,
        caste: finalFormData.caste || null,
        stories: finalFormData.stories || null,
      };
      try {
        await updateFamilyMember(user.uid, memberToEdit.id, updatePayload, divorceSelections);
        const savedMemberResult: FamilyMember = { ...memberToEdit, ...updatePayload } as FamilyMember;
        toast({ title: 'Member Updated', description: `${finalFormData.name} has been updated.` });
        onSave(savedMemberResult);
        resetFormAndClose();
      } catch (error: any) {
        console.error("Error updating family member:", error);
        toast({ title: 'Save Failed', description: error.message || 'Could not update member.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    } else {
        if (!effectiveAnchorMember || !relationshipToAnchor) {
            toast({ title: 'Error', description: 'Anchor or relationship missing.', variant: 'destructive' });
            setLoading(false); return;
        }
        try {
            const oldMemberCount = propCurrentFamilyMembers.filter(fm => !fm.isAlternateProfile).length;
            const oldBadge = getBadgeForMemberCount(oldMemberCount);

            const savedMember = await addFamilyMember(
                user.uid, finalFormData, effectiveAnchorMember, relationshipToAnchor, selectedCoParentId
            );
            
            const newMemberCount = oldMemberCount + 1;
            const newBadge = getBadgeForMemberCount(newMemberCount);

            if (newBadge.tier > oldBadge.tier) {
                toast({
                    title: '🎉 New Badge Unlocked! 🎉',
                    description: `Congrats! You've earned the ${newBadge.name} Badge ${newBadge.icon} — Keep building your family legacy!`,
                    duration: 7000,
                    className: `${newBadge.colorClasses} border-transparent font-bold`,
                });
            }
            
            toast({ title: 'Member Added', description: `${finalFormData.name} has been added.` });
            onSave(savedMember);
            resetFormAndClose();
        } catch (error: any) {
            console.error("Error adding family member:", error);
            toast({ title: 'Save Failed', description: error.message || 'Could not save member.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (confirmedNotDuplicate) { 
      await proceedWithSubmit();
      setConfirmedNotDuplicate(false);
      return;
    }
    
    // In edit mode, we bypass the duplicate check
    if (memberToEdit) {
      await proceedWithSubmit();
      return;
    }


    const formName = formData.name.trim().toLowerCase();
    const formDob = isDobNA ? "N/A" : formData.dob;
    const formNativePlace = formData.nativePlace?.trim().toLowerCase();

    if (!formName) {
        toast({ title: "Validation Error", description: "Name is required.", variant: "destructive" });
        setLoading(false); return;
    }

    let potentialMatch: BasicPerson | null = null;
    const allPeopleToCheck: BasicPerson[] = userProfile ? [userProfile, ...localFamilyMembers] : [...localFamilyMembers];

    for (const person of allPeopleToCheck) {
      if (person.isAlternateProfile) continue;

      const existingName = person.name?.trim().toLowerCase();
      const existingDob = person.dob;
      const existingNativePlace = person.nativePlace?.trim().toLowerCase();

      if (existingName === formName) {
        if (formDob === "N/A" && existingDob === "N/A") { potentialMatch = person; break; }
        if (formDob !== "N/A" && existingDob !== "N/A" && formDob === existingDob) { potentialMatch = person; break; }
        if (formNativePlace && existingNativePlace && formNativePlace === existingNativePlace) {
            if ((formDob === "N/A" || existingDob === "N/A") || (formDob !== existingDob)) {
                potentialMatch = person; break;
            }
        }
      }
    }

    if (potentialMatch) {
      setPotentialDuplicateInfo({
        name: formData.name,
        dob: formDob === "N/A" ? "N/A" : (formDob ? new Date(formDob).toLocaleDateString() : "N/A"),
        nativePlace: formData.nativePlace || null,
        existingMemberName: potentialMatch.name || "Unknown",
      });
      setIsDuplicateDialogOpen(true);
      setLoading(false);
    } else {
      await proceedWithSubmit();
    }
  };

  const handleDuplicateDialogAction = (isSamePerson: boolean) => {
    setIsDuplicateDialogOpen(false);
    if (isSamePerson) {
      toast({ title: "Operation Cancelled", description: "New member not added as they might be a duplicate." });
      resetFormAndClose();
    } else {
      setConfirmedNotDuplicate(true);
      setTimeout(() => {
         const fakeEvent = { preventDefault: () => {} } as FormEvent;
         handleSubmit(fakeEvent);
      }, 0);
    }
  };

  const nextSpouseNumber = useMemo(() => {
    if (!memberToEdit && relationshipToAnchor === 'Spouse' && currentAnchorMember) {
      return (currentAnchorMember.spouseIds?.length || 0) + 1;
    }
    return null;
  }, [relationshipToAnchor, currentAnchorMember, memberToEdit]);

  const getDialogTitle = () => {
    if (memberToEdit) return `Edit ${memberToEdit.name || 'Member'}`;
    let anchorNameDisplay = 'Yourself';
    const effectiveAnchor = currentAnchorMember || userProfile;
    if (effectiveAnchor) {
      if (userProfile && effectiveAnchor.id === userProfile.id) {
        anchorNameDisplay = userProfile.name || 'Yourself';
      } else {
        anchorNameDisplay = effectiveAnchor.name || 'Selected Member';
      }
    }
    if (relationshipToAnchor && effectiveAnchor) {
         return `Add ${relationshipToAnchor} to ${anchorNameDisplay}`;
    }
    return `Add Relative to ${anchorNameDisplay}`;
  };

  const anchorSpousesForSelection = useMemo(() => {
    if (!currentAnchorMember || !currentAnchorMember.spouseIds || currentAnchorMember.spouseIds.length <= 1) {
        return [];
    }
    const allPeopleMap = new Map<string, BasicPerson>();
    if (userProfile) allPeopleMap.set(userProfile.id, userProfile);
    localFamilyMembers.forEach(fm => allPeopleMap.set(fm.id, fm));

    return currentAnchorMember.spouseIds
        .map(id => allPeopleMap.get(id))
        .filter(spouse => spouse && !spouse.isAlternateProfile) as BasicPerson[];
  }, [currentAnchorMember, userProfile, localFamilyMembers]);
  
  const spousesForDivorceManagement = useMemo(() => {
    if (!memberToEdit) return [];
    const allKnownPeopleMap = new Map();
    if (userProfile) allKnownPeopleMap.set(userProfile.id, userProfile);
    localFamilyMembers.forEach(p => allKnownPeopleMap.set(p.id, p));

    const everSpouseIds = new Set([
        ...(memberToEdit.spouseIds || []),
        ...(memberToEdit.divorcedSpouseIds || [])
    ]);

    return Array.from(everSpouseIds)
        .map(id => allKnownPeopleMap.get(id))
        .filter(p => p && p.id !== memberToEdit.id);
  }, [memberToEdit, localFamilyMembers, userProfile]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) resetFormAndClose();
        else onOpenChange(true);
      }}>
        <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl">{getDialogTitle()}</DialogTitle>
            <DialogDescription>
              {memberToEdit ? 'Update details.' : 'Enter details for the new family member.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
              <Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g. Arjun Narayanan R" required />
              <p className="text-xs text-muted-foreground mt-1 flex items-center">
                <AlertTriangle className="w-3 h-3 mr-1 text-orange-500 flex-shrink-0" />
                Only the first name (e.g. “Arjun” from “Arjun Narayanan R”) will be used for Discover Search. Please type your full name as shown in the example.
              </p>
            </div>
             <div className="space-y-2">
              <Label htmlFor="aliasName">Alias Name (Optional)</Label>
              <Input id="aliasName" name="aliasName" value={formData.aliasName || ''} onChange={handleInputChange} placeholder="Nickname, pet name, etc." />
            </div>


            {!memberToEdit && currentAnchorMember && (
              <div className="space-y-2">
                <Label htmlFor="relationshipToAnchor">
                  Relationship to {currentAnchorMember?.name || (userProfile?.name || 'Selected Person')}
                  <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={relationshipToAnchor}
                  onValueChange={handleRelationshipSelectChange}
                  required={!memberToEdit}
                  disabled={!!initialRelationshipToAnchor && !!memberToEdit}
                >
                  <SelectTrigger id="relationshipToAnchor"><SelectValue placeholder="Select relationship" /></SelectTrigger>
                  <SelectContent>
                    {anchorRelativeRelationshipOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                  </SelectContent>
                </Select>
                {nextSpouseNumber && (
                  <div className="p-2 bg-primary/10 border-l-4 border-primary rounded-r-md mt-2">
                    <p className="text-sm font-medium text-primary-foreground dark:text-primary-foreground bg-primary/80 dark:bg-primary/70 px-2 py-1 rounded inline-block">
                      👉 This will be added as the {getOrdinal(nextSpouseNumber)} spouse.
                    </p>
                  </div>
                )}
              </div>
            )}

            {!memberToEdit && (relationshipToAnchor === "Son" || relationshipToAnchor === "Daughter") && anchorSpousesForSelection.length > 0 && (
                 <div className="space-y-2">
                    <Label htmlFor="selectedCoParentId">Select Other Parent for this Child <span className="text-destructive">*</span></Label>
                    <Select
                        value={selectedCoParentId || ""}
                        onValueChange={(value) => setSelectedCoParentId(value || null)}
                        required
                    >
                        <SelectTrigger id="selectedCoParentId"><SelectValue placeholder="Select other parent..." /></SelectTrigger>
                        <SelectContent>
                            {anchorSpousesForSelection.map(spouse => (
                                <SelectItem key={spouse.id} value={spouse.id}>
                                    {spouse.name} ({spouse.gender}, DOB: {spouse.dob === "N/A" ? "N/A" : (spouse.dob ? new Date(spouse.dob).toLocaleDateString() : "Unknown")})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     <p className="text-xs text-muted-foreground">This child will be linked to {currentAnchorMember?.name} and the selected spouse.</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth <span className="text-destructive">*</span></Label>
                <Input
                  id="dob" name="dob" type="date"
                  value={isDobNA ? "" : formData.dob}
                  onChange={handleInputChange} disabled={isDobNA}
                  required={!isDobNA && (!memberToEdit || (memberToEdit && memberToEdit.dob !== "N/A"))}
                />
                 <div className="flex items-center space-x-2 mt-1">
                  <Checkbox id="dobNA" checked={isDobNA} onCheckedChange={handleDobNACheck} />
                  <Label htmlFor="dobNA" className="text-sm font-normal">N/A (Date Unknown)</Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender <span className="text-destructive">*</span></Label>
                <Select value={formData.gender || 'Other'} onValueChange={(value) => handleSelectChange('gender', value)} required >
                  <SelectTrigger id="gender"><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(memberToEdit || (relationshipToAnchor === 'Brother' || relationshipToAnchor === 'Sister')) && (
                <div className="space-y-2">
                    <Label htmlFor="siblingOrderIndex">Sibling Order (Optional: Smaller # is older)</Label>
                    <Input
                        id="siblingOrderIndex" name="siblingOrderIndex" type="number" min="0"
                        value={formData.siblingOrderIndex === undefined ? '' : formData.siblingOrderIndex.toString()}
                        onChange={handleInputChange} placeholder="e.g., 1 for eldest"
                    />
                     <p className="text-xs text-muted-foreground">Used for sorting if DOBs are unclear. Has higher priority than DOB.</p>
                </div>
            )}
            
            <div className="flex items-center space-x-2">
              <Checkbox id="isDeceased" checked={isDeceased} onCheckedChange={handleDeceasedCheck} />
              <Label htmlFor="isDeceased" className="text-sm font-normal">Deceased</Label>
            </div>
            
            {isDeceased && (
              <div className="space-y-2 pl-6 border-l-2 border-muted ml-2">
                <Label htmlFor="deceasedDate">Deceased Date (Optional)</Label>
                <Input id="deceasedDate" name="deceasedDate" type="date"
                       value={isDeceasedDateNA ? "" : (formData.deceasedDate || "")}
                       onChange={handleInputChange}
                       disabled={isDeceasedDateNA} />
                <div className="flex items-center space-x-2 mt-1">
                  <Checkbox id="deceasedDateNA" checked={isDeceasedDateNA} onCheckedChange={handleDeceasedDateNACheck} />
                  <Label htmlFor="deceasedDateNA" className="text-sm font-normal">N/A (Date Unknown)</Label>
                </div>
              </div>
            )}

            {(memberToEdit || relationshipToAnchor === 'Spouse') && (
              <div className="space-y-2">
                <Label htmlFor="anniversaryDate">Anniversary Date <span className="text-destructive">*</span></Label>
                <Input id="anniversaryDate" name="anniversaryDate" type="date"
                       value={isAnniversaryDateNA ? "" : (formData.anniversaryDate || "")}
                       onChange={handleInputChange}
                       disabled={isAnniversaryDateNA} />
                <div className="flex items-center space-x-2 mt-1">
                  <Checkbox id="anniversaryDateNA" checked={isAnniversaryDateNA} onCheckedChange={handleAnniversaryDateNACheck} />
                  <Label htmlFor="anniversaryDateNA" className="text-sm font-normal">N/A (Date Unknown)</Label>
                </div>
              </div>
            )}

            {memberToEdit && spousesForDivorceManagement.length > 0 && (
                <div className="space-y-4 border-t pt-4 mt-4">
                    <Label className="text-md font-semibold flex items-center"><HeartCrack className="w-5 h-5 mr-2 text-primary"/> Manage Divorces</Label>
                    {spousesForDivorceManagement.map(spouse => (
                    <div key={spouse.id} className="flex items-center space-x-2">
                        <Checkbox
                        id={`divorce-${spouse.id}`}
                        checked={divorceSelections[spouse.id] || false}
                        onCheckedChange={(checked) => handleDivorceSelectionChange(spouse.id, !!checked)}
                        />
                        <Label htmlFor={`divorce-${spouse.id}`} className="text-sm font-normal">
                        Mark as divorced from {spouse.name || 'Unnamed Spouse'}
                        </Label>
                    </div>
                    ))}
                    <p className="text-xs text-muted-foreground">Checking a box will move this spouse to the "divorced" list. Unchecking will move them back to the "current spouse" list.</p>
                </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="nativePlace">Native Place</Label>
              <Input id="nativePlace" name="nativePlace" value={formData.nativePlace || ''} onChange={handleInputChange} placeholder="City, Country" />
              <p className="text-xs text-primary mt-1">👉 Native Place is compulsory for discovering your kins!</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentPlace">Current Place</Label>
              <Input id="currentPlace" name="currentPlace" value={formData.currentPlace || ''} onChange={handleInputChange} placeholder="City, Country" disabled={isDeceased} />
               <p className="text-xs text-primary mt-1">👉 Current Place is useful for discovering your kins!</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="religion">Religion</Label>
               <Popover open={isReligionComboboxOpen} onOpenChange={setIsReligionComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={isReligionComboboxOpen} className="w-full justify-between">
                    {formData.religion ? religions.find((r) => r.toLowerCase() === formData.religion?.toLowerCase()) || formData.religion : "Select religion..."}
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
                              handleSelectChange('religion', currentValue === formData.religion ? '' : currentValue);
                              setIsReligionComboboxOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", formData.religion?.toLowerCase() === r.toLowerCase() ? "opacity-100" : "opacity-0")} />
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
              <Input id="caste" name="caste" value={formData.caste || ''} onChange={handleInputChange} placeholder="Caste name" />
               <p className="text-xs text-muted-foreground mt-1 flex items-start">
                  <Info className="w-4 h-4 mr-1.5 mt-0.5 text-primary flex-shrink-0" />
                  <span>Please type your caste name correctly. This will be used for discovering relatives. You can check Google to ensure the correct spelling.</span>
               </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stories">Stories or Comments (Optional)</Label>
              <Textarea id="stories" name="stories" value={formData.stories || ''} onChange={handleInputChange} placeholder="Memories, quotes, or notes..." />
            </div>

            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="outline" onClick={resetFormAndClose}>Cancel</Button></DialogClose>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (memberToEdit ? 'Save Changes' : 'Add Member')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <ShieldAlert className="mr-2 h-6 w-6 text-orange-500" /> Potential Duplicate Found
            </AlertDialogTitle>
            <AlertDialogDescription>
              A person named <strong>{potentialDuplicateInfo?.name}</strong>
              (DOB: {potentialDuplicateInfo?.dob}
              {potentialDuplicateInfo?.nativePlace && `, Native: ${potentialDuplicateInfo.nativePlace}`})
              might already exist in your tree as <strong>{potentialDuplicateInfo?.existingMemberName}</strong>.
              <br />
              Are they the same person?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleDuplicateDialogAction(true)}>Yes, Same Person (Cancel Add)</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDuplicateDialogAction(false)} className="bg-primary hover:bg-primary/90">
              No, Add as New Person
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
