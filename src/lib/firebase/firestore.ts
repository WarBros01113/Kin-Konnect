
import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  query,
  deleteDoc,
  writeBatch,
  arrayUnion,
  arrayRemove,
  collectionGroup,
  serverTimestamp,
  type FieldValue,
  type DocumentReference,
  type Timestamp,
  where,
  limit,
} from 'firebase/firestore';
import { db } from './config';
import type { Profile, FamilyMember, BasicPerson, FamilyMemberFormData, KonnectRequest, Konnection, KonnectionStatus } from '@/types';

// Helper function to remove undefined fields from an object before saving to Firestore
function cleanDataForFirestore<T extends Record<string, any>>(data: T): Partial<T> {
  const cleanedData: Partial<T> = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key) && data[key] !== undefined) {
      cleanedData[key] = data[key];
    }
  }
  return cleanedData;
}

export const updateUserProfile = async (userId: string, profileData: Partial<Omit<Profile, 'id' | 'userId'>>): Promise<void> => {
  const userProfileRef = doc(db, 'users', userId);
  const dataToSet: Partial<Profile> = {
    ...profileData,
    aliasName: profileData.aliasName === "" ? null : profileData.aliasName,
    spouseIds: profileData.spouseIds || [],
    divorcedSpouseIds: profileData.divorcedSpouseIds || [],
    childIds: profileData.childIds || [],
    siblingIds: profileData.siblingIds || [],
    deceasedDate: profileData.deceasedDate === "" ? null : profileData.deceasedDate,
    anniversaryDate: profileData.anniversaryDate === "" ? null : profileData.anniversaryDate,
    isPublic: profileData.isPublic === undefined ? true : profileData.isPublic,
    hasAgreedToTerms: profileData.hasAgreedToTerms === undefined ? false : profileData.hasAgreedToTerms,
  };
  const cleanedDataToSet = cleanDataForFirestore(dataToSet);
  await setDoc(userProfileRef, { ...cleanedDataToSet, updatedAt: serverTimestamp() }, { merge: true });
};

export const setUserHasAgreedToTerms = async (userId: string): Promise<void> => {
  const userProfileRef = doc(db, 'users', userId);
  await setDoc(userProfileRef, { hasAgreedToTerms: true, updatedAt: serverTimestamp() }, { merge: true });
};

export const getPersonById = async (ownerId: string, personId: string): Promise<BasicPerson | null> => {
  let personRef;
  if (personId === ownerId) { // It's the owner's profile
    personRef = doc(db, 'users', ownerId);
  } else { // It's a family member
    personRef = doc(db, 'users', ownerId, 'familyMembers', personId);
  }
  const docSnap = await getDoc(personRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      userId: personId === ownerId ? ownerId : data.userId || ownerId,
      email: data.email,
      name: data.name || '',
      aliasName: data.aliasName || null,
      dob: data.dob || undefined,
      gender: data.gender || 'Other',
      isDeceased: data.isDeceased || false,
      deceasedDate: data.deceasedDate || undefined,
      anniversaryDate: data.anniversaryDate || undefined,
      fatherId: data.fatherId || null,
      motherId: data.motherId || null,
      spouseIds: data.spouseIds || [],
      divorcedSpouseIds: data.divorcedSpouseIds || [],
      childIds: data.childIds || [],
      siblingIds: data.siblingIds || [],
      siblingOrderIndex: data.siblingOrderIndex === undefined ? undefined : Number(data.siblingOrderIndex),
      isAlternateProfile: data.isAlternateProfile || false,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      phoneNumber: data.phoneNumber,
      description: data.description,
      isAdmin: data.isAdmin,
      isPublic: data.isPublic === undefined ? true : data.isPublic,
      nativePlace: data.nativePlace,
      currentPlace: data.currentPlace,
      religion: data.religion,
      caste: data.caste,
      stories: data.stories,
    } as BasicPerson;
  }
  return null;
};


export const getUserProfile = async (userId: string): Promise<Profile | null> => {
  const userProfileRef = doc(db, 'users', userId);
  const docSnap = await getDoc(userProfileRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      userId: docSnap.id,
      email: data.email || '',
      name: data.name || '',
      aliasName: data.aliasName || null,
      dob: data.dob || undefined,
      gender: data.gender || 'Other',
      isDeceased: data.isDeceased || false,
      deceasedDate: data.deceasedDate || undefined,
      anniversaryDate: data.anniversaryDate || undefined,
      fatherId: data.fatherId || null,
      motherId: data.motherId || null,
      spouseIds: data.spouseIds || [],
      divorcedSpouseIds: data.divorcedSpouseIds || [],
      childIds: data.childIds || [],
      siblingIds: data.siblingIds || [],
      siblingOrderIndex: data.siblingOrderIndex === undefined ? undefined : Number(data.siblingOrderIndex),
      phoneNumber: data.phoneNumber || undefined,
      description: data.description || undefined,
      nativePlace: data.nativePlace || undefined,
      currentPlace: data.currentPlace || undefined,
      religion: data.religion || undefined,
      caste: data.caste || undefined,
      stories: data.stories || undefined,
      isAdmin: data.isAdmin || false,
      isPublic: data.isPublic === undefined ? true : data.isPublic,
      hasAgreedToTerms: data.hasAgreedToTerms || false,
      isAlternateProfile: data.isAlternateProfile || false,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } as Profile;
  }
  return null;
};

