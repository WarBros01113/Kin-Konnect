
// Simplified types for the Cloud Function
import type { Timestamp } from 'firebase-admin/firestore'; // Corrected import path

export interface Profile {
  id: string;
  name?: string;
  aliasName?: string | null;
  email?: string;
  dob?: string; // YYYY-MM-DD or "N/A"
  isDeceased?: boolean;
  nativePlace?: string | null;
  currentPlace?: string | null;
  religion?: string | null;
  caste?: string | null;
  relationship?: "Self";
  gender?: 'Male' | 'Female' | 'Other' | string;
  fatherId?: string | null;
  motherId?: string | null;
  spouseIds?: string[];
  divorcedSpouseIds?: string[];
  childIds?: string[];
  siblingIds?: string[];
  siblingOrderIndex?: number;
  isAdmin?: boolean;
  isAlternateProfile?: boolean;
  isPublic?: boolean;
  hasAgreedToTerms?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface FamilyMember {
  id: string;
  userId?: string;
  name?: string;
  aliasName?: string | null;
  dob?: string; // YYYY-MM-DD or "N/A"
  isDeceased?: boolean;
  nativePlace?: string | null;
  currentPlace?: string | null;
  religion?: string | null;
  caste?: string | null;
  relationship?: string;
  gender?: 'Male' | 'Female' | 'Other' | string;
  fatherId?: string | null;
  motherId?: string | null;
  spouseIds?: string[];
  divorcedSpouseIds?: string[];
  childIds?: string[];
  siblingIds?: string[];
  siblingOrderIndex?: number;
  isAlternateProfile?: boolean;
  isPublic?: boolean; // Though typically not directly used on FamilyMember, keep for consistency if needed
  stories?: string | null;
  createdAt?: any;
  updatedAt?: any;
}

export interface ComparablePerson {
  id: string;
  name: string; // Normalized FIRST name
  aliasName: string | undefined; // Normalized alias name
  dob: string | undefined;
  isDeceased: boolean;
  nativePlace: string | undefined;
  currentPlace: string | undefined;
  religion: string | undefined;
  caste: string | undefined;
  relationshipToOwner: string | undefined;
  gender: string | undefined;
  isAlternateProfile: boolean;
  isPublic?: boolean;
  originalData: Profile | FamilyMember;
}

export interface MatchedIndividualPair {
  person1Id: string;
  person1Name: string;
  person1Details: string;
  person2Id: string;
  person2Name: string;
  person2Details: string;
  pairScore: number;
  matchReasons: string[];
}

export interface MatchedMemberInfo {
  id: string;
  name: string;
  aliasName?: string | null;
  dob?: string;
  gender?: 'Male' | 'Female' | 'Other' | string;
  relationshipToTheirOwner?: string;
  isDeceased?: boolean;
  nativePlace?: string | null;
  currentPlace?: string | null;
  religion?: string | null;
  caste?: string | null;
}

export interface MatchedTreeResult {
  matchedUserId: string;
  matchedUserName?: string;
  score: number;
  totalMembersInTree: number;
  detailedContributingPairs: MatchedIndividualPair[];
  myMatchedPersons: MatchedMemberInfo[];
  otherMatchedPersons: MatchedMemberInfo[];
}

// Define and export Konnection type for Cloud Functions
export interface Konnection {
  id: string; // Document ID, which is the konnectedUserId
  konnectedUserId: string; // Stored field, typically same as id if structure is simple
  name: string; // Name of the konnected user
  profilePhotoUrl?: string; // Optional
  konnectedAt: Timestamp; // Firestore Timestamp
}
