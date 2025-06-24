
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/providers/AuthProvider';
import { getFamilyWithGenerations } from '@/lib/tree-utils/calculateGenerations';
import type { MemberWithGeneration } from '@/types';
import { Loader2, Users, CalendarDays, Milestone, ArrowDownUp, Search as SearchIcon } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { calculateAge } from '@/lib/utils';

function FamilyListPageContent() {
  const { user: authUser } = useAuth();
  const [members, setMembers] = useState<MemberWithGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (authUser) {
      setLoading(true);
      setError(null);
      getFamilyWithGenerations(authUser.uid)
        .then(data => {
          setMembers(data);
        })
        .catch(err => {
          console.error("Error fetching family list with generations:", err);
          setError(err.message || "Could not load family data.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [authUser]);

  const filteredAndSortedMembers = useMemo(() => {
    let processedMembers = members;

    if (searchTerm.trim()) {
      processedMembers = processedMembers.filter(member =>
        member.name?.toLowerCase().includes(searchTerm.trim().toLowerCase())
      );
    }
    // Primary sort is by generation, then by DOB (oldest first if same gen), then by name
    return processedMembers.sort((a, b) => {
      const genA = a.generation === null ? Infinity : a.generation;
      const genB = b.generation === null ? Infinity : b.generation;
      if (genA !== genB) {
        return genA - genB;
      }
      const dateA = a.dob && a.dob !== "N/A" ? new Date(a.dob).getTime() : Infinity;
      const dateB = b.dob && b.dob !== "N/A" ? new Date(b.dob).getTime() : Infinity;
      if (dateA !== dateB) {
        return dateA - dateB;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [members, searchTerm]);

  const groupedByGeneration = useMemo(() => {
    const groups: { [key: string]: MemberWithGeneration[] } = {};
    filteredAndSortedMembers.forEach(member => {
      const genKey = member.generation === null ? "Unknown Generation" : `Generation ${member.generation}`;
      if (!groups[genKey]) {
        groups[genKey] = [];
      }
      groups[genKey].push(member);
    });
    // Sort generation groups numerically (e.g., -2, -1, 0, 1, 2), "Unknown" last
    return Object.entries(groups).sort(([keyA], [keyB]) => {
        if (keyA === "Unknown Generation") return 1;
        if (keyB === "Unknown Generation") return -1;
        // Extract number from "Generation X"
        const numA = parseInt(keyA.replace("Generation ", ""), 10);
        const numB = parseInt(keyB.replace("Generation ", ""), 10);
        return numA - numB;
    });
  }, [filteredAndSortedMembers]);


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading family members by generation...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-4">Error Loading Data</h1>
        <p className="text-destructive-foreground bg-destructive/20 p-3 rounded-md">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center">
            <Users className="mr-3 h-8 w-8 text-primary" /> Family Members by Generation
          </CardTitle>
          <CardDescription>
            Browse all connected family members, grouped by their generation relative to you (Generation 0).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-base"
              />
            </div>
          </div>

          {groupedByGeneration.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {searchTerm ? "No members match your search." : "No family members found. Start by adding members to your tree."}
            </p>
          ) : (
            <Accordion type="multiple" defaultValue={groupedByGeneration.map(([key]) => key)} className="w-full">
              {groupedByGeneration.map(([generationKey, generationMembers]) => (
                <AccordionItem value={generationKey} key={generationKey}>
                  <AccordionTrigger className="text-xl font-semibold hover:no-underline text-primary py-3 px-2">
                    <div className="flex items-center">
                        <Milestone className="mr-3 h-6 w-6" /> {generationKey} ({generationMembers.length} members)
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[40%]">Name</TableHead>
                            <TableHead>Date of Birth</TableHead>
                            <TableHead>Age / Status</TableHead>
                            <TableHead>Gender</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {generationMembers.map((member) => {
                            const age = member.dob && member.dob !== "N/A" ? calculateAge(member.dob) : null;
                            const displayDob = member.dob === "N/A" ? "N/A" : (member.dob ? new Date(member.dob).toLocaleDateString() : "N/A");
                            let ageStatus = "";
                            if (member.isDeceased) {
                                ageStatus = "Deceased";
                            } else if (age !== null) {
                                ageStatus = `${age} years`;
                            } else {
                                ageStatus = "N/A";
                            }

                            return (
                              <TableRow key={member.id}>
                                <TableCell className="font-medium">{member.name || 'Unnamed'}</TableCell>
                                <TableCell>{displayDob}</TableCell>
                                <TableCell>{ageStatus}</TableCell>
                                <TableCell>{member.gender || 'N/A'}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function FamilyListPage() {
  return (
    <AuthGuard>
      <FamilyListPageContent />
    </AuthGuard>
  );
}