export const addFamilyMember = async (
  loggedInUserId: string,
  newMemberDisplayData: FamilyMemberFormData,
  currentAnchorMember: BasicPerson,
  anchorRelationship: string,
  selectedCoParentId?: string | null
): Promise<FamilyMember> => {
  const batch = writeBatch(db);
  const familyMembersColRef = collection(db, 'users', loggedInUserId, 'familyMembers');
  const newMemberDocRef = doc(familyMembersColRef);

  const newMemberLinks = {
    fatherId: null as string | null,
    motherId: null as string | null,
    spouseIds: [] as string[],
    childIds: [] as string[],
    siblingIds: [] as string[],
  };

  const anchorIsUserProfile = currentAnchorMember.id === loggedInUserId;
  const anchorRef = anchorIsUserProfile
    ? doc(db, 'users', loggedInUserId)
    : doc(db, 'users', loggedInUserId, 'familyMembers', currentAnchorMember.id);

  const anchorDocSnap = await getDoc(anchorRef);
  if (!anchorDocSnap.exists()) {
    throw new Error(`Anchor member ${currentAnchorMember.id} not found.`);
  }
  const anchorData = { id: anchorDocSnap.id, ...anchorDocSnap.data() } as BasicPerson;


  if (anchorRelationship === 'Father') {
    newMemberLinks.childIds.push(currentAnchorMember.id);
    batch.update(anchorRef, { fatherId: newMemberDocRef.id, updatedAt: serverTimestamp() });

    if (anchorData.motherId) {
        const existingMotherId = anchorData.motherId;
        if (existingMotherId !== newMemberDocRef.id) {
            const motherRef = existingMotherId === loggedInUserId ? doc(db, 'users', loggedInUserId) : doc(db, 'users', loggedInUserId, 'familyMembers', existingMotherId);
            const motherDocSnap = await getDoc(motherRef);
            if (motherDocSnap.exists()) {
                const motherData = motherDocSnap.data() as BasicPerson;
                if (!motherData.spouseIds?.includes(newMemberDocRef.id)) {
                    batch.update(motherRef, {
                        spouseIds: arrayUnion(newMemberDocRef.id),
                        updatedAt: serverTimestamp()
                    });
                }
                 if (!newMemberLinks.spouseIds.includes(existingMotherId)) {
                    newMemberLinks.spouseIds.push(existingMotherId);
                }
            }
        }
    }

    const anchorSiblings = anchorData.siblingIds || [];
    for (const siblingId of anchorSiblings) {
      if (!siblingId || siblingId === currentAnchorMember.id || siblingId === newMemberDocRef.id) continue;
      const siblingRef = siblingId === loggedInUserId ? doc(db, 'users', loggedInUserId) : doc(db, 'users', loggedInUserId, 'familyMembers', siblingId);
      const siblingSnap = await getDoc(siblingRef);
      if (siblingSnap.exists()) {
          batch.update(siblingRef, { fatherId: newMemberDocRef.id, updatedAt: serverTimestamp() });
          if (!newMemberLinks.childIds.includes(siblingId)) {
            newMemberLinks.childIds.push(siblingId);
          }
      }
    }
  } else if (anchorRelationship === 'Mother') {
    newMemberLinks.childIds.push(currentAnchorMember.id);
    batch.update(anchorRef, { motherId: newMemberDocRef.id, updatedAt: serverTimestamp() });

    if (anchorData.fatherId) {
        const existingFatherId = anchorData.fatherId;
        if (existingFatherId !== newMemberDocRef.id) {
            const fatherRef = existingFatherId === loggedInUserId ? doc(db, 'users', loggedInUserId) : doc(db, 'users', loggedInUserId, 'familyMembers', existingFatherId);
            const fatherDocSnap = await getDoc(fatherRef);
            if (fatherDocSnap.exists()) {
                const fatherData = fatherDocSnap.data() as BasicPerson;
                if (!fatherData.spouseIds?.includes(newMemberDocRef.id)) {
                    batch.update(fatherRef, {
                        spouseIds: arrayUnion(newMemberDocRef.id),
                        updatedAt: serverTimestamp()
                    });
                }
                 if (!newMemberLinks.spouseIds.includes(existingFatherId)) {
                    newMemberLinks.spouseIds.push(existingFatherId);
                }
            }
        }
    }

    const anchorSiblings = anchorData.siblingIds || [];
    for (const siblingId of anchorSiblings) {
      if (!siblingId || siblingId === currentAnchorMember.id || siblingId === newMemberDocRef.id) continue;
      const siblingRef = siblingId === loggedInUserId ? doc(db, 'users', loggedInUserId) : doc(db, 'users', loggedInUserId, 'familyMembers', siblingId);
      const siblingSnap = await getDoc(siblingRef);
      if (siblingSnap.exists()) {
          batch.update(siblingRef, { motherId: newMemberDocRef.id, updatedAt: serverTimestamp() });
           if (!newMemberLinks.childIds.includes(siblingId)) {
            newMemberLinks.childIds.push(siblingId);
          }
      }
    }
  } else if (anchorRelationship === 'Spouse') {
    newMemberLinks.spouseIds.push(currentAnchorMember.id);
    batch.update(anchorRef, { spouseIds: arrayUnion(newMemberDocRef.id), updatedAt: serverTimestamp() });
    
    // Logic to retroactively link children to the new spouse
    const anchorChildrenIds = anchorData.childIds || [];
    for (const childId of anchorChildrenIds) {
        if (!childId) continue;
        const childRef = childId === loggedInUserId
            ? doc(db, 'users', loggedInUserId)
            : doc(db, 'users', loggedInUserId, 'familyMembers', childId);

        const childSnap = await getDoc(childRef);
        if (childSnap.exists()) {
            const childData = { id: childSnap.id, ...childSnap.data() } as BasicPerson;
            let childUpdateNeeded = false;
            const childUpdatePayload: Partial<FamilyMember | Profile> = { updatedAt: serverTimestamp() };

            if (anchorData.gender === 'Male' && childData.fatherId === currentAnchorMember.id && !childData.motherId && newMemberDisplayData.gender === 'Female') {
                childUpdatePayload.motherId = newMemberDocRef.id;
                if (!newMemberLinks.childIds.includes(childId)) newMemberLinks.childIds.push(childId);
                childUpdateNeeded = true;
            }
            else if (anchorData.gender === 'Female' && childData.motherId === currentAnchorMember.id && !childData.fatherId && newMemberDisplayData.gender === 'Male') {
                childUpdatePayload.fatherId = newMemberDocRef.id;
                if (!newMemberLinks.childIds.includes(childId)) newMemberLinks.childIds.push(childId);
                childUpdateNeeded = true;
            }
             else if (anchorData.gender === 'Other') {
                if (childData.fatherId === currentAnchorMember.id && !childData.motherId && newMemberDisplayData.gender === 'Female') {
                    childUpdatePayload.motherId = newMemberDocRef.id;
                    if (!newMemberLinks.childIds.includes(childId)) newMemberLinks.childIds.push(childId);
                    childUpdateNeeded = true;
                } else if (childData.motherId === currentAnchorMember.id && !childData.fatherId && newMemberDisplayData.gender === 'Male') {
                     childUpdatePayload.fatherId = newMemberDocRef.id;
                     if (!newMemberLinks.childIds.includes(childId)) newMemberLinks.childIds.push(childId);
                     childUpdateNeeded = true;
                }
            }
            if (childUpdateNeeded) {
                batch.update(childRef, cleanDataForFirestore(childUpdatePayload));
            }
        }
    }

  } else if (anchorRelationship === 'Brother' || anchorRelationship === 'Sister') {
    newMemberLinks.fatherId = anchorData.fatherId || null;
    newMemberLinks.motherId = anchorData.motherId || null;
    newMemberLinks.siblingIds.push(currentAnchorMember.id);
    batch.update(anchorRef, { siblingIds: arrayUnion(newMemberDocRef.id), updatedAt: serverTimestamp() });

    const anchorExistingSiblings = anchorData.siblingIds || [];
    for (const existingSiblingId of anchorExistingSiblings) {
      if (!existingSiblingId || existingSiblingId === newMemberDocRef.id || existingSiblingId === currentAnchorMember.id) continue;
      const osRef = existingSiblingId === loggedInUserId
          ? doc(db, 'users', loggedInUserId)
          : doc(db, 'users', loggedInUserId, 'familyMembers', existingSiblingId);
      const osSnap = await getDoc(osRef);
      if (osSnap.exists()) {
          batch.update(osRef, { siblingIds: arrayUnion(newMemberDocRef.id), updatedAt: serverTimestamp() });
          if (!newMemberLinks.siblingIds.includes(existingSiblingId)) {
            newMemberLinks.siblingIds.push(existingSiblingId);
          }
      }
    }

    if (anchorData.fatherId) {
        const fatherRef = anchorData.fatherId === loggedInUserId
            ? doc(db, 'users', loggedInUserId)
            : doc(db, 'users', loggedInUserId, 'familyMembers', anchorData.fatherId);
        const fatherSnap = await getDoc(fatherRef);
        if(fatherSnap.exists()) batch.update(fatherRef, { childIds: arrayUnion(newMemberDocRef.id), updatedAt: serverTimestamp() });
    }
    if (anchorData.motherId) {
        const motherRef = anchorData.motherId === loggedInUserId
            ? doc(db, 'users', loggedInUserId)
            : doc(db, 'users', loggedInUserId, 'familyMembers', anchorData.motherId);
        const motherSnap = await getDoc(motherRef);
        if(motherSnap.exists()) batch.update(motherRef, { childIds: arrayUnion(newMemberDocRef.id), updatedAt: serverTimestamp() });
    }
  } else if (anchorRelationship === 'Son' || anchorRelationship === 'Daughter') {
    batch.update(anchorRef, { childIds: arrayUnion(newMemberDocRef.id), updatedAt: serverTimestamp() });
    let coParentRef: DocumentReference | null = null;
    if (selectedCoParentId) {
        coParentRef = selectedCoParentId === loggedInUserId
            ? doc(db, 'users', loggedInUserId)
            : doc(db, 'users', loggedInUserId, 'familyMembers', selectedCoParentId);
    } else if (anchorData.spouseIds && anchorData.spouseIds.length === 1) {
        coParentRef = anchorData.spouseIds[0] === loggedInUserId
            ? doc(db, 'users', loggedInUserId)
            : doc(db, 'users', loggedInUserId, 'familyMembers', anchorData.spouseIds[0]);
    }


    let coParentData: BasicPerson | null = null;
    if (coParentRef) {
        const coParentSnap = await getDoc(coParentRef);
        if (coParentSnap.exists()) {
            coParentData = { id: coParentSnap.id, ...coParentSnap.data() } as BasicPerson;
        }
    }

    newMemberLinks.fatherId = null;
    newMemberLinks.motherId = null;

    if (anchorData.gender === 'Male') {
        newMemberLinks.fatherId = currentAnchorMember.id;
        if (coParentData && coParentData.gender === 'Female') {
            newMemberLinks.motherId = coParentData.id;
        }
    } else if (anchorData.gender === 'Female') {
        newMemberLinks.motherId = currentAnchorMember.id;
        if (coParentData && coParentData.gender === 'Male') {
            newMemberLinks.fatherId = coParentData.id;
        }
    } else {
        if (coParentData) {
            if (coParentData.gender === 'Male') {
                newMemberLinks.fatherId = coParentData.id;
                newMemberLinks.motherId = currentAnchorMember.id;
            } else if (coParentData.gender === 'Female') {
                newMemberLinks.motherId = coParentData.id;
                newMemberLinks.fatherId = currentAnchorMember.id;
            } else {
                newMemberLinks.fatherId = currentAnchorMember.id;
                newMemberLinks.motherId = coParentData.id;
            }
        } else {
           if (currentAnchorMember.gender === 'Male') newMemberLinks.fatherId = currentAnchorMember.id;
           if (currentAnchorMember.gender === 'Female') newMemberLinks.motherId = currentAnchorMember.id;
        }
    }


    if (coParentData && coParentRef) {
        batch.update(coParentRef, { childIds: arrayUnion(newMemberDocRef.id), updatedAt: serverTimestamp() });
    }

    const finalFatherIdForNewChild = newMemberLinks.fatherId;
    const finalMotherIdForNewChild = newMemberLinks.motherId;

    const allCurrentFamilyMembers = await getFamilyMembers(loggedInUserId);
    const currentUserProfile = await getUserProfile(loggedInUserId);
    const allPeopleInTree = (currentUserProfile ? [currentUserProfile] : []).concat(allCurrentFamilyMembers) as BasicPerson[];

    const existingSiblingsOfNewChild = allPeopleInTree.filter(person => {
        if (person.id === newMemberDocRef.id) return false;
        const personFatherId = person.fatherId || null;
        const personMotherId = person.motherId || null;
        return finalFatherIdForNewChild && finalMotherIdForNewChild &&
               personFatherId === finalFatherIdForNewChild && personMotherId === finalMotherIdForNewChild;
    });

    newMemberLinks.siblingIds = existingSiblingsOfNewChild.map(s => s.id);

    for (const existingSibling of existingSiblingsOfNewChild) {
        const existingSiblingDocRef = existingSibling.id === loggedInUserId
            ? doc(db, 'users', loggedInUserId)
            : doc(db, 'users', loggedInUserId, 'familyMembers', existingSibling.id);
        batch.update(existingSiblingDocRef, {
            siblingIds: arrayUnion(newMemberDocRef.id),
            updatedAt: serverTimestamp()
        });
    }
  }

  const fullNewMemberData: Omit<FamilyMember, 'id'> = {
    userId: loggedInUserId,
    name: newMemberDisplayData.name,
    aliasName: newMemberDisplayData.aliasName || null,
    dob: newMemberDisplayData.dob,
    gender: newMemberDisplayData.gender,
    isDeceased: newMemberDisplayData.isDeceased || false,
    deceasedDate: newMemberDisplayData.deceasedDate || null,
    anniversaryDate: anchorRelationship === 'Spouse' ? (newMemberDisplayData.anniversaryDate || null) : null,
    siblingOrderIndex: newMemberDisplayData.siblingOrderIndex,
    nativePlace: newMemberDisplayData.nativePlace || null,
    currentPlace: newMemberDisplayData.currentPlace || null,
    religion: newMemberDisplayData.religion || null,
    caste: newMemberDisplayData.caste || null,
    stories: newMemberDisplayData.stories || null,
    fatherId: newMemberLinks.fatherId,
    motherId: newMemberLinks.motherId,
    spouseIds: [...new Set(newMemberLinks.spouseIds)],
    divorcedSpouseIds: [],
    childIds: [...new Set(newMemberLinks.childIds)],
    siblingIds: [...new Set(newMemberLinks.siblingIds)],
    isAlternateProfile: false,
    isPublic: true, // Family members are discoverable if the main profile is public
    createdAt: serverTimestamp() as FieldValue,
    updatedAt: serverTimestamp() as FieldValue,
  };

  const cleanedNewMemberData = cleanDataForFirestore(fullNewMemberData);
  batch.set(newMemberDocRef, cleanedNewMemberData);

  await batch.commit();
  const savedDocSnap = await getDoc(newMemberDocRef);
  const savedData = savedDocSnap.data();

  return {
    id: newMemberDocRef.id,
    userId: loggedInUserId,
    name: savedData?.name || '',
    aliasName: savedData?.aliasName || null,
    dob: savedData?.dob || undefined,
    gender: savedData?.gender || 'Other',
    isDeceased: savedData?.isDeceased || false,
    deceasedDate: savedData?.deceasedDate || undefined,
    anniversaryDate: savedData?.anniversaryDate || undefined,
    fatherId: savedData?.fatherId || null,
    motherId: savedData?.motherId || null,
    spouseIds: savedData?.spouseIds || [],
    divorcedSpouseIds: savedData?.divorcedSpouseIds || [],
    childIds: savedData?.childIds || [],
    siblingIds: savedData?.siblingIds || [],
    siblingOrderIndex: savedData?.siblingOrderIndex === undefined ? undefined : Number(savedData.siblingOrderIndex),
    isAlternateProfile: savedData?.isAlternateProfile || false,
    isPublic: savedData?.isPublic === undefined ? true : savedData.isPublic,
    nativePlace: savedData?.nativePlace || undefined,
    currentPlace: savedData?.currentPlace || undefined,
    religion: savedData?.religion || undefined,
caste: savedData?.caste || undefined,
    stories: savedData?.stories || undefined,
    createdAt: savedData?.createdAt as Timestamp,
    updatedAt: savedData?.updatedAt as Timestamp,
  } as FamilyMember;
};


