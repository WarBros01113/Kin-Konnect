
import type {Profile, FamilyMember, ComparablePerson} from "./types";

export interface ILogger {
  info: (message: any, ...optionalParams: any[]) => void;
  warn: (message: any, ...optionalParams: any[]) => void;
  error: (message: any, ...optionalParams: any[]) => void;
  debug: (message: any, ...optionalParams: any[]) => void;
}

const defaultLogger: ILogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

const TREE_SIMILARITY_THRESHOLD = 6.5;
const MIN_INDIVIDUAL_PAIR_SCORE_THRESHOLD = 6.5;


export function calculateAge(dob: string | Date | undefined, logger: ILogger = defaultLogger): number | null {
  if (dob === "N/A" || !dob) {
    return null;
  }
  try {
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) {
      // logger.warn(`Invalid DOB format encountered: ${dob}`);
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
    logger.error(`Error calculating age for DOB: ${dob}`, {errorMessage: error.message});
    return null;
  }
}

export function normalizePerson(person: FamilyMember | Profile, logger: ILogger = defaultLogger): ComparablePerson {
  const fullName = (person.name || "").trim();
  const firstNameOnly = (fullName.split(' ')[0] || "").toLowerCase(); // Use first word for name matching
  const aliasName = (person.aliasName || "").trim().toLowerCase() || undefined;

  const dob = person.dob;
  const isDeceased = !!person.isDeceased;

  // Normalize places by trimming, lowercasing, and removing all whitespace
  const nativePlace = (person.nativePlace || "").trim().toLowerCase().replace(/\s+/g, '') || undefined;
  const currentPlace = (person.currentPlace || "").trim().toLowerCase().replace(/\s+/g, '') || undefined;

  const religion = (person.religion || "").trim().toLowerCase() || undefined;
  const caste = (person.caste || "").trim().toLowerCase() || undefined;
  const relationshipToOwner = (person.relationship || "").trim().toLowerCase() || undefined;
  const gender = (person.gender || "").trim().toLowerCase() || undefined;
  const isAlternateProfileValue = !!person.isAlternateProfile;


  if (!firstNameOnly) {
    logger.debug(`Person with ID ${person.id} has no name, first name will be normalized to empty string.`);
  }
  return {
    id: person.id,
    name: firstNameOnly, // Use normalized first name for primary matching
    aliasName,
    dob,
    isDeceased,
    nativePlace,
    currentPlace,
    religion,
    caste,
    relationshipToOwner,
    gender,
    isAlternateProfile: isAlternateProfileValue,
    originalData: person, // Keep original data for display and context
  };
}

export function levenshteinDistance(s1: string, s2: string): number {
  if (!s1 && !s2) return 0;
  if (!s1) return s2.length;
  if (!s2) return s1.length;

  const track = Array(s2.length + 1).fill(null).map(() =>
    Array(s1.length + 1).fill(null));
  for (let i = 0; i <= s1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= s2.length; j += 1) {
    track[j][0] = j;
  }
  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator, // substitution
      );
    }
  }
  return track[s2.length][s1.length];
}


