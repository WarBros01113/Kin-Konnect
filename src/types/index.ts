
import type { User as FirebaseUser } from 'firebase/auth';
import type { FieldValue, Timestamp } from 'firebase/firestore';

// Badge system types (can also be imported from badgeUtils if preferred)
export type BadgeName = 'Steel' | 'Bronze' | 'Silver' | 'Gold' | 'Diamond' | 'Platinum' | 'None';
export interface BadgeDetails {
  name: BadgeName;
  membersRequired: number;
  icon: string;
  colorClasses: string;
  description: string;
  tier: number;
}


// Base for Profile and FamilyMember to share common fields
export interface BasicPerson {
  id: string;
  name?: string;
  aliasName?: string | null;
  dob?: string; // YYYY-MM-DD or "N/A"
  isDeceased?: boolean;
  deceasedDate?: string; // YYYY-MM-DD or "N/A"
  anniversaryDate?: string; // YYYY-MM-DD or "N/A"
  gender: 'Male' | 'Female' | 'Other' | string;

  fatherId?: string | null;
  motherId?: string | null;
  spouseIds: string[];
  divorcedSpouseIds?: string[]; // IDs of former spouses
  childIds: string[];
  siblingIds: string[];
  siblingOrderIndex?: number;

  // Fields from Profile that might be useful for display on node
  email?: string;
  nativePlace?: string | null;
  currentPlace?: string | null;
  religion?: string | null;
  caste?: string | null;
  stories?: string | null;
  position?: { x: number; y: number };
  userId: string; // Should be ownerId or selfId
  isAlternateProfile?: boolean;
  relationship?: string; // User-centric relationship to the owner, for role matching

  createdAt?: FieldValue | Timestamp | null; // For Firestore write vs read
  updatedAt?: FieldValue | Timestamp | null; // For Firestore write vs read
  isPublic?: boolean; // Added for privacy mode
}


export interface Profile extends BasicPerson {
  email: string;
  phoneNumber?: string;
  description?: string;
  isAdmin?: boolean;
  hasAgreedToTerms?: boolean;
  // badgesEarned?: Record<BadgeName, string>; // Optional: To store earned dates, not implementing for now
}

export interface FamilyMember extends BasicPerson {
  // userId is inherited and refers to the owner of this family member record.
  // isPublic is typically managed at the Profile level for the entire tree's discoverability
}

// Input for the FamilyMemberForm when creating a NEW member
export interface FamilyMemberFormData {
  name: string;
  aliasName?: string | null;
  dob: string;
  isDeceased?: boolean;
  deceasedDate?: string; // YYYY-MM-DD or "N/A"
  anniversaryDate?: string; // YYYY-MM-DD or "N/A"
  gender: 'Male' | 'Female' | 'Other' | string;
  siblingOrderIndex?: number;
  stories?: string | null;
  nativePlace?: string | null;
  currentPlace?: string | null;
  religion?: string | null;
  caste?: string | null;
}

export interface NewMemberStructuralLinks {
  fatherId?: string | null;
  motherId?: string | null;
  spouseIds: string[];
  childIds: string[];
  siblingIds: string[];
}

export interface AddMemberFirestoreOperations {
  updateAsSpouseTo: string[];
  addAsChildToParentIds: string[];
  retroactivelyLinkChildrenOfAnchorToNewSpouse?: string | null;
  linkAsSiblingTo: string[];
}


export interface FamilyNodeData {
  id: string;
  name: string;
  aliasName?: string | null;
  relationship: string;
  dob?: string;
  gender?: 'Male' | 'Female' | 'Other' | string | null;
  isDeceased?: boolean;
  deceasedDate?: string;
  anniversaryDate?: string;
  isDivorcedFromCurrentRoot?: boolean;
  isRoot?: boolean;
  nodeCategory: 'root' | 'parent' | 'sibling' | 'spouse' | 'child' | 'other';
  siblingOrderIndex?: number;
  spouseOrder?: number;
  parentSpouseOrder?: number;
  createdAt?: FieldValue | Timestamp | null;
}

export type User = FirebaseUser;

export interface AdminUserView extends Profile {
  // any additional admin-specific view fields can go here
}

export interface MemberWithGeneration extends BasicPerson {
  generation: number | null; // null if generation couldn't be determined
}

// For "Find Relationship" feature
export interface RelationshipPathStep {
  personId: string;
  personName: string;
  connectionToPrevious: string;
  generationRelativeToStart: number;
}

export interface FindPathResult {
  path: RelationshipPathStep[];
  pathFound: boolean;
  generationGap?: number;
}

// For AI flow to describe relationship
export interface AiRelationshipPathStep {
    personName: string;
    connectionToPreviousPerson: string;
}

// For Discovery Results - simplified person info from backend
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

// For Discovery Results - individual pair details
export interface MatchedIndividualPairClient {
  person1Id: string;
  person1Name: string;
  person1Details: string;
  person2Id: string;
  person2Name: string;
  person2Details: string;
  pairScore: number;
  matchReasons: string[];
}

// For Calendar Events
export interface CalendarEvent {
  id: string;
  date: Date;
  type: 'birthday' | 'anniversary' | 'death-anniversary';
  title: string;
  description?: string;
  personId1: string;
  personName1: string;
  personId2?: string;
  personName2?: string;
  originalEventDate: string;
}

// For Konnect System
export interface KonnectRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderProfilePhotoUrl?: string;
  timestamp: Timestamp;
  status: 'pending';
}

export interface Konnection {
  id: string;
  konnectedUserId: string;
  name: string;
  profilePhotoUrl?: string;
  konnectedAt: Timestamp;
}

export type KonnectionStatus =
  | 'not_konnected'
  | 'request_sent'
  | 'request_received'
  | 'konnected';