export const getFamilyMembers = async (userId: string): Promise<FamilyMember[]> => {
  const familyMembersColRef = collection(db, 'users', userId, 'familyMembers');
  const q = query(familyMembersColRef);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      userId: userId,
      name: data.name || '',
      aliasName: data.aliasName || null,
      dob: data.dob || undefined,
      gender: data.gender || 'Other',
      isDeceased: data.isDeceased || false,
      deceasedDate: data.deceasedDate || undefined,
      anniversaryDate: data.anniversaryDate || undefined,
      fatherId: data.fatherId || null,
      motherId: data.motherId || null,
      spouseIds: data.spouseIds || [],
      divorcedSpouseIds: data.divorcedSpouseIds || [],
      childIds: data.childIds || [],
      siblingIds: data.siblingIds || [],
      siblingOrderIndex: data.siblingOrderIndex === undefined ? undefined : Number(data.siblingOrderIndex),
      isAlternateProfile: data.isAlternateProfile || false,
      isPublic: data.isPublic === undefined ? true : data.isPublic,
      nativePlace: data.nativePlace || undefined,
      currentPlace: data.currentPlace || undefined,
      religion: data.religion || undefined,
      caste: data.caste || undefined,
      stories: data.stories || undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } as FamilyMember;
  });
};

export const updateFamilyMember = async (
  loggedInUserId: string,
  memberId: string,
  memberData: Partial<Omit<FamilyMember, 'id' | 'userId' >>,
  divorceSelections?: Record<string, boolean>
): Promise<void> => {
  const batch = writeBatch(db);
  const memberRef = doc(db, 'users', loggedInUserId, 'familyMembers', memberId);
  const memberSnap = await getDoc(memberRef);
  if (!memberSnap.exists()) {
    throw new Error("Member to edit not found.");
  }
  const memberToEditData = memberSnap.data() as FamilyMember;
  
  // Handle standard field updates
  const dataToUpdate = { ...memberData };
  dataToUpdate.aliasName = dataToUpdate.aliasName === "" ? null : dataToUpdate.aliasName;
  dataToUpdate.deceasedDate = dataToUpdate.deceasedDate === "" ? null : dataToUpdate.deceasedDate;
  dataToUpdate.anniversaryDate = dataToUpdate.anniversaryDate === "" ? null : dataToUpdate.anniversaryDate;
  dataToUpdate.isDeceased = dataToUpdate.isDeceased ?? false;
  
  if (dataToUpdate.isPublic === undefined) {
    delete dataToUpdate.isPublic;
  }
  const cleanedMemberData = cleanDataForFirestore(dataToUpdate);
  batch.set(memberRef, { ...cleanedMemberData, updatedAt: serverTimestamp() }, { merge: true });

  // Handle divorce updates transactionally
  if (divorceSelections) {
    const everSpouseIds = new Set([...(memberToEditData.spouseIds || []), ...(memberToEditData.divorcedSpouseIds || [])]);

    for (const spouseId of everSpouseIds) {
      const isNowDivorced = divorceSelections[spouseId];
      const wasDivorced = (memberToEditData.divorcedSpouseIds || []).includes(spouseId);

      // Continue only if there's a change in status
      if (isNowDivorced === wasDivorced) continue;

      const spouseRef = spouseId === loggedInUserId
        ? doc(db, 'users', loggedInUserId)
        : doc(db, 'users', loggedInUserId, 'familyMembers', spouseId);
      
      const spouseSnap = await getDoc(spouseRef);
      if (!spouseSnap.exists()) continue;

      if (isNowDivorced) {
        // From married to divorced
        batch.update(memberRef, { spouseIds: arrayRemove(spouseId), divorcedSpouseIds: arrayUnion(spouseId), updatedAt: serverTimestamp() });
        batch.update(spouseRef, { spouseIds: arrayRemove(memberId), divorcedSpouseIds: arrayUnion(memberId), updatedAt: serverTimestamp() });
      } else {
        // From divorced to married (re-connecting)
        batch.update(memberRef, { divorcedSpouseIds: arrayRemove(spouseId), spouseIds: arrayUnion(spouseId), updatedAt: serverTimestamp() });
        batch.update(spouseRef, { divorcedSpouseIds: arrayRemove(memberId), spouseIds: arrayUnion(memberId), updatedAt: serverTimestamp() });
      }
    }
  }

  await batch.commit();
};