export function areTreesSimilar(
  tree1: ComparablePerson[],
  tree2: ComparablePerson[],
  logger: ILogger = defaultLogger
): {isSimilar: boolean, score: number, contributingPairs: Array<{person1: ComparablePerson, person2: ComparablePerson, pairScore: number, reasons: string[]}>} {

  logger.debug(`[areTreesSimilar] INIT. Tree1 size: ${tree1?.length || 0}, Tree2 size: ${tree2?.length || 0}. USING THRESHOLDS: TREE_SIMILARITY_THRESHOLD=${TREE_SIMILARITY_THRESHOLD}, MIN_INDIVIDUAL_PAIR_SCORE_THRESHOLD=${MIN_INDIVIDUAL_PAIR_SCORE_THRESHOLD}`);


  if (!tree1 || !tree2 || tree1.length === 0 || tree2.length === 0) {
    logger.debug("[areTreesSimilar] One or both trees are empty or null, cannot compare.");
    return {isSimilar: false, score: 0, contributingPairs: []};
  }

  let totalTreeScore = 0;
  const contributingPairsDetails: Array<{person1: ComparablePerson, person2: ComparablePerson, pairScore: number, reasons: string[]}> = [];
  const matchedTree2Indices = new Set<number>();

  for (const p1 of tree1) {
    if (p1.isAlternateProfile) {
      logger.debug(`[areTreesSimilar] Skipping P1 (ID: ${p1.id || "unknown"}, Name: ${p1.originalData.name}) from tree1 because it is an alternate profile.`);
      continue;
    }
    if (!p1.name) { // p1.name is now first name
      logger.debug(`[areTreesSimilar] Skipping P1 (ID: ${p1.id || "unknown"}) due to missing first name.`);
      continue;
    }

    let bestMatchForP1: { person2: ComparablePerson; pairScore: number; reasons: string[]; p2Index: number } | null = null;

    for (let i = 0; i < tree2.length; i++) {
      if (matchedTree2Indices.has(i)) continue;

      const p2 = tree2[i];
      if (p2.isAlternateProfile) {
        logger.debug(`[areTreesSimilar] Skipping P2 (ID: ${p2.id || "unknown"}, Name: ${p2.originalData.name}) from tree2 because it is an alternate profile.`);
        continue;
      }
      if (!p2.name) { // p2.name is now first name
        logger.debug(`[areTreesSimilar] Skipping P2 (ID: ${p2.id || "unknown"}, index ${i}) due to missing first name.`);
        continue;
      }

      let currentPairScore = 0;
      const currentPairMatchReasons: string[] = [];

      // 1. First Name Match (Levenshtein) - p1.name and p2.name are normalized first names
      const nameDist = levenshteinDistance(p1.name, p2.name);
      if (nameDist === 0) { // Exact match
        currentPairScore += 2.0;
        currentPairMatchReasons.push("First Name (Exact)");
      } else if (nameDist === 1) { // Very Similar
        currentPairScore += 1.5;
        currentPairMatchReasons.push("First Name (Very Similar)");
      } else if (nameDist === 2) { // Close
        currentPairScore += 1.0;
        currentPairMatchReasons.push("First Name (Similar)");
      }

      // 1.b Alias Name Match
      if (p1.aliasName && p2.aliasName && p1.aliasName === p2.aliasName) {
        currentPairScore += 2.0;
        currentPairMatchReasons.push("Alias Name (Exact)");
      }


      // 2. DOB (or Age) Match
      if (p1.dob && p2.dob && p1.dob !== "N/A" && p2.dob !== "N/A") {
          if (p1.dob === p2.dob) { // Exact DOB match
              currentPairScore += 2.0;
              currentPairMatchReasons.push("DOB (Exact)");
          } else { // DOBs are different, check age approximation
              const age1 = calculateAge(p1.dob, logger);
              const age2 = calculateAge(p2.dob, logger);
              if (age1 !== null && age2 !== null && Math.abs(age1 - age2) <= 2) {
                  currentPairScore += 1.5;
                  currentPairMatchReasons.push("DOB (Age Approx. ±2yrs)");
              }
          }
      } else if (p1.dob === "N/A" && p2.dob === "N/A") { // Both have DOB = "N/A"
          currentPairScore += 0.5;
          currentPairMatchReasons.push("DOB (N/A for both)");
      }


      // 3. Native Place Match (uses normalized, whitespace-removed place)
      const p1NativePlaceKnown = p1.nativePlace && p1.nativePlace.trim() !== '';
      const p2NativePlaceKnown = p2.nativePlace && p2.nativePlace.trim() !== '';
      if (p1NativePlaceKnown && p2NativePlaceKnown && p1.nativePlace === p2.nativePlace) {
        currentPairScore += 1.5;
        currentPairMatchReasons.push("Native Place");
      } else if (!p1NativePlaceKnown && !p2NativePlaceKnown) {
        currentPairScore += 0.5;
        currentPairMatchReasons.push("Native Place (Unknown for both)");
      }

      // 4. Deceased Status Match
      if (p1.isDeceased === p2.isDeceased) {
        currentPairScore += 1.0;
        currentPairMatchReasons.push("Deceased Status");
      }

      // 5. Religion Match
      if (p1.religion && p2.religion && p1.religion === p2.religion) {
        currentPairScore += 1.0;
        currentPairMatchReasons.push("Religion");
      }

      // 6. Caste Match
      if (p1.caste && p2.caste && p1.caste === p2.caste) {
        currentPairScore += 1.0;
        currentPairMatchReasons.push("Caste");
      }

      // 7. Current Place Match (uses normalized, whitespace-removed place)
      const p1CurrentPlaceKnown = p1.currentPlace && p1.currentPlace.trim() !== '';
      const p2CurrentPlaceKnown = p2.currentPlace && p2.currentPlace.trim() !== '';
      if (p1CurrentPlaceKnown && p2CurrentPlaceKnown && p1.currentPlace === p2.currentPlace) {
        currentPairScore += 1.0;
        currentPairMatchReasons.push("Current Place");
      }

      // 8. Relationship to Owner (Role) Match
      if (p1.relationshipToOwner && p2.relationshipToOwner && p1.relationshipToOwner === p2.relationshipToOwner) {
        currentPairScore += 0.5;
        currentPairMatchReasons.push("Role (Same to their tree owner)");
      }

      if (currentPairScore > (bestMatchForP1?.pairScore || 0)) {
        bestMatchForP1 = { person2: p2, pairScore: currentPairScore, reasons: currentPairMatchReasons, p2Index: i };
      }
    }

    if (bestMatchForP1) {
      logger.debug(`  [Best Match for P1(${p1.originalData.name}, ID:${p1.id})] with P2(${bestMatchForP1.person2.originalData.name}, ID:${bestMatchForP1.person2.id}): Pair Score = ${bestMatchForP1.pairScore.toFixed(1)}. Threshold for counting: ${MIN_INDIVIDUAL_PAIR_SCORE_THRESHOLD}`);
      if (bestMatchForP1.pairScore >= MIN_INDIVIDUAL_PAIR_SCORE_THRESHOLD) {
        totalTreeScore += bestMatchForP1.pairScore;
        matchedTree2Indices.add(bestMatchForP1.p2Index);
        contributingPairsDetails.push({
          person1: p1,
          person2: bestMatchForP1.person2,
          pairScore: bestMatchForP1.pairScore,
          reasons: bestMatchForP1.reasons
        });
        logger.info(`    COUNTED: P1 ('${p1.originalData.name}') and P2 ('${bestMatchForP1.person2.originalData.name}') pair score ${bestMatchForP1.pairScore.toFixed(1)} added. Current total tree score: ${totalTreeScore.toFixed(1)}.`);
      } else {
        logger.info(`    NOT COUNTED: Best pair score ${bestMatchForP1.pairScore.toFixed(1)} for P1 ('${p1.originalData.name}') with P2 ('${bestMatchForP1.person2.originalData.name}') is below threshold ${MIN_INDIVIDUAL_PAIR_SCORE_THRESHOLD}.`);
      }
    } else {
       logger.debug(`  [Best Match for P1(${p1.originalData.name}, ID:${p1.id})]: No suitable match found for P1 after evaluating all P2s.`);
    }
  }

  const isSimilar = totalTreeScore >= TREE_SIMILARITY_THRESHOLD && contributingPairsDetails.length > 0;

  logger.info(`[areTreesSimilar] RESULT: isSimilar: ${isSimilar} (TotalScore: ${totalTreeScore.toFixed(1)} >= TreeThreshold: ${TREE_SIMILARITY_THRESHOLD} AND ContributingPairs: ${contributingPairsDetails.length} > 0).`);

  if (isSimilar && contributingPairsDetails.length > 0) {
    contributingPairsDetails.forEach(pair => {
      logger.debug(`  [Final Contributing Pair]: P1(${pair.person1.originalData.name}, ID:${pair.person1.id}) - P2(${pair.person2.originalData.name}, ID:${pair.person2.id}), PairScore: ${pair.pairScore.toFixed(1)}, Reasons: ${pair.reasons.join(" | ")}`);
    });
  } else if (totalTreeScore >= TREE_SIMILARITY_THRESHOLD && contributingPairsDetails.length === 0) {
      logger.warn(`[areTreesSimilar] Tree match score criteria met (score ${totalTreeScore.toFixed(1)} >= ${TREE_SIMILARITY_THRESHOLD}), but no individual pairs contributed (pairs < ${MIN_INDIVIDUAL_PAIR_SCORE_THRESHOLD}). This means isSimilar is FALSE. This outcome is expected if cumulative weak links exist but no single strong link does.`);
  }


  return {isSimilar, score: totalTreeScore, contributingPairs: contributingPairsDetails};
}

    