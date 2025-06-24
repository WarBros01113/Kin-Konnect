'use client';

import { useEffect, useState, useTransition, useMemo } from 'react';
import { Button } from '@/components/ui/button';
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
import { Loader2, AlertTriangle, UserX, Search as SearchIcon } from 'lucide-react';
import { getAllUsers } from '@/lib/firebase/firestore';
import type { AdminUserView } from '@/types';
import { useToast } from '@/hooks/use-toast';
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
import { deleteUserAction } from './actions';


export default function UserManagementPage() {
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
  const [userToDelete, setUserToDelete] = useState<AdminUserView | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const fetchedUsers = await getAllUsers();
      setUsers(fetchedUsers as AdminUserView[]);
    } catch (error: any) {
      console.error("Failed to fetch users:", error);
      toast({
        title: "Error Fetching Users",
        description: `Could not fetch user list. Firestore Error: ${error.message}. This might be due to Firestore security rules. Please ensure admins have read access to the 'users' collection.`,
        variant: "destructive",
        duration: 9000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) {
      return users;
    }
    return users.filter(user =>
      (user.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [users, searchTerm]);

  const handleDeleteUserClick = (user: AdminUserView) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteUser = () => {
    if (!userToDelete) return;

    startTransition(async () => {
      const result = await deleteUserAction(userToDelete.id);
      if (result.success) {
        toast({ title: "Success", description: `User ${userToDelete.name || userToDelete.email} and their data deleted from Firestore.` });
        fetchUsers(); // Refresh user list
      } else {
        toast({ 
          title: `Error Deleting User (Code: ${result.errorCode || 'N/A'})`, 
          description: result.error || "An unknown error occurred. Please meticulously verify your Firestore security rules grant delete permissions. Also, confirm the logged-in admin user's document in Firestore has 'isAdmin: true' (boolean). Check browser console and Firebase Console (Functions logs if applicable, Firestore operation logs if available for rejections) for further details.", 
          variant: "destructive",
          duration: 15000, 
        });
      }
      setIsDeleteDialogOpen(false);
      setUserToDelete(null); 
    });
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-bold text-primary">User Management</h1>
      <Card>
        <CardHeader>
          <CardTitle>Registered Users</CardTitle>
          <CardDescription>
            View and manage registered users. Deleting a user here removes their data from Firestore.
            <br />
            <span className="text-xs text-muted-foreground">
              Note: This action does NOT delete the user from Firebase Authentication. That must be done manually in the Firebase console.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full md:w-1/2 lg:w-1/3"
              />
            </div>
          </div>
          {filteredUsers.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              {searchTerm ? 'No users match your search.' : 'No users found. Ensure Firestore rules allow admin access and users exist.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
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
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.name || 'N/A'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell className="font-mono text-xs">{user.id}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteUserClick(user)}
                          disabled={isPending && userToDelete?.id === user.id}
                        >
                          {isPending && userToDelete?.id === user.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserX className="mr-2 h-4 w-4" />}
                          Delete User
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {userToDelete && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
          if (!open) { 
             setIsDeleteDialogOpen(false); 
             setUserToDelete(null);
          } else {
            setIsDeleteDialogOpen(true); 
          }
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-6 w-6 text-destructive" />
                Confirm User Deletion
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the user {userToDelete.name || userToDelete.email}?
                This will remove their profile and all associated family members from Firestore.
                This action cannot be undone.
                <br />
                <strong className="text-xs">This does NOT delete them from Firebase Authentication.</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setIsDeleteDialogOpen(false); setUserToDelete(null); }}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteUser}
                disabled={isPending}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Yes, Delete User Data'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