export const linkParentToUserProfile = async (
  loggedInUserId: string,
  parentMemberId: string | null,
  parentType: 'Father' | 'Mother'
): Promise<void> => {
  const batch = writeBatch(db);
  const userProfileDocRef = doc(db, 'users', loggedInUserId);

  const childProfileSnap = await getDoc(userProfileDocRef);
  if (!childProfileSnap.exists()) {
    throw new Error(`Child profile ${loggedInUserId} not found.`);
  }
  const childProfileData = { id: childProfileSnap.id, ...childProfileSnap.data() } as Profile;

  const childUpdate: Partial<Profile> = { updatedAt: serverTimestamp() };
  const oldParentIdForChild = parentType === 'Father' ? childProfileData.fatherId : childProfileData.motherId;

  if (parentType === 'Father') childUpdate.fatherId = parentMemberId;
  else childUpdate.motherId = parentMemberId;
  batch.update(userProfileDocRef, cleanDataForFirestore(childUpdate));

  if (oldParentIdForChild && oldParentIdForChild !== parentMemberId) {
    const oldParentRef = doc(db, 'users', loggedInUserId, 'familyMembers', oldParentIdForChild);
    const oldParentSnap = await getDoc(oldParentRef);
    if (oldParentSnap.exists()) {
      batch.update(oldParentRef, { childIds: arrayRemove(loggedInUserId), updatedAt: serverTimestamp() });
    }
  }

  if (parentMemberId) {
    const newParentRef = doc(db, 'users', loggedInUserId, 'familyMembers', parentMemberId);
    const newParentSnap = await getDoc(newParentRef);
    if (!newParentSnap.exists()) {
      throw new Error(`The selected ${parentType} (ID: ${parentMemberId}) document does not exist.`);
    }
    batch.update(newParentRef, { childIds: arrayUnion(loggedInUserId), updatedAt: serverTimestamp() });

    const fatherOfUserId = parentType === 'Father' ? parentMemberId : childProfileData.fatherId;
    const motherOfUserId = parentType === 'Mother' ? parentMemberId : childProfileData.motherId;

    if (fatherOfUserId && motherOfUserId && fatherOfUserId !== motherOfUserId) {
      const fatherRef = fatherOfUserId === loggedInUserId ? doc(db, 'users', loggedInUserId) : doc(db, 'users', loggedInUserId, 'familyMembers', fatherOfUserId);
      const motherRef = motherOfUserId === loggedInUserId ? doc(db, 'users', loggedInUserId) : doc(db, 'users', loggedInUserId, 'familyMembers', motherOfUserId);


      const fatherDocSnap = await getDoc(fatherRef);
      if (fatherDocSnap.exists()) {
        const fatherData = fatherDocSnap.data() as BasicPerson;
        if (!fatherData.spouseIds?.includes(motherOfUserId)) {
          batch.update(fatherRef, {
            spouseIds: arrayUnion(motherOfUserId),
            updatedAt: serverTimestamp()
          });
        }
      }

      const motherDocSnap = await getDoc(motherRef);
      if (motherDocSnap.exists()) {
        const motherData = motherDocSnap.data() as BasicPerson;
        if (!motherData.spouseIds?.includes(fatherOfUserId)) {
          batch.update(motherRef, {
            spouseIds: arrayUnion(fatherOfUserId),
            updatedAt: serverTimestamp()
          });
        }
      }
    }
  }

  const userSiblingIds = childProfileData.siblingIds || [];
  if (parentMemberId) {
    for (const siblingId of userSiblingIds) {
      if (!siblingId || siblingId === loggedInUserId || siblingId === parentMemberId) continue;
      const siblingRef = doc(db, 'users', loggedInUserId, 'familyMembers', siblingId);
      const siblingSnap = await getDoc(siblingRef);
      if (siblingSnap.exists()){
          const siblingData = siblingSnap.data() as FamilyMember;
          let siblingUpdatePayload: Partial<FamilyMember> = {updatedAt: serverTimestamp()};
          let updateSiblingNeeded = false;

          if (parentType === 'Father' && siblingData.fatherId !== parentMemberId) {
            siblingUpdatePayload.fatherId = parentMemberId;
            updateSiblingNeeded = true;
          } else if (parentType === 'Mother' && siblingData.motherId !== parentMemberId) {
            siblingUpdatePayload.motherId = parentMemberId;
            updateSiblingNeeded = true;
          }
          if (updateSiblingNeeded) {
            batch.update(siblingRef, cleanDataForFirestore(siblingUpdatePayload));
          }

          const newParentRefForSiblingUpdate = doc(db, 'users', loggedInUserId, 'familyMembers', parentMemberId);
          batch.update(newParentRefForSiblingUpdate, { childIds: arrayUnion(siblingId), updatedAt: serverTimestamp() });
      }
    }
  }
  await batch.commit();
};


