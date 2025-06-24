
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { BasicPerson } from "@/types";
import { Timestamp } from 'firebase/firestore';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateAge(dob: string | Date | undefined | null): number | null {
  if (dob === "N/A" || !dob) {
    return null;
  }
  try {
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) {
      console.warn(`Invalid DOB format encountered in calculateAge: ${dob}`);
      return null;
    }
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age < 0 ? 0 : age;
  } catch (error: any) {
    console.error(`Error calculating age for DOB: ${dob}`, {errorMessage: error.message});
    return null;
  }
}

// Helper to convert file to data URI
export const fileToDataUri = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Sorts an array of BasicPerson objects by sibling criteria.
 * The sorting order is:
 * 1. Sibling Order Index (siblingOrderIndex): Smaller index means older/earlier.
 * 2. Date of Birth (dob): Eldest first (earlier date).
 * 3. Creation Timestamp (createdAt): Earlier timestamp means older/created earlier.
 * 4. Name (alphabetical): Tie-breaker.
 * @param people Array of people to sort.
 * @param ascending If true, sorts "older" to "younger".
 * @returns A new sorted array.
 */
export function sortPeopleByAge<T extends BasicPerson>(people: T[], ascending: boolean = true): T[] {
  return [...people].sort((a, b) => {
    const factor = ascending ? 1 : -1;

    // --- 1. Compare by Sibling Order Index (siblingOrderIndex) ---
    const orderA = a.siblingOrderIndex;
    const orderB = b.siblingOrderIndex;
    const hasOrderA = typeof orderA === 'number';
    const hasOrderB = typeof orderB === 'number';

    if (hasOrderA && hasOrderB) {
      const orderComparison = orderA - orderB;
      if (orderComparison !== 0) return orderComparison * factor;
    } else if (hasOrderA) {
      return -1 * factor;
    } else if (hasOrderB) {
      return 1 * factor;
    }

    // --- 2. Compare by Date of Birth (dob) ---
    const dateA = a.dob && a.dob !== "N/A" ? new Date(a.dob) : null;
    const dateB = b.dob && b.dob !== "N/A" ? new Date(b.dob) : null;
    const isValidDateA = dateA && !isNaN(dateA.getTime());
    const isValidDateB = dateB && !isNaN(dateB.getTime());

    if (isValidDateA && isValidDateB) {
      const dobComparison = dateA.getTime() - dateB.getTime();
      if (dobComparison !== 0) return dobComparison * factor;
    } else if (isValidDateA) {
      return -1 * factor;
    } else if (isValidDateB) {
      return 1 * factor;
    }

    // --- 3. Compare by Creation Timestamp (createdAt) ---
    let tsA_ms: number | null = null;
    if (a.createdAt) {
        if (a.createdAt instanceof Timestamp) tsA_ms = a.createdAt.toMillis();
        // @ts-ignore 
        else if (typeof (a.createdAt as any).toDate === 'function') tsA_ms = (a.createdAt as any).toDate().getTime();
        // @ts-ignore 
        else if (typeof (a.createdAt as any).seconds === 'number') tsA_ms = new Timestamp((a.createdAt as any).seconds, (a.createdAt as any).nanoseconds || 0).toMillis();
    }

    let tsB_ms: number | null = null;
    if (b.createdAt) {
        if (b.createdAt instanceof Timestamp) tsB_ms = b.createdAt.toMillis();
        // @ts-ignore
        else if (typeof (b.createdAt as any).toDate === 'function') tsB_ms = (b.createdAt as any).toDate().getTime();
        // @ts-ignore
        else if (typeof (b.createdAt as any).seconds === 'number') tsB_ms = new Timestamp((b.createdAt as any).seconds, (b.createdAt as any).nanoseconds || 0).toMillis();
    }
    
    if (tsA_ms !== null && tsB_ms !== null) {
      if (tsA_ms !== tsB_ms) return (tsA_ms - tsB_ms) * factor;
    } else if (tsA_ms !== null) {
      return -1 * factor;
    } else if (tsB_ms !== null) {
      return 1 * factor;
    }
    
    // --- 4. Compare by Name (alphabetical) as a final tie-breaker ---
    const nameA = a.name?.toLowerCase() || '';
    const nameB = b.name?.toLowerCase() || '';
    return nameA.localeCompare(nameB);
  });
}

/**
 * Sorts spouses. Priority: Anniversary Date -> DOB -> Creation Time -> Name.
 * @param people Array of spouse objects to sort.
 * @param ascending If true, sorts earlier dates/older people first.
 * @returns A new sorted array of spouses.
 */
