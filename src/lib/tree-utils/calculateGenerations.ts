
import { getUserProfile, getFamilyMembers } from "@/lib/firebase/firestore";
import type { Profile, FamilyMember, BasicPerson, MemberWithGeneration } from "@/types";

export async function getFamilyWithGenerations(userId: string): Promise<MemberWithGeneration[]> {
  const userProfileData = await getUserProfile(userId);
  if (!userProfileData) {
    console.error("User profile not found for generation calculation:", userId);
    return [];
  }

  const familyMembersData = await getFamilyMembers(userId);

  const allPeople: BasicPerson[] = [userProfileData, ...familyMembersData.filter(fm => !fm.isAlternateProfile)];
  const peopleMap = new Map<string, BasicPerson>(allPeople.map(p => [p.id, p]));

  // Initialize MemberWithGeneration objects, setting generation to null initially
  const membersWithGeneration = new Map<string, MemberWithGeneration>(
    allPeople.map(p => [p.id, { ...p, generation: null }])
  );

  const rootUserNode = membersWithGeneration.get(userId);
  if (!rootUserNode) {
    console.error("Root user node not found in membersWithGeneration map.");
    return [];
  }

  // Set the logged-in user as Generation 0
  rootUserNode.generation = 0;

  const queue: string[] = [userId]; // Start BFS with the logged-in user
  const visited = new Set<string>([userId]); // Keep track of visited nodes

  let head = 0;
  while (head < queue.length) {
    const currentPersonId = queue[head++];
    const currentPersonNode = membersWithGeneration.get(currentPersonId);

    if (!currentPersonNode || currentPersonNode.generation === null) {
      console.warn(`Skipping node ${currentPersonId} due to missing data or unassigned generation.`);
      continue;
    }

    const currentGen = currentPersonNode.generation;

    // 1. Process Parents (Generation = currentGen - 1)
    const parentIdsToProcess = [currentPersonNode.fatherId, currentPersonNode.motherId].filter(Boolean) as string[];
    for (const parentId of parentIdsToProcess) {
      const parentNode = membersWithGeneration.get(parentId);
      // Only update if not visited or if this path offers a generation assignment (should be primary assignment)
      if (parentNode && parentNode.generation === null) { 
        parentNode.generation = currentGen - 1;
        if (!visited.has(parentId)) {
          queue.push(parentId);
          visited.add(parentId);
        }
      }
    }

    // 2. Process Children (Generation = currentGen + 1)
    const childIdsToProcess = currentPersonNode.childIds || [];
    for (const childId of childIdsToProcess) {
      const childNode = membersWithGeneration.get(childId);
      if (childNode && childNode.generation === null) {
        childNode.generation = currentGen + 1;
        if (!visited.has(childId)) {
          queue.push(childId);
          visited.add(childId);
        }
      }
    }

    // 3. Process Spouses (Generation = currentGen)
    const spouseIdsToProcess = currentPersonNode.spouseIds || [];
    for (const spouseId of spouseIdsToProcess) {
      const spouseNode = membersWithGeneration.get(spouseId);
      if (spouseNode && spouseNode.generation === null) {
        spouseNode.generation = currentGen;
        if (!visited.has(spouseId)) {
          queue.push(spouseId);
          visited.add(spouseId);
        }
      }
    }

    // 4. Process Siblings (Generation = currentGen)
    const siblingIdsToProcess = currentPersonNode.siblingIds || [];
    for (const siblingId of siblingIdsToProcess) {
      const siblingNode = membersWithGeneration.get(siblingId);
      if (siblingNode && siblingNode.generation === null) {
        siblingNode.generation = currentGen;
        if (!visited.has(siblingId)) {
          queue.push(siblingId);
          visited.add(siblingId);
        }
      }
    }
  }
  
  return Array.from(membersWithGeneration.values());
}