export const getAllUsers = async (): Promise<Profile[]> => {
  const usersColRef = collection(db, 'users');
  const querySnapshot = await getDocs(usersColRef);
  return querySnapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      userId: docSnap.id,
      email: data.email || '',
      name: data.name || '',
      aliasName: data.aliasName || null,
      dob: data.dob || undefined,
      gender: data.gender || 'Other',
      isDeceased: data.isDeceased || false,
      deceasedDate: data.deceasedDate || undefined,
      anniversaryDate: data.anniversaryDate || undefined,
      fatherId: data.fatherId || null,
      motherId: data.motherId || null,
      spouseIds: data.spouseIds || [],
      divorcedSpouseIds: data.divorcedSpouseIds || [],
      childIds: data.childIds || [],
      siblingIds: data.siblingIds || [],
      siblingOrderIndex: data.siblingOrderIndex === undefined ? undefined : Number(data.siblingOrderIndex),
      isAdmin: data.isAdmin || false,
      isPublic: data.isPublic === undefined ? true : data.isPublic,
      hasAgreedToTerms: data.hasAgreedToTerms || false,
      isAlternateProfile: data.isAlternateProfile || false,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } as Profile;
  });
};

export const getAllFamilyMembers = async (): Promise<FamilyMember[]> => {
  const familyMembersQuery = query(collectionGroup(db, 'familyMembers'));
  const querySnapshot = await getDocs(familyMembersQuery);
  return querySnapshot.docs.map(docSnap => {
    const data = docSnap.data();
    const ownerUserId = docSnap.ref.parent.parent?.id;
    return {
      id: docSnap.id,
      userId: ownerUserId || data.userId || 'unknown_owner',
      name: data.name || '',
      aliasName: data.aliasName || null,
      dob: data.dob || undefined,
      gender: data.gender || 'Other',
      isDeceased: data.isDeceased || false,
      deceasedDate: data.deceasedDate || undefined,
      anniversaryDate: data.anniversaryDate || undefined,
      fatherId: data.fatherId || null,
      motherId: data.motherId || null,
      spouseIds: data.spouseIds || [],
      divorcedSpouseIds: data.divorcedSpouseIds || [],
      childIds: data.childIds || [],
      siblingIds: data.siblingIds || [],
      siblingOrderIndex: data.siblingOrderIndex === undefined ? undefined : Number(data.siblingOrderIndex),
      isAlternateProfile: data.isAlternateProfile || false,
      isPublic: data.isPublic === undefined ? true : data.isPublic, // Family members don't typically have their own public status, defaults to true but not used.
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } as FamilyMember;
  });
};

