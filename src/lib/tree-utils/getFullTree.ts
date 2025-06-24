
import { getUserProfile, getFamilyMembers } from "@/lib/firebase/firestore";
import type { Profile, FamilyMember, BasicPerson } from "@/types";

const COLORS = [
  // Existing spouse colors from globals.css (first 10 as an example)
  "hsl(var(--kin-spouse-0-border-h), var(--kin-spouse-0-border-s), var(--kin-spouse-0-border-l))", // Accent
  "hsl(var(--kin-spouse-1-border-h), var(--kin-spouse-1-border-s), var(--kin-spouse-1-border-l))", // Orange
  "hsl(var(--kin-spouse-2-border-h), var(--kin-spouse-2-border-s), var(--kin-spouse-2-border-l))", // Purple
  "hsl(var(--kin-spouse-3-border-h), var(--kin-spouse-3-border-s), var(--kin-spouse-3-border-l))", // Teal
  "hsl(var(--kin-spouse-4-border-h), var(--kin-spouse-4-border-s), var(--kin-spouse-4-border-l))", // Pink
  "hsl(var(--kin-spouse-5-border-h), var(--kin-spouse-5-border-s), var(--kin-spouse-5-border-l))", // Yellow
  "hsl(var(--kin-spouse-6-border-h), var(--kin-spouse-6-border-s), var(--kin-spouse-6-border-l))", // Cyan
  "hsl(var(--kin-spouse-7-border-h), var(--kin-spouse-7-border-s), var(--kin-spouse-7-border-l))", // Lime
  "hsl(var(--kin-spouse-8-border-h), var(--kin-spouse-8-border-s), var(--kin-spouse-8-border-l))", // Indigo
  "hsl(var(--kin-spouse-9-border-h), var(--kin-spouse-9-border-s), var(--kin-spouse-9-border-l))", // Coral
  // ... add more if you have more than 10 defined, up to 20
  "hsl(var(--kin-spouse-child-border))" // Default for spouses beyond 20 or if not matched
];


interface TreeNode extends BasicPerson {
  children: TreeNode[];
  generationLevel: number;
  color?: string;
  spouseGroupIndex?: number; 
}

function addChildOnce(parentNode: TreeNode, childNode: TreeNode) {
    if (!parentNode.children.some(c => c.id === childNode.id)) {
        parentNode.children.push(childNode);
    }
}

const buildTreeWithDetails = (membersArray: BasicPerson[], rootUserId: string): TreeNode | null => {
    const memberMap = new Map<string, TreeNode>();

    membersArray.forEach(member => {
        memberMap.set(member.id, {
            ...member, 
            children: [],
            generationLevel: -Infinity, 
            color: undefined,
            spouseGroupIndex: undefined,
        });
    });

    const rootNode = memberMap.get(rootUserId);
    if (!rootNode) {
        console.error(`Root user with ID ${rootUserId} not found in members map.`);
        return null;
    }

    memberMap.forEach(personNodeAsChild => { 
        if (personNodeAsChild.fatherId) {
            const fatherNode = memberMap.get(personNodeAsChild.fatherId);
            if (fatherNode) {
                addChildOnce(fatherNode, personNodeAsChild); 
            }
        }
        if (personNodeAsChild.motherId) {
            const motherNode = memberMap.get(personNodeAsChild.motherId);
            if (motherNode) {
                addChildOnce(motherNode, personNodeAsChild); 
            }
        }
    });

    rootNode.generationLevel = 0;
    const queue: TreeNode[] = [rootNode];
    const visitedForLeveling = new Set<string>([rootNode.id]); // Used for BFS leveling

    let head = 0;
    while (head < queue.length) {
        const currentPerson = queue[head++];

        for (const childNode of currentPerson.children) {
            const mappedChildNode = memberMap.get(childNode.id);
            if (!mappedChildNode) continue;

            if (!visitedForLeveling.has(mappedChildNode.id)) {
                mappedChildNode.generationLevel = currentPerson.generationLevel + 1;
                visitedForLeveling.add(mappedChildNode.id);
                
                const otherParentId = mappedChildNode.fatherId === currentPerson.id ? mappedChildNode.motherId : mappedChildNode.fatherId;

                if (otherParentId && currentPerson.spouseIds && currentPerson.spouseIds.includes(otherParentId)) {
                    const spouseIndex = currentPerson.spouseIds.indexOf(otherParentId);
                    mappedChildNode.spouseGroupIndex = spouseIndex;
                    mappedChildNode.color = COLORS[spouseIndex % COLORS.length];
                }
                queue.push(mappedChildNode);
            }
        }
    }
    return rootNode;
};

export async function getFullTree(userId: string): Promise<TreeNode | null> {
  const profile = await getUserProfile(userId);
  if (!profile) {
    console.error("Profile not found for getFullTree:", userId);
    return null;
  }
  const familyMembers = await getFamilyMembers(userId);

  const allRelevantPeople: BasicPerson[] = [
    profile,
    ...familyMembers.filter(fm => !fm.isAlternateProfile) 
  ];
  
  return buildTreeWithDetails(allRelevantPeople, profile.id);
}
