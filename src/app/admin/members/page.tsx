
'use client';

import { useEffect, useState, useTransition, useMemo } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, User, Edit, Trash2, Eye, ChevronRight, Users as UsersIcon, ShieldAlert, Search as SearchIcon, Network } from 'lucide-react';
import { getAllUsers, getFamilyMembers, deleteFamilyMember } from '@/lib/firebase/firestore';
import type { FamilyMember, AdminUserView as UserView } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { calculateAge } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import AdminFamilyMemberForm from '@/components/admin/AdminFamilyMemberForm';
import Link from 'next/link';

export default function MemberManagementPage() {
  const [allUsers, setAllUsers] = useState<UserView[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserView | null>(null);
  const [membersOfSelectedUser, setMembersOfSelectedUser] = useState<FamilyMember[]>([]);
  
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [isPending, startTransition] = useTransition();
  
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<FamilyMember | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingMemberInfo, setDeletingMemberInfo] = useState<{ memberId: string; memberName: string; ownerId: string } | null>(null);

  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [memberSearchTerm, setMemberSearchTerm] = useState('');

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const fetchedUsers = await getAllUsers();
      setAllUsers(fetchedUsers as UserView[]);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast({ title: "Error", description: "Could not fetch user list. Check permissions.", variant: "destructive" });
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredAllUsers = useMemo(() => {
    if (!userSearchTerm) {
      return allUsers;
    }
    return allUsers.filter(user =>
      (user.name?.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
      (user.email?.toLowerCase().includes(userSearchTerm.toLowerCase()))
    );
  }, [allUsers, userSearchTerm]);

  const filteredMembersOfSelectedUser = useMemo(() => {
    if (!memberSearchTerm) {
      return membersOfSelectedUser;
    }
    return membersOfSelectedUser.filter(member =>
      member.name?.toLowerCase().includes(memberSearchTerm.toLowerCase())
    );
  }, [membersOfSelectedUser, memberSearchTerm]);

  const handleSelectUser = async (user: UserView) => {
    setSelectedUser(user);
    setMemberSearchTerm('');
    setLoadingMembers(true);
    setMembersOfSelectedUser([]);
    try {
      const fetchedMembers = await getFamilyMembers(user.id);
      setMembersOfSelectedUser(fetchedMembers);
    } catch (error) {
      console.error(`Failed to fetch members for ${user.name}:`, error);
      toast({ title: "Error", description: `Could not fetch members for ${user.name}.`, variant: "destructive" });
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleEditMember = (member: FamilyMember) => {
    if (!selectedUser) return;
    setMemberToEdit(member);
    setIsFormOpen(true);
  };

  const promptDeleteMember = (member: FamilyMember) => {
    if (!selectedUser) return;
    setDeletingMemberInfo({ memberId: member.id, memberName: member.name || 'Unnamed Member', ownerId: selectedUser.id });
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteMember = async () => {
    if (!deletingMemberInfo) return;
    startTransition(async () => {
      try {
        await deleteFamilyMember(deletingMemberInfo.ownerId, deletingMemberInfo.memberId);
        toast({ title: "Success", description: `${deletingMemberInfo.memberName} deleted.` });
        if (selectedUser && selectedUser.id === deletingMemberInfo.ownerId) {
          const fetchedMembers = await getFamilyMembers(deletingMemberInfo.ownerId);
          setMembersOfSelectedUser(fetchedMembers);
        }
      } catch (error) {
        console.error("Failed to delete member:", error);
        toast({ title: "Error", description: "Could not delete member.", variant: "destructive" });
      } finally {
        setIsDeleteDialogOpen(false);
        setDeletingMemberInfo(null);
      }
    });
  };
  
  const handleFormSave = async () => {
     if (selectedUser) {
        setLoadingMembers(true);
        try {
            const fetchedMembers = await getFamilyMembers(selectedUser.id);
            setMembersOfSelectedUser(fetchedMembers);
        } catch (error) {
            toast({ title: "Error", description: "Could not refresh members list.", variant: "destructive" });
        } finally {
            setLoadingMembers(false);
        }
    }
  }

  if (loadingUsers) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-bold text-primary">Member Management</h1>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><UsersIcon className="mr-3 h-6 w-6" /> Select a User</CardTitle>
          <CardDescription>Choose a user to view and manage their family members or their interactive tree.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search users by name or email..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="pl-8 w-full md:w-1/2 lg:w-1/3"
              />
            </div>
          </div>
          {filteredAllUsers.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              {userSearchTerm ? 'No users match your search.' : 'No users found in the system.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAllUsers.map((user) => (
                  <TableRow key={user.id} className={selectedUser?.id === user.id ? 'bg-accent/50' : ''}>
                    <TableCell>{user.name || 'N/A'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="font-mono text-xs">{user.id}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleSelectUser(user)}>
                        View Members <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/view-tree/${user.id}`}>
                          <Network className="h-4 w-4 mr-1" /> View Tree
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedUser && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-3 h-6 w-6" /> Family Members of {selectedUser.name || selectedUser.email}
            </CardTitle>
            <CardDescription>View and manage members associated with this user.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search members by name..."
                  value={memberSearchTerm}
                  onChange={(e) => setMemberSearchTerm(e.target.value)}
                  className="pl-8 w-full md:w-1/2 lg:w-1/3"
                />
              </div>
            </div>
            {loadingMembers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Loading members...</p>
              </div>
            ) : filteredMembersOfSelectedUser.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                {memberSearchTerm ? 'No members match your search.' : (membersOfSelectedUser.length === 0 ? 'This user has no family members.' : 'No members match your search for this user.')}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>DOB</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Relationship (to User)</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembersOfSelectedUser.map((member) => {
                      const age = member.dob && member.dob !== "N/A" ? calculateAge(member.dob) : null;
                      const displayDob = member.dob === "N/A" ? "N/A" : (member.dob ? new Date(member.dob).toLocaleDateString() : "N/A");
                      return (
                        <TableRow key={member.id}>
                          <TableCell>{member.name || 'N/A'}</TableCell>
                          <TableCell>{displayDob}</TableCell>
                          <TableCell>{member.isDeceased ? 'N/A' : (age !== null ? age : 'N/A')}</TableCell>
                          <TableCell>{member.gender || 'N/A'}</TableCell>
                          <TableCell>{member.isDeceased ? 'Deceased' : 'Alive'}</TableCell>
                          <TableCell>{member.relationship || 'N/A'}</TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditMember(member)} disabled={isPending} title="Edit Member">
                                <Edit className="h-4 w-4"/>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => promptDeleteMember(member)} disabled={isPending} title="Delete Member">
                                <Trash2 className="h-4 w-4 text-destructive"/>
                            </Button>
                             <Button variant="ghost" size="icon" disabled title="View Details (Not Implemented)">
                                <Eye className="h-4 w-4"/>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {memberToEdit && selectedUser && (
        <AdminFamilyMemberForm
          isOpen={isFormOpen}
          onOpenChange={setIsFormOpen}
          memberToEdit={memberToEdit}
          ownerId={selectedUser.id} 
          onSaveSuccess={() => {
            setIsFormOpen(false);
            setMemberToEdit(null);
            if (selectedUser) {
              handleSelectUser(selectedUser);
            }
          }}
        />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center"><ShieldAlert className="mr-2 h-6 w-6 text-destructive"/>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete <strong>{deletingMemberInfo?.memberName}</strong> from {selectedUser?.name}'s family tree.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingMemberInfo(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteMember} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete Member'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

    