export const deleteFamilyMember = async (
  loggedInUserId: string,
  memberIdToDelete: string
): Promise<void> => {
  const batch = writeBatch(db);
  const memberToDeleteRef = doc(db, 'users', loggedInUserId, 'familyMembers', memberIdToDelete);

  const memberToDeleteSnap = await getDoc(memberToDeleteRef);
  if (!memberToDeleteSnap.exists()) {
    console.warn(`Family member ${memberIdToDelete} not found for deletion under user ${loggedInUserId}.`);
    return;
  }
  const memberToDeleteData = memberToDeleteSnap.data() as FamilyMember;

  const getPersonRef = (personId: string) => {
    return personId === loggedInUserId
      ? doc(db, 'users', loggedInUserId)
      : doc(db, 'users', loggedInUserId, 'familyMembers', personId);
  };

  if (memberToDeleteData.fatherId) {
    const fatherRef = getPersonRef(memberToDeleteData.fatherId);
    const fatherSnap = await getDoc(fatherRef);
    if (fatherSnap.exists()) batch.update(fatherRef, { childIds: arrayRemove(memberIdToDelete), updatedAt: serverTimestamp() });
  }
  if (memberToDeleteData.motherId) {
    const motherRef = getPersonRef(memberToDeleteData.motherId);
    const motherSnap = await getDoc(motherRef);
    if (motherSnap.exists()) batch.update(motherRef, { childIds: arrayRemove(memberIdToDelete), updatedAt: serverTimestamp() });
  }
  if (memberToDeleteData.spouseIds && memberToDeleteData.spouseIds.length > 0) {
    for (const spouseId of memberToDeleteData.spouseIds) {
      if (!spouseId) continue;
      const spouseRef = getPersonRef(spouseId);
      const spouseSnap = await getDoc(spouseRef);
      if(spouseSnap.exists()) batch.update(spouseRef, { spouseIds: arrayRemove(memberIdToDelete), updatedAt: serverTimestamp() });
    }
  }

  if (memberToDeleteData.childIds && memberToDeleteData.childIds.length > 0) {
    for (const childId of memberToDeleteData.childIds) {
      if (!childId) continue;
      const childRef = getPersonRef(childId);
      const childSnap = await getDoc(childRef);
      if (childSnap.exists()) {
          const childData = childSnap.data() as BasicPerson;
          const childUpdate: Partial<BasicPerson> = { updatedAt: serverTimestamp() };
          let changed = false;
          if (childData.fatherId === memberIdToDelete) { childUpdate.fatherId = null; changed = true; }
          if (childData.motherId === memberIdToDelete) { childUpdate.motherId = null; changed = true; }
          if (changed) {
            batch.update(childRef, cleanDataForFirestore(childUpdate));
          }
      }
    }
  }
  if (memberToDeleteData.siblingIds && memberToDeleteData.siblingIds.length > 0) {
    for (const siblingId of memberToDeleteData.siblingIds) {
        if(!siblingId) continue;
        const siblingRef = getPersonRef(siblingId);
        const siblingSnap = await getDoc(siblingRef);
        if(siblingSnap.exists()) batch.update(siblingRef, { siblingIds: arrayRemove(memberIdToDelete), updatedAt: serverTimestamp() });
    }
  }

  batch.delete(memberToDeleteRef);
  await batch.commit();
};

