import type { BasicPerson, RelationshipPathStep, FindPathResult } from '@/types';

interface QueueItem {
  personId: string;
  path: RelationshipPathStep[];
  generation: number;
}

export function findRelationshipPath(
  startNodeId: string,
  endNodeId: string,
  allPeople: BasicPerson[]
): FindPathResult {
  if (startNodeId === endNodeId) {
    const person = allPeople.find(p => p.id === startNodeId);
    return {
      path: person ? [{ personId: startNodeId, personName: person.name || 'Unknown', connectionToPrevious: 'Self', generationRelativeToStart: 0 }] : [],
      pathFound: true,
      generationGap: 0,
    };
  }

  const peopleMap = new Map<string, BasicPerson>(allPeople.map(p => [p.id, p]));
  const queue: QueueItem[] = [];
  const visited = new Set<string>();

  const startPerson = peopleMap.get(startNodeId);
  if (!startPerson) {
    return { path: [], pathFound: false, generationGap: undefined };
  }

  queue.push({
    personId: startNodeId,
    path: [{ personId: startNodeId, personName: startPerson.name || 'Unknown', connectionToPrevious: 'Self', generationRelativeToStart: 0 }],
    generation: 0,
  });
  visited.add(startNodeId);

  while (queue.length > 0) {
    const currentQueueItem = queue.shift();
    if (!currentQueueItem) continue;

    const { personId: currentPersonId, path: currentPath, generation: currentGeneration } = currentQueueItem;
    const currentPerson = peopleMap.get(currentPersonId);
    if (!currentPerson) continue;

    const neighbors: Array<{ neighborId: string; connection: string; genOffset: number }> = [];

    // Add parents
    if (currentPerson.fatherId && peopleMap.has(currentPerson.fatherId)) {
      neighbors.push({ neighborId: currentPerson.fatherId, connection: `Father`, genOffset: -1 });
    }
    if (currentPerson.motherId && peopleMap.has(currentPerson.motherId)) {
      neighbors.push({ neighborId: currentPerson.motherId, connection: `Mother`, genOffset: -1 });
    }

    // Add children
    (currentPerson.childIds || []).forEach(childId => {
      const child = peopleMap.get(childId);
      if (child) {
        const connectionLabel = child.gender === 'Male' ? 'Son' : child.gender === 'Female' ? 'Daughter' : 'Child';
        neighbors.push({ neighborId: childId, connection: connectionLabel, genOffset: 1 });
      }
    });

    // Add spouses (current and divorced)
    const allSpouseIds = [...(currentPerson.spouseIds || []), ...(currentPerson.divorcedSpouseIds || [])];
    const uniqueSpouseIds = [...new Set(allSpouseIds)];

    uniqueSpouseIds.forEach(spouseId => {
      if (peopleMap.has(spouseId)) {
        neighbors.push({ neighborId: spouseId, connection: `Spouse`, genOffset: 0 });
      }
    });

    // Add siblings
    (currentPerson.siblingIds || []).forEach(siblingId => {
      const sibling = peopleMap.get(siblingId);
      if (sibling) {
        const connectionLabel = sibling.gender === 'Male' ? 'Brother' : sibling.gender === 'Female' ? 'Sister' : 'Sibling';
        neighbors.push({ neighborId: siblingId, connection: connectionLabel, genOffset: 0 });
      }
    });

    for (const { neighborId, connection, genOffset } of neighbors) {
      if (neighborId === endNodeId) {
        const neighborPerson = peopleMap.get(neighborId)!;
        const finalPath = [
          ...currentPath,
          {
            personId: neighborId,
            personName: neighborPerson.name || 'Unknown',
            connectionToPrevious: connection,
            generationRelativeToStart: currentGeneration + genOffset,
          },
        ];
        return {
          path: finalPath,
          pathFound: true,
          generationGap: currentGeneration + genOffset,
        };
      }

      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        const neighborPerson = peopleMap.get(neighborId)!;
        const newPath = [
          ...currentPath,
          {
            personId: neighborId,
            personName: neighborPerson.name || 'Unknown',
            connectionToPrevious: connection,
            generationRelativeToStart: currentGeneration + genOffset,
          },
        ];
        queue.push({
          personId: neighborId,
          path: newPath,
          generation: currentGeneration + genOffset,
        });
      }
    }
  }

  return { path: [], pathFound: false };
}