export function sortSpousesByOrder<T extends BasicPerson>(people: T[], ascending: boolean = true): T[] {
  return [...people].sort((a, b) => {
    const factor = ascending ? 1 : -1;

    // --- 1. Compare by Anniversary Date ---
    const annivDateA = a.anniversaryDate && a.anniversaryDate !== "N/A" ? new Date(a.anniversaryDate).getTime() : null;
    const annivDateB = b.anniversaryDate && b.anniversaryDate !== "N/A" ? new Date(b.anniversaryDate).getTime() : null;

    if (annivDateA !== null && annivDateB !== null) {
      if (annivDateA !== annivDateB) return (annivDateA - annivDateB) * factor;
    } else if (annivDateA !== null) {
      return -1 * factor; // a has date, b does not, a comes first
    } else if (annivDateB !== null) {
      return 1 * factor;  // b has date, a does not, b comes first
    }

    // --- 2. Compare by Date of Birth (dob) ---
    const dateA = a.dob && a.dob !== "N/A" ? new Date(a.dob).getTime() : null;
    const dateB = b.dob && b.dob !== "N/A" ? new Date(b.dob).getTime() : null;

    if (dateA !== null && dateB !== null) {
      if (dateA !== dateB) return (dateA - dateB) * factor;
    } else if (dateA !== null) {
      return -1 * factor;
    } else if (dateB !== null) {
      return 1 * factor;
    }
    
    // --- 3. Compare by Creation Timestamp (createdAt) ---
    let tsA_ms: number | null = null;
    if (a.createdAt) {
        if (a.createdAt instanceof Timestamp) tsA_ms = a.createdAt.toMillis();
        // @ts-ignore
        else if (typeof (a.createdAt as any).toDate === 'function') tsA_ms = (a.createdAt as any).toDate().getTime();
        // @ts-ignore
        else if (typeof (a.createdAt as any).seconds === 'number') tsA_ms = new Timestamp((a.createdAt as any).seconds, (a.createdAt as any).nanoseconds || 0).toMillis();
    }

    let tsB_ms: number | null = null;
    if (b.createdAt) {
        if (b.createdAt instanceof Timestamp) tsB_ms = b.createdAt.toMillis();
        // @ts-ignore
        else if (typeof (b.createdAt as any).toDate === 'function') tsB_ms = (b.createdAt as any).toDate().getTime();
        // @ts-ignore
        else if (typeof (b.createdAt as any).seconds === 'number') tsB_ms = new Timestamp((b.createdAt as any).seconds, (b.createdAt as any).nanoseconds || 0).toMillis();
    }
    
    if (tsA_ms !== null && tsB_ms !== null) {
      if (tsA_ms !== tsB_ms) return (tsA_ms - tsB_ms) * factor;
    } else if (tsA_ms !== null) {
      return -1 * factor;
    } else if (tsB_ms !== null) {
      return 1 * factor;
    }
    
    // --- 4. Compare by Name (alphabetical) as a final tie-breaker ---
    const nameA = a.name?.toLowerCase() || '';
    const nameB = b.name?.toLowerCase() || '';
    return nameA.localeCompare(nameB) * factor;
  });
}


export function sortPeopleByCreation<T extends BasicPerson>(people: T[], ascending: boolean = true): T[] {
  return [...people].sort((a, b) => {
    const factor = ascending ? 1 : -1;

    let tsA_ms: number | null = null;
    if (a.createdAt) {
        if (a.createdAt instanceof Timestamp) tsA_ms = a.createdAt.toMillis();
        // @ts-ignore 
        else if (typeof (a.createdAt as any).toDate === 'function') tsA_ms = (a.createdAt as any).toDate().getTime();
        // @ts-ignore 
        else if (typeof (a.createdAt as any).seconds === 'number') tsA_ms = new Timestamp((a.createdAt as any).seconds, (a.createdAt as any).nanoseconds || 0).toMillis();
    }

    let tsB_ms: number | null = null;
    if (b.createdAt) {
        if (b.createdAt instanceof Timestamp) tsB_ms = b.createdAt.toMillis();
        // @ts-ignore
        else if (typeof (b.createdAt as any).toDate === 'function') tsB_ms = (b.createdAt as any).toDate().getTime();
        // @ts-ignore
        else if (typeof (b.createdAt as any).seconds === 'number') tsB_ms = new Timestamp((b.createdAt as any).seconds, (b.createdAt as any).nanoseconds || 0).toMillis();
    }
    
    const hasTsA = tsA_ms !== null;
    const hasTsB = tsB_ms !== null;

    if (hasTsA && hasTsB) {
      const tsComparison = tsA_ms! - tsB_ms!;
      if (tsComparison !== 0) return tsComparison * factor;
    } else if (hasTsA) {
      return -1 * factor;
    } else if (hasTsB) {
      return 1 * factor;
    }

    // Fallback to name if timestamps are missing or identical
    const nameA = a.name?.toLowerCase() || '';
    const nameB = b.name?.toLowerCase() || '';
    return nameA.localeCompare(nameB) * factor;
  });
}

export function getOrdinal(n: number): string {
  if (n <= 0) return String(n); // Or handle as an error/special case
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