export const deleteUserAccount = async (userIdToDelete: string): Promise<void> => {
  const batch = writeBatch(db);
  const userToDeleteDocRef = doc(db, 'users', userIdToDelete);

  const userFamilyMembersColRefForDeletedUser = collection(db, 'users', userIdToDelete, 'familyMembers');
  const userFamilyMembersSnapshotForDeletedUser = await getDocs(userFamilyMembersColRefForDeletedUser);
  userFamilyMembersSnapshotForDeletedUser.forEach((memberDoc) => {
    batch.delete(memberDoc.ref);
  });

  const idsOwnedByDeletedUser = userFamilyMembersSnapshotForDeletedUser.docs.map(d => d.id);
  idsOwnedByDeletedUser.push(userIdToDelete);


  const allUsersSnapshot = await getDocs(collection(db, 'users'));
  for (const otherUserDoc of allUsersSnapshot.docs) {
    if (otherUserDoc.id === userIdToDelete) continue;

    const otherUserId = otherUserDoc.id;

    const updateDocumentLinks = (docRefToUpdate: DocumentReference, docData: BasicPerson | Profile) => {
        let updatePayload: Partial<BasicPerson | Profile> = {};
        let modified = false;

        if (idsOwnedByDeletedUser.includes(docData.fatherId || '')) {
            updatePayload.fatherId = null; modified = true;
        }
        if (idsOwnedByDeletedUser.includes(docData.motherId || '')) {
            updatePayload.motherId = null; modified = true;
        }
        if (docData.spouseIds?.some(id => idsOwnedByDeletedUser.includes(id))) {
            updatePayload.spouseIds = (docData.spouseIds || []).filter(id => !idsOwnedByDeletedUser.includes(id));
            modified = true;
        }
        if (docData.divorcedSpouseIds?.some(id => idsOwnedByDeletedUser.includes(id))) {
            updatePayload.divorcedSpouseIds = (docData.divorcedSpouseIds || []).filter(id => !idsOwnedByDeletedUser.includes(id));
            modified = true;
        }
        if (docData.childIds?.some(id => idsOwnedByDeletedUser.includes(id))) {
            updatePayload.childIds = (docData.childIds || []).filter(id => !idsOwnedByDeletedUser.includes(id));
            modified = true;
        }
        if (docData.siblingIds?.some(id => idsOwnedByDeletedUser.includes(id))) {
            updatePayload.siblingIds = (docData.siblingIds || []).filter(id => !idsOwnedByDeletedUser.includes(id));
            modified = true;
        }
        if (modified) {
            batch.update(docRefToUpdate, { ...cleanDataForFirestore(updatePayload), updatedAt: serverTimestamp() });
        }
    };

    const otherUserProfileData = otherUserDoc.data() as Profile;
    updateDocumentLinks(otherUserDoc.ref, otherUserProfileData);

    const otherUserFamilyCol = collection(db, 'users', otherUserId, 'familyMembers');
    const otherUserFamilySnapshot = await getDocs(otherUserFamilyCol);
    for (const fmDoc of otherUserFamilySnapshot.docs) {
        const fmData = fmDoc.data() as FamilyMember;
        updateDocumentLinks(fmDoc.ref, fmData);
    }
  }

  const konnectRequestsRef = collection(db, `users/${userIdToDelete}/konnectRequests`);
  const konnectRequestsSnap = await getDocs(konnectRequestsRef);
  konnectRequestsSnap.forEach(doc => batch.delete(doc.ref));

  const konnectionsRef = collection(db, `users/${userIdToDelete}/konnections`);
  const konnectionsSnap = await getDocs(konnectionsRef);
  konnectionsSnap.forEach(doc => batch.delete(doc.ref));

  const allKonnectRequestsQuery = query(collectionGroup(db, 'konnectRequests'), where('senderId', '==', userIdToDelete));
  const allKonnectRequestsSnap = await getDocs(allKonnectRequestsQuery);
  allKonnectRequestsSnap.forEach(doc => batch.delete(doc.ref));

  const allKonnectionsQuery = query(collectionGroup(db, 'konnections'), where('konnectedUserId', '==', userIdToDelete));
  const allKonnectionsSnap = await getDocs(allKonnectionsQuery);
  allKonnectionsSnap.forEach(doc => batch.delete(doc.ref));

  const userToDeleteSnap = await getDoc(userToDeleteDocRef);
  if (userToDeleteSnap.exists()) {
    batch.delete(userToDeleteDocRef);
  }

  await batch.commit();
};

// --- Konnect System Firestore Functions ---

