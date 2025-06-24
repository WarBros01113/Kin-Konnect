
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/providers/AuthProvider';
import { getKonnectRequests, acceptKonnectRequest, declineKonnectRequest, getKonnections, removeKonnection, getUserProfile } from '@/lib/firebase/firestore';
import type { KonnectRequest, Konnection, Profile } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Added Input
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, UserPlus, Users, Check, X, UserX, Link2 as KonnectIconLucide, AlertCircle, Eye, Search } from 'lucide-react'; // Added Search
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
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function KonnectRequestCard({ request, onAccept, onDecline, processingId }: {
  request: KonnectRequest;
  onAccept: (request: KonnectRequest) => void;
  onDecline: (request: KonnectRequest) => void;
  processingId: string | null;
}) {
  const isProcessing = processingId === request.id;
  return (
    <Card className="p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex-grow">
          <p className="font-semibold">{request.senderName}</p>
          <p className="text-xs text-muted-foreground">
            Sent: {new Date(request.timestamp.toDate()).toLocaleDateString()}
          </p>
        </div>
        <div className="flex space-x-2 self-end sm:self-center">
          <Button variant="outline" size="sm" onClick={() => onAccept(request)} disabled={isProcessing}>
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />} Accept
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onDecline(request)} disabled={isProcessing}>
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-1" />} Decline
          </Button>
        </div>
      </div>
    </Card>
  );
}

function KonnectionCard({ konnection, onUnkonnect, processingId, onViewTree }: {
  konnection: Konnection;
  onUnkonnect: (konnection: Konnection) => void;
  processingId: string | null;
  onViewTree: (konnectedUserId: string) => void;
}) {
   const isProcessing = processingId === konnection.id;
  return (
    <Card className="p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex-grow">
          <p className="font-semibold">{konnection.name}</p>
          <p className="text-xs text-muted-foreground">
            Konnected since: {new Date(konnection.konnectedAt.toDate()).toLocaleDateString()}
          </p>
        </div>
        <div className="flex space-x-2 self-end sm:self-center">
          <Button variant="outline" size="sm" onClick={() => onViewTree(konnection.konnectedUserId)} disabled={isProcessing}>
            <Eye className="h-4 w-4 mr-1" /> View Tree
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onUnkonnect(konnection)} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4 mr-1" />} Unkonnect
          </Button>
        </div>
      </div>
    </Card>
  );
}


