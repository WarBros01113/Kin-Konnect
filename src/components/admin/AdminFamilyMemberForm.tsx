
'use client';

import type { ChangeEvent, FormEvent } from 'react';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import type { FamilyMember, BasicPerson, FamilyMemberFormData } from '@/types';
import { updateFamilyMember, getFamilyMembers, getPersonById } from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, HeartCrack, ChevronsUpDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { religions } from '@/lib/data/demographics';


interface AdminFamilyMemberFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSaveSuccess: () => void;
  memberToEdit: FamilyMember | null;
  ownerId: string; 
}

const initialFormStateBase: Omit<FamilyMemberFormData, 'divorcedSpouseIds'> = { // divorcedSpouseIds handled separately in admin form
  name: '',
  dob: '',
  nativePlace: '',
  currentPlace: '',
  religion: '',
  caste: '',
  stories: '',
  gender: '',
  isDeceased: false,
  deceasedDate: '',
  anniversaryDate: '',
};

export default function AdminFamilyMemberForm({
  isOpen,
  onOpenChange,
  onSaveSuccess,
  memberToEdit,
  ownerId,
}: AdminFamilyMemberFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState(initialFormStateBase);
  const [isDobNA, setIsDobNA] = useState(false);
  const [isDeceased, setIsDeceased] = useState(false);
  const [isDeceasedDateNA, setIsDeceasedDateNA] = useState(false);
  const [isAnniversaryDateNA, setIsAnniversaryDateNA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ownerFamilyMembers, setOwnerFamilyMembers] = useState<BasicPerson[]>([]); 

  const [divorceSelections, setDivorceSelections] = useState<Record<string, boolean>>({});

  const [isReligionComboboxOpen, setIsReligionComboboxOpen] = useState(false);


  const resetFormAndClose = useCallback(() => {
    setFormData(initialFormStateBase);
    setIsDobNA(false);
    setIsDeceased(false);
    setIsDeceasedDateNA(false);
    setIsAnniversaryDateNA(false);
    setDivorceSelections({});
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (isOpen && memberToEdit) {
      setFormData({
        name: memberToEdit.name || '',
        dob: memberToEdit.dob === "N/A" ? "" : memberToEdit.dob || '',
        nativePlace: memberToEdit.nativePlace || '',
        currentPlace: memberToEdit.currentPlace || '',
        religion: memberToEdit.religion || '',
        caste: memberToEdit.caste || '',
        stories: memberToEdit.stories || '',
        gender: memberToEdit.gender || '',
        isDeceased: memberToEdit.isDeceased || false,
        deceasedDate: memberToEdit.deceasedDate === "N/A" ? "" : memberToEdit.deceasedDate || "",
        anniversaryDate: memberToEdit.anniversaryDate === "N/A" ? "" : memberToEdit.anniversaryDate || "",
      });
      setIsDobNA(memberToEdit.dob === "N/A");
      setIsDeceased(!!memberToEdit.isDeceased);
      setIsDeceasedDateNA(memberToEdit.deceasedDate === "N/A");
      setIsAnniversaryDateNA(memberToEdit.anniversaryDate === "N/A");

      const fetchOwnerMembers = async () => {
          try {
              const members = await getFamilyMembers(ownerId);
              const ownerProfile = await getPersonById(ownerId, ownerId); 
              const allRelevantPeople: BasicPerson[] = ownerProfile ? [ownerProfile, ...members] : members;
              setOwnerFamilyMembers(allRelevantPeople.filter(p => !p.isAlternateProfile));

              const initialSelections: Record<string, boolean> = {};
              const currentAndFormerSpouseIds = new Set([
                ...(memberToEdit.spouseIds || []),
                ...(memberToEdit.divorcedSpouseIds || [])
              ]);

              currentAndFormerSpouseIds.forEach(spouseId => {
                  if (spouseId !== memberToEdit.id) { 
                    initialSelections[spouseId] = (memberToEdit.divorcedSpouseIds || []).includes(spouseId);
                  }
              });
              setDivorceSelections(initialSelections);

          } catch (error) {
              console.error("Error fetching owner's family for divorce management (admin):", error);
              toast({title: "Error", description: "Could not load spouse data for divorce management.", variant: "destructive"});
          }
      };
      fetchOwnerMembers();

    }
  }, [memberToEdit, isOpen, ownerId, toast]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
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
    setIsDeceased(!!checked);
    if (!checked) {
        setFormData(prev => ({...prev, deceasedDate: ""}));
        setIsDeceasedDateNA(false);
    }
  };

  const handleDeceasedDateNACheck = (checked: boolean | 'indeterminate') => {
    const isChecked = !!checked;
    setIsDeceasedDateNA(isChecked);
    if (isChecked) {
        setFormData(prev => ({...prev, deceasedDate: "N/A"}));
    } else {
        setFormData(prev => ({...prev, deceasedDate: prev.deceasedDate === "N/A" ? "" : prev.deceasedDate}));
    }
  };
  
  const handleAnniversaryDateNACheck = (checked: boolean | 'indeterminate') => {
    const isChecked = !!checked;
    setIsAnniversaryDateNA(isChecked);
    if (isChecked) {
        setFormData(prev => ({...prev, anniversaryDate: "N/A"}));
    } else {
        setFormData(prev => ({...prev, anniversaryDate: prev.anniversaryDate === "N/A" ? "" : prev.anniversaryDate}));
    }
  };

  const handleDivorceSelectionChange = (spouseId: string, isDivorced: boolean) => {
    setDivorceSelections(prev => ({ ...prev, [spouseId]: isDivorced }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!memberToEdit || !ownerId) {
      toast({ title: 'Error', description: 'Missing member data or owner ID.', variant: 'destructive' });
      return;
    }
    if (!isDobNA && !formData.dob) {
      toast({ title: 'Error', description: 'Please enter a Date of Birth or select N/A.', variant: 'destructive' });
      return;
    }
     if (!formData.gender) {
      toast({ title: 'Error', description: 'Please select a gender.', variant: 'destructive' });
      return;
    }
    if (isDeceased && !isDeceasedDateNA && !formData.deceasedDate) {
      toast({ title: 'Error', description: 'If deceased, please enter a Deceased Date or mark it N/A.', variant: 'destructive' });
      return;
    }
    // Anniversary date is optional, so no specific validation here unless it's non-N/A and empty.
    if (formData.anniversaryDate && !isAnniversaryDateNA && !formData.anniversaryDate.trim()) {
        toast({ title: 'Error', description: 'Please enter an Anniversary Date or select N/A if applicable.', variant: 'destructive' });
        return;
    }


    setLoading(true);
    try {
      const finalDob = isDobNA ? "N/A" : formData.dob;
      const finalDeceasedDate = isDeceased ? (isDeceasedDateNA ? "N/A" : formData.deceasedDate) : undefined;
      const finalAnniversaryDate = formData.anniversaryDate ? (isAnniversaryDateNA ? "N/A" : formData.anniversaryDate) : undefined;

      const finalDivorcedSpouseIds: string[] = [];
      Object.entries(divorceSelections).forEach(([spouseId, isDivorcedFrom]) => {
            if (isDivorcedFrom) {
                finalDivorcedSpouseIds.push(spouseId);
            }
      });

      const updatePayload: Partial<Omit<FamilyMember, 'id' | 'userId' | 'relationship'>> = {
        name: formData.name,
        dob: finalDob,
        isDeceased: isDeceased,
        deceasedDate: finalDeceasedDate,
        anniversaryDate: finalAnniversaryDate,
        gender: formData.gender,
        nativePlace: formData.nativePlace || null,
        currentPlace: formData.currentPlace || null,
        religion: formData.religion || null,
        caste: formData.caste || null,
        stories: formData.stories || null,
        divorcedSpouseIds: finalDivorcedSpouseIds,
      };

      await updateFamilyMember(ownerId, memberToEdit.id, updatePayload); 
      toast({ title: 'Member Updated', description: `${formData.name} has been updated by admin.` });
      onSaveSuccess();
      resetFormAndClose();
    } catch (error: any) {
      console.error("Error updating family member (admin):", error);
      toast({ title: 'Update Failed', description: error.message || 'Could not update member.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const spousesForDivorceManagement = useMemo(() => {
    if (!memberToEdit) return [];
    const currentAndFormerSpouseIds = new Set([
        ...(memberToEdit.spouseIds || []),
        ...(memberToEdit.divorcedSpouseIds || [])
    ]);
    
    return ownerFamilyMembers.filter(p => currentAndFormerSpouseIds.has(p.id) && p.id !== memberToEdit.id);
  }, [memberToEdit, ownerFamilyMembers]);


  if (!memberToEdit) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) resetFormAndClose();
      else onOpenChange(true);
    }}>
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Edit {memberToEdit.name}</DialogTitle>
          <DialogDescription>
            Update details for this family member. Belongs to user: {ownerId}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="admin-name">Full Name <span className="text-destructive">*</span></Label>
            <Input id="admin-name" name="name" value={formData.name} onChange={handleInputChange} placeholder="Full name" required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="admin-dob">Date of Birth <span className="text-destructive">*</span></Label>
              <Input
                id="admin-dob"
                name="dob"
                type="date"
                value={isDobNA ? "" : formData.dob}
                onChange={handleInputChange}
                disabled={isDobNA}
                required={!isDobNA}
              />
               <div className="flex items-center space-x-2 mt-1">
                <Checkbox id="admin-dobNA" checked={isDobNA} onCheckedChange={handleDobNACheck} />
                <Label htmlFor="admin-dobNA" className="text-sm font-normal">N/A</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-gender">Gender <span className="text-destructive">*</span></Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => handleSelectChange('gender', value)}
                required
              >
                <SelectTrigger id="admin-gender"><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="admin-isDeceased" checked={isDeceased} onCheckedChange={handleDeceasedCheck} />
            <Label htmlFor="admin-isDeceased" className="text-sm font-normal">Deceased</Label>
          </div>
          {isDeceased && (
            <div className="space-y-2 pl-6 border-l-2 border-muted ml-2">
              <Label htmlFor="admin-deceasedDate">Deceased Date (Optional)</Label>
              <Input id="admin-deceasedDate" name="deceasedDate" type="date"
                     value={isDeceasedDateNA ? "" : (formData.deceasedDate || "")}
                     onChange={handleInputChange}
                     disabled={isDeceasedDateNA} />
              <div className="flex items-center space-x-2 mt-1">
                <Checkbox id="admin-deceasedDateNA" checked={isDeceasedDateNA} onCheckedChange={handleDeceasedDateNACheck} />
                <Label htmlFor="admin-deceasedDateNA" className="text-sm font-normal">N/A</Label>
              </div>
            </div>
          )}

          {/* Anniversary Date Editing for Admins */}
          {memberToEdit && (formData.anniversaryDate || memberToEdit.spouseIds?.length > 0) && ( // Show if anniversary exists OR if member has spouses
            <div className="space-y-2">
              <Label htmlFor="admin-anniversaryDate">Anniversary Date (with first/primary spouse, if applicable)</Label>
              <Input id="admin-anniversaryDate" name="anniversaryDate" type="date"
                     value={isAnniversaryDateNA ? "" : (formData.anniversaryDate || "")}
                     onChange={handleInputChange}
                     disabled={isAnniversaryDateNA} />
              <div className="flex items-center space-x-2 mt-1">
                <Checkbox id="admin-anniversaryDateNA" checked={isAnniversaryDateNA} onCheckedChange={handleAnniversaryDateNACheck} />
                <Label htmlFor="admin-anniversaryDateNA" className="text-sm font-normal">N/A</Label>
              </div>
              <p className="text-xs text-muted-foreground">Note: This form edits a single anniversary date, typically with the first/primary spouse. Specific anniversaries per spouse are not managed here.</p>
            </div>
          )}

          {spousesForDivorceManagement.length > 0 && (
              <div className="space-y-4 border-t pt-4 mt-4">
                <Label className="text-md font-semibold flex items-center"><HeartCrack className="w-5 h-5 mr-2 text-primary"/> Manage Divorces with Spouses</Label>
                {spousesForDivorceManagement.map(spouse => (
                  <div key={spouse.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`admin-divorce-${spouse.id}`}
                      checked={divorceSelections[spouse.id] || false}
                      onCheckedChange={(checked) => handleDivorceSelectionChange(spouse.id, !!checked)}
                    />
                    <Label htmlFor={`admin-divorce-${spouse.id}`} className="text-sm font-normal">
                      Mark as divorced from {spouse.name || 'Unnamed Spouse'}
                    </Label>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Checking a box will mark this person as divorced from that spouse and update their relationship links.</p>
              </div>
            )}


           <div className="space-y-2">
            <Label htmlFor="admin-relationship">Relationship to Owner (Read-only)</Label>
            <Input id="admin-relationship" name="relationship" value={memberToEdit.relationship} readOnly disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-nativePlace">Native Place</Label>
            <Input id="admin-nativePlace" name="nativePlace" value={formData.nativePlace} onChange={handleInputChange} placeholder="City, Country" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-currentPlace">Current Place</Label>
            <Input id="admin-currentPlace" name="currentPlace" value={formData.currentPlace} onChange={handleInputChange} placeholder="City, Country" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-religion">Religion</Label>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-caste">Caste</Label>
            <Input id="admin-caste" name="caste" value={formData.caste || ''} onChange={handleInputChange} placeholder="Caste name" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-stories">Stories or Comments</Label>
            <Textarea id="admin-stories" name="stories" value={formData.stories} onChange={handleInputChange} placeholder="Memories, quotes, or notes..." />
          </div>

          <DialogFooter className="pt-4">
            <DialogClose asChild><Button type="button" variant="outline" onClick={resetFormAndClose}>Cancel</Button></DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