export async function sendKonnectRequest(
  currentUserId: string,
  currentUserName: string,
  recipientUserId: string
): Promise<{ success: boolean; message: string; status?: KonnectionStatus }> {
  if (currentUserId === recipientUserId) {
    return { success: false, message: "You cannot send a Konnect request to yourself." };
  }

  const senderProfile = await getUserProfile(currentUserId);
  if (senderProfile && senderProfile.isPublic === false) {
      return { success: false, message: "You are in Private Mode. Switch to Public Mode in your profile to send Konnect requests." };
  }

  const recipientProfile = await getUserProfile(recipientUserId);
  if (!recipientProfile) {
    return { success: false, message: "Recipient profile not found." };
  }
  if (recipientProfile.isPublic === false) {
    return { success: false, message: `${recipientProfile.name || 'This user'} is in Private Mode and cannot receive Konnect requests.` };
  }

  const status = await getKonnectionStatusBetweenUsers(currentUserId, recipientUserId);

  if (status === 'konnected') {
    return { success: false, message: "You are already konnected.", status };
  }
  if (status === 'request_sent') {
    return { success: false, message: "Konnect request already sent.", status };
  }

  const incomingRequestRef = doc(db, 'users', currentUserId, 'konnectRequests', recipientUserId);
  const incomingRequestSnap = await getDoc(incomingRequestRef);

  if (incomingRequestSnap.exists()) {
    await acceptKonnectRequest(recipientUserId, currentUserId, recipientUserId, incomingRequestSnap.data()?.senderName || 'User');
    return { success: true, message: "Konnect request accepted! You are now konnected.", status: 'konnected' };
  }

  const recipientRequestRef = doc(db, 'users', recipientUserId, 'konnectRequests', currentUserId);
  const requestData: Omit<KonnectRequest, 'id'> = {
    senderId: currentUserId,
    senderName: currentUserName,
    timestamp: serverTimestamp() as Timestamp,
    status: 'pending',
  };
  await setDoc(recipientRequestRef, requestData);
  return { success: true, message: "Konnect request sent!", status: 'request_sent' };
}

export async function getKonnectRequests(userId: string): Promise<KonnectRequest[]> {
  const requestsColRef = collection(db, 'users', userId, 'konnectRequests');
  const q = query(requestsColRef, where('status', '==', 'pending'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
  } as KonnectRequest));
}

export async function acceptKonnectRequest(
  requestId: string, // This is the ID of the request document, often same as senderId in current structure
  currentUserId: string, // User accepting the request
  senderId: string, // User who sent the request
  senderName: string // Name of the user who sent the request
): Promise<void> {
  const batch = writeBatch(db);

  const currentUserProfile = await getUserProfile(currentUserId);
  if (!currentUserProfile) throw new Error("Current user profile not found.");

  const currentUserKonnectionRef = doc(db, 'users', currentUserId, 'konnections', senderId);
  batch.set(currentUserKonnectionRef, {
    konnectedUserId: senderId,
    name: senderName,
    konnectedAt: serverTimestamp(),
  });

  const senderKonnectionRef = doc(db, 'users', senderId, 'konnections', currentUserId);
  batch.set(senderKonnectionRef, {
    konnectedUserId: currentUserId,
    name: currentUserProfile.name, // Use current user's name for sender's record
    konnectedAt: serverTimestamp(),
  });

  // Delete the request from the current user's incoming requests
  const requestToDeleteRef = doc(db, 'users', currentUserId, 'konnectRequests', senderId);
  batch.delete(requestToDeleteRef);

  await batch.commit();
}

export async function declineKonnectRequest(currentUserId: string, senderIdOfRequest: string): Promise<void> {
  const requestRef = doc(db, 'users', currentUserId, 'konnectRequests', senderIdOfRequest);
  await deleteDoc(requestRef);
}

export async function cancelKonnectRequest(cancellerUserId: string, recipientOfOriginalRequestId: string): Promise<void> {
  // The request is stored in the recipient's subcollection, keyed by the sender's ID (cancellerUserId)
  const requestRef = doc(db, 'users', recipientOfOriginalRequestId, 'konnectRequests', cancellerUserId);
  const requestSnap = await getDoc(requestRef);
  if (requestSnap.exists()) {
    await deleteDoc(requestRef);
  } else {
    // This could happen if the recipient already accepted/declined, or if IDs are mixed up.
    console.warn(`Request from ${cancellerUserId} to ${recipientOfOriginalRequestId} not found for cancellation.`);
    // Optionally throw an error or return a status if specific feedback is needed.
    // For now, we'll just log and proceed as if cancelled (if it existed).
  }
}


export async function getKonnections(userId: string): Promise<Konnection[]> {
  const konnectionsColRef = collection(db, 'users', userId, 'konnections');
  const snapshot = await getDocs(konnectionsColRef);
  return snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
  } as Konnection));
}

export async function removeKonnection(currentUserId: string, konnectedUserIdToRemove: string): Promise<void> {
  const batch = writeBatch(db);

  const currentUserKonnectionRef = doc(db, 'users', currentUserId, 'konnections', konnectedUserIdToRemove);
  batch.delete(currentUserKonnectionRef);

  const otherUserKonnectionRef = doc(db, 'users', konnectedUserIdToRemove, 'konnections', currentUserId);
  batch.delete(otherUserKonnectionRef);

  await batch.commit();
}

export async function getKonnectionStatusBetweenUsers(userId1: string, userId2: string): Promise<KonnectionStatus> {
  if (!userId1 || !userId2) {
    return 'not_konnected';
  }
  if (userId1 === userId2) return 'not_konnected';

  const konnection1Ref = doc(db, 'users', userId1, 'konnections', userId2);
  const konnection1Snap = await getDoc(konnection1Ref);
  if (konnection1Snap.exists()) {
    return 'konnected';
  }

  // Check if userId1 has sent a request to userId2
  const requestSentRef = doc(db, 'users', userId2, 'konnectRequests', userId1);
  const requestSentSnap = await getDoc(requestSentRef);
  if (requestSentSnap.exists()) {
    return 'request_sent';
  }

  // Check if userId1 has received a request from userId2
  const requestReceivedRef = doc(db, 'users', userId1, 'konnectRequests', userId2);
  const requestReceivedSnap = await getDoc(requestReceivedRef);
  if (requestReceivedSnap.exists()) {
    return 'request_received';
  }

  return 'not_konnected';
}