function KonnectionsPageContent() {
  const { user, clearPendingKonnectRequestsIndicator, refreshPendingKonnectRequests } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [requests, setRequests] = useState<KonnectRequest[]>([]);
  const [konnections, setKonnections] = useState<Konnection[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingKonnections, setLoadingKonnections] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [userToUnkonnect, setUserToUnkonnect] = useState<Konnection | null>(null);
  const [isUnkonnectDialogOpen, setIsUnkonnectDialogOpen] = useState(false);
  const [requestSearchTerm, setRequestSearchTerm] = useState('');
  const [konnectionSearchTerm, setKonnectionSearchTerm] = useState('');


  const fetchAllData = useCallback(async () => {
    if (user) {
      setLoadingRequests(true);
      setLoadingKonnections(true);
      try {
        const [fetchedRequests, fetchedKonnections] = await Promise.all([
          getKonnectRequests(user.uid),
          getKonnections(user.uid)
        ]);
        
        // Defensive sorting in case a timestamp is missing from a document
        setRequests(fetchedRequests.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
        // Corrected typo (a.timestamp -> a.konnectedAt) and added defensive sorting
        setKonnections(fetchedKonnections.sort((a, b) => (b.konnectedAt?.seconds || 0) - (a.konnectedAt?.seconds || 0)));

        if (fetchedRequests.length === 0) {
          clearPendingKonnectRequestsIndicator();
        }
      } catch (error: any) {
        toast({ title: "Error", description: `Failed to load data: ${error.message}`, variant: "destructive" });
      } finally {
        setLoadingRequests(false);
        setLoadingKonnections(false);
      }
    }
  }, [user, toast, clearPendingKonnectRequestsIndicator]);

  useEffect(() => {
    fetchAllData();
    clearPendingKonnectRequestsIndicator();
  }, [fetchAllData, clearPendingKonnectRequestsIndicator]);

  const filteredRequests = useMemo(() => {
    if (!requestSearchTerm.trim()) {
      return requests;
    }
    return requests.filter(req =>
      req.senderName?.toLowerCase().includes(requestSearchTerm.toLowerCase())
    );
  }, [requests, requestSearchTerm]);

  const filteredKonnections = useMemo(() => {
    if (!konnectionSearchTerm.trim()) {
      return konnections;
    }
    return konnections.filter(kon =>
      kon.name?.toLowerCase().includes(konnectionSearchTerm.toLowerCase())
    );
  }, [konnections, konnectionSearchTerm]);

  const handleAccept = async (request: KonnectRequest) => {
    if (!user) return;
    setProcessingId(request.id);
    try {
      const senderProfile = await getUserProfile(request.senderId);
      if (!senderProfile) throw new Error("Sender profile not found to complete konnection.");

      await acceptKonnectRequest(request.id, user.uid, request.senderId, senderProfile.name || 'Konnected User');
      toast({ title: "Konnection Accepted!", description: `You are now konnected with ${request.senderName}.` });
      await fetchAllData();
      await refreshPendingKonnectRequests(); 
    } catch (error: any) {
      toast({ title: "Error Accepting", description: error.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (request: KonnectRequest) => {
    if (!user) return;
    setProcessingId(request.id);
    try {
      await declineKonnectRequest(user.uid, request.senderId);
      toast({ title: "Request Declined", description: `Konnect request from ${request.senderName} declined.` });
      setRequests(prev => prev.filter(r => r.id !== request.id));
      await refreshPendingKonnectRequests(); 
    } catch (error: any) {
      toast({ title: "Error Declining", description: error.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };
  
  const promptUnkonnect = (konnection: Konnection) => {
    setUserToUnkonnect(konnection);
    setIsUnkonnectDialogOpen(true);
  };

  const handleUnkonnect = async () => {
    if (!user || !userToUnkonnect) return;
    setProcessingId(userToUnkonnect.id);
    try {
      await removeKonnection(user.uid, userToUnkonnect.konnectedUserId);
      toast({ title: "Unkonnected", description: `You are no longer konnected with ${userToUnkonnect.name}.` });
      setKonnections(prev => prev.filter(k => k.id !== userToUnkonnect.id));
    } catch (error: any) {
      toast({ title: "Error", description: `Failed to unkonnect. ${error.message}`, variant: "destructive" });
    } finally {
      setProcessingId(null);
      setIsUnkonnectDialogOpen(false);
      setUserToUnkonnect(null);
    }
  };

  const handleViewTree = (konnectedUserId: string) => {
    router.push(`/full-tree/${konnectedUserId}`);
  };


  return (
    <div className="container mx-auto py-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center">
            <KonnectIconLucide className="mr-3 h-8 w-8 text-primary" /> Manage Your Konnections
          </CardTitle>
          <CardDescription>
            Review incoming Konnect requests and view your established konnections.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="requests" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="requests">
                <UserPlus className="mr-2 h-4 w-4" /> Incoming Requests ({filteredRequests.length})
              </TabsTrigger>
              <TabsTrigger value="konnections">
                <Users className="mr-2 h-4 w-4" /> My Konnections ({filteredKonnections.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="requests" className="mt-6">
              <h3 className="text-xl font-semibold mb-4">Pending Konnect Requests</h3>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search requests by sender name..."
                    value={requestSearchTerm}
                    onChange={(e) => setRequestSearchTerm(e.target.value)}
                    className="pl-9 w-full md:w-1/2"
                  />
                </div>
              </div>
              {loadingRequests && <div className="flex justify-center p-4"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>}
              {!loadingRequests && filteredRequests.length === 0 && (
                <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-md">
                  <AlertCircle className="mx-auto h-10 w-10 mb-2" />
                  {requestSearchTerm ? 'No requests match your search.' : 'No pending Konnect requests.'}
                </div>
              )}
              {!loadingRequests && filteredRequests.length > 0 && (
                <div className="space-y-4">
                  {filteredRequests.map(req => (
                    <KonnectRequestCard 
                      key={req.id} 
                      request={req} 
                      onAccept={handleAccept} 
                      onDecline={handleDecline}
                      processingId={processingId}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="konnections" className="mt-6">
              <h3 className="text-xl font-semibold mb-4">Your Accepted Konnections</h3>
               <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search konnections by name..."
                    value={konnectionSearchTerm}
                    onChange={(e) => setKonnectionSearchTerm(e.target.value)}
                    className="pl-9 w-full md:w-1/2"
                  />
                </div>
              </div>
              {loadingKonnections && <div className="flex justify-center p-4"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>}
              {!loadingKonnections && filteredKonnections.length === 0 && (
                <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-md">
                  <AlertCircle className="mx-auto h-10 w-10 mb-2" />
                   {konnectionSearchTerm ? 'No konnections match your search.' : "You haven't made any konnections yet."}
                </div>
              )}
              {!loadingKonnections && filteredKonnections.length > 0 && (
                <div className="space-y-4">
                  {filteredKonnections.map(kon => (
                    <KonnectionCard 
                        key={kon.id} 
                        konnection={kon} 
                        onUnkonnect={promptUnkonnect} 
                        processingId={processingId}
                        onViewTree={handleViewTree}
                    />
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
              <AlertDialogAction onClick={handleUnkonnect} disabled={!!processingId} className="bg-destructive hover:bg-destructive/90">
                {processingId === userToUnkonnect.id ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
                Yes, Unkonnect
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

export default function KonnectionsPage() {
  return (
    <AuthGuard>
      <KonnectionsPageContent />
    </AuthGuard>
  );
}
