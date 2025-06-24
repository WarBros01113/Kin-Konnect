
export type BadgeName = 'Steel' | 'Bronze' | 'Silver' | 'Gold' | 'Diamond' | 'Platinum' | 'None';

export interface BadgeDetails {
  name: BadgeName;
  membersRequired: number;
  icon: string; // Emoji
  colorClasses: string; // Tailwind classes for background and text color
  description: string; // e.g., "Grey Steel"
  tier: number; // To compare badge levels
}

// Sorted by membersRequired DESCENDING for getBadgeForMemberCount
// Tier is assigned such that higher tier number means better badge
export const BADGE_LEVELS: BadgeDetails[] = [
  { name: 'Platinum', membersRequired: 3000, icon: '⚫', colorClasses: 'bg-gray-800 text-white', description: 'Black Platinum', tier: 6 },
  { name: 'Diamond', membersRequired: 2000, icon: '💎', colorClasses: 'bg-sky-400 text-sky-800', description: 'Blue Diamond', tier: 5 },
  { name: 'Gold', membersRequired: 1500, icon: '🟡', colorClasses: 'bg-yellow-400 text-yellow-800', description: 'Gold', tier: 4 },
  { name: 'Silver', membersRequired: 1000, icon: '⚪', colorClasses: 'bg-gray-500 text-white', description: 'Silver', tier: 3 },
  { name: 'Bronze', membersRequired: 500, icon: '🟤', colorClasses: 'bg-yellow-600 text-white', description: 'Bronze', tier: 2 },
  { name: 'Steel', membersRequired: 100, icon: '⚙️', colorClasses: 'bg-slate-400 text-slate-800', description: 'Grey Steel', tier: 1 },
].sort((a, b) => b.membersRequired - a.membersRequired);


export const NO_BADGE: BadgeDetails = {
  name: 'None',
  membersRequired: 0,
  icon: '🌱', // Seedling for new user or no badge
  colorClasses: 'bg-muted text-muted-foreground',
  description: 'New Kin',
  tier: 0,
};

export function getBadgeForMemberCount(count: number): BadgeDetails {
  for (const badge of BADGE_LEVELS) {
    if (count >= badge.membersRequired) {
      return badge;
    }
  }
  return NO_BADGE;
}

export function getNextBadgeDetails(currentCount: number): { nextBadge: BadgeDetails; membersNeeded: number; progressPercentage: number } | null {
  // Ensure BADGE_LEVELS is sorted ascending by membersRequired for finding the *next* one
  const ascendingBadges = [...BADGE_LEVELS].sort((a, b) => a.membersRequired - b.membersRequired);
  
  for (const badge of ascendingBadges) {
    if (currentCount < badge.membersRequired) {
      // Calculate previous badge's requirement for progress calculation
      let previousBadgeRequirement = 0;
      const currentBadge = getBadgeForMemberCount(currentCount); // Get the current badge correctly
      if (currentBadge.name !== 'None') {
          // Find the requirement of the *actual* current badge
          const actualCurrentBadgeDetails = BADGE_LEVELS.find(b => b.name === currentBadge.name);
          if (actualCurrentBadgeDetails) {
            previousBadgeRequirement = actualCurrentBadgeDetails.membersRequired;
          }
      }
       // If current badge is "None", previous requirement is 0.
      if (currentBadge.name === 'None' && badge.name === 'Steel') {
          previousBadgeRequirement = 0;
      }


      const membersNeeded = badge.membersRequired - currentCount;
      const totalRangeForNextBadge = badge.membersRequired - previousBadgeRequirement;
      const progressInCurrentRange = currentCount - previousBadgeRequirement;
      
      const progressPercentage = totalRangeForNextBadge > 0 
          ? (progressInCurrentRange / totalRangeForNextBadge) * 100 
          : (currentCount >= badge.membersRequired ? 100 : 0); // If somehow currentCount >= next badge, show 100%

      return {
        nextBadge: badge,
        membersNeeded,
        progressPercentage: Math.min(100, Math.max(0, progressPercentage)),
      };
    }
  }
  return null; // All badges earned
}
