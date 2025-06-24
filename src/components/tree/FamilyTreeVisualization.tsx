
'use client';

import React, { useEffect, useCallback, useMemo } from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  type Node,
  type Edge,
  Position,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Timestamp } from 'firebase/firestore';

import type { FamilyMember, Profile, FamilyNodeData, BasicPerson } from '@/types';
import FamilyNode from './FamilyNode';
import { sortPeopleByAge, sortSpousesByOrder } from '@/lib/utils';

interface FamilyTreeVisualizationProps {
  originalUserProfile: Profile;
  allFamilyMembers: FamilyMember[];
  currentRootId: string;
  onAddRelativeTo: (member: BasicPerson) => void;
  onSetCurrentRoot: (memberId: string) => void;
}

const nodeTypes = {
  familyNode: FamilyNode,
};

// --- Layout Constants ---
const NODE_WIDTH = 176;
const NODE_HEIGHT = 140; 

// Vertical Spacing
const VERTICAL_GENERATION_GAP = NODE_HEIGHT + 70; 

// Horizontal Gaps
const MAIN_LINE_HORIZONTAL_GAP = 25;
const CHILD_INTRA_GROUP_HORIZONTAL_GAP = 20;
const CHILD_INTER_GROUP_HORIZONTAL_GAP = 35;


const defaultEdgeStyle = {
  stroke: 'hsl(var(--muted-foreground))',
  strokeWidth: 1.5,
  type: 'smoothstep',
  markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--muted-foreground))', width: 15, height: 15 },
};

const spouseEdgeStyle = {
  stroke: 'hsl(var(--primary))',
  strokeWidth: 2,
  type: 'straight',
  markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))', width:12, height:12 },
  markerStart: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))', width:12, height:12 },
};

function separateSiblings(rootPerson: BasicPerson, allSiblings: BasicPerson[], membersMap: Map<string, BasicPerson>) {
    const older: BasicPerson[] = [];
    const younger: BasicPerson[] = [];

    for (const sibling of allSiblings) {
        if (sibling.id === rootPerson.id) continue;
        const rootComparisonProps = { ...membersMap.get(rootPerson.id)! };
        const siblingComparisonProps = { ...membersMap.get(sibling.id)! };

        const comparisonSort = sortPeopleByAge([siblingComparisonProps, rootComparisonProps], true);
        if (comparisonSort[0].id === sibling.id) {
            older.push(sibling);
        } else {
            younger.push(sibling);
        }
    }
    return { older: sortPeopleByAge(older, true), younger: sortPeopleByAge(younger, true) };
}


function _findRawParentsOf(personId: string | null | undefined, membersMap: Map<string, BasicPerson>): { father?: BasicPerson, mother?: BasicPerson } {
  if (!personId) return {};
  const person = membersMap.get(personId);
  if (!person) return {};

  const parents: { father?: BasicPerson, mother?: BasicPerson } = {};
  if (person.fatherId) {
    const father = membersMap.get(person.fatherId);
    if (father && !father.isAlternateProfile) parents.father = father;
  }
  if (person.motherId) {
    const mother = membersMap.get(person.motherId);
    if (mother && !mother.isAlternateProfile) parents.mother = mother;
  }
  return parents;
}

function _findRawChildrenOf(personId: string | null | undefined, membersMap: Map<string, BasicPerson>): BasicPerson[] {
  if (!personId) return [];
  const person = membersMap.get(personId);
  if (!person || !person.childIds || person.childIds.length === 0) return [];

  return person.childIds
    .map(childId => membersMap.get(childId))
    .filter(child => child && !child.isAlternateProfile) as BasicPerson[];
}

function _findSiblingsOf(rootPerson: BasicPerson, membersMap: Map<string, BasicPerson>): BasicPerson[] {
    if (!rootPerson) return [];

    const directSiblings = (rootPerson.siblingIds || [])
        .map(id => membersMap.get(id))
        .filter(s => s && s.id !== rootPerson.id && !s.isAlternateProfile) as BasicPerson[];

    if (directSiblings.length > 0) {
        return directSiblings;
    }

    const { father: rootFather, mother: rootMother } = _findRawParentsOf(rootPerson.id, membersMap);
    if (!rootFather && !rootMother) {
        return [];
    }

    const siblingsByCommonParents: BasicPerson[] = [];
    membersMap.forEach(potentialSibling => {
        if (potentialSibling.id === rootPerson.id || potentialSibling.isAlternateProfile) return;
        if (potentialSibling.id === rootPerson.fatherId || potentialSibling.id === rootPerson.motherId) return;
        if ((rootPerson.childIds || []).includes(potentialSibling.id)) return;

        const { father: siblingFather, mother: siblingMother } = _findRawParentsOf(potentialSibling.id, membersMap);
        const sharesFather = rootFather && siblingFather && rootFather.id === siblingFather.id;
        const sharesMother = rootMother && siblingMother && rootMother.id === siblingMother.id;

        if ((rootFather && rootMother && sharesFather && sharesMother) ||
            (rootFather && !rootMother && sharesFather) ||
            (!rootFather && rootMother && sharesMother)) {
            siblingsByCommonParents.push(potentialSibling);
        }
    });
    return Array.from(new Set(siblingsByCommonParents.map(s => s.id))).map(id => membersMap.get(id)!);
}


function getRelationshipToRoot(
  rootPerson: BasicPerson,
  targetPerson: BasicPerson,
  membersMap: Map<string, BasicPerson>
): { label: string; category: FamilyNodeData['nodeCategory'] } {
  if (targetPerson.id === rootPerson.id) return { label: "Self", category: 'root' };

  if (targetPerson.id === rootPerson.fatherId) return { label: "Father", category: 'parent' };
  if (targetPerson.id === rootPerson.motherId) return { label: "Mother", category: 'parent' };

  if (rootPerson.childIds?.includes(targetPerson.id)) {
     const childData = membersMap.get(targetPerson.id);
     const gender = childData?.gender;
     return { label: gender === 'Male' ? "Son" : gender === 'Female' ? "Daughter" : "Child", category: 'child' };
  }

  if (rootPerson.spouseIds?.includes(targetPerson.id) || rootPerson.divorcedSpouseIds?.includes(targetPerson.id)) {
     return { label: "Spouse", category: 'spouse' };
  }


  const allSiblingsOfRoot = _findSiblingsOf(rootPerson, membersMap);
  if (allSiblingsOfRoot.some(s => s.id === targetPerson.id)) {
    const targetGender = targetPerson.gender;
    return { label: targetGender === 'Male' ? "Brother" : targetGender === 'Female' ? "Sister" : "Sibling", category: 'sibling' };
  }

  return { label: "Relative", category: 'other' };
}

function ordinal(n: number): string {
  if (n <= 0) return String(n);
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function FamilyTreeVisualization({
  originalUserProfile,
  allFamilyMembers,
  currentRootId,
  onAddRelativeTo,
  onSetCurrentRoot,
}: FamilyTreeVisualizationProps) {
  const [nodes, setNodes, onNodesChangeReactFlow] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const membersMap = useMemo(() => {
    const map = new Map<string, BasicPerson>();
    const userProfileForMap = originalUserProfile.id === currentRootId
      ? { ...originalUserProfile, ...allFamilyMembers.find(fm => fm.id === originalUserProfile.id && fm.userId === originalUserProfile.id)}
      : { ...originalUserProfile };

    map.set(userProfileForMap.id, userProfileForMap);
    allFamilyMembers.forEach(fm => {
        if (!fm.isAlternateProfile) {
            map.set(fm.id, { ...fm });
        }
    });
    return map;
  }, [originalUserProfile, allFamilyMembers, currentRootId]);


  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node<FamilyNodeData>) => {
    if (node.data.id !== currentRootId) {
         onSetCurrentRoot(node.data.id);
      } else {
        const memberDataForAction = membersMap.get(node.data.id);
        if (memberDataForAction) {
            onAddRelativeTo(memberDataForAction);
        }
      }
  }, [membersMap, onAddRelativeTo, onSetCurrentRoot, currentRootId]);


  useEffect(() => {
    const localNewNodesMap = new Map<string, Node<FamilyNodeData>>();
    const localNewEdges: Edge[] = [];

    const currentRootPersonData = membersMap.get(currentRootId);

    if (!currentRootPersonData) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const addNodeToMap = (
        member: BasicPerson,
        x: number,
        y: number,
        localRelationshipLabel: string,
        category: FamilyNodeData['nodeCategory'],
        spouseOrder?: number,
        parentSpouseOrder?: number,
        isDivorcedFromRoot?: boolean
    ): Node<FamilyNodeData> => {
        const nodeId = member.id;
        const nodeData: FamilyNodeData = {
          id: member.id,
          name: member.name || 'Unknown',
          relationship: localRelationshipLabel,
          dob: member.dob,
          isDeceased: !!member.isDeceased,
          isDivorcedFromCurrentRoot: category === 'spouse' ? isDivorcedFromRoot : undefined,
          isRoot: member.id === currentRootPersonData.id,
          nodeCategory: category,
          gender: member.gender || 'Other',
          spouseOrder: category === 'spouse' ? spouseOrder : undefined,
          parentSpouseOrder: category === 'child' ? parentSpouseOrder : undefined,
          createdAt: member.createdAt
        };
        const nodeObject: Node<FamilyNodeData> = {
            id: nodeId,
            type: 'familyNode',
            data: nodeData,
            position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
            sourcePosition: Position.Bottom,
            targetPosition: Position.Top,
        };
        localNewNodesMap.set(nodeId, nodeObject);
        return nodeObject;
    };

    const addParentChildEdge = (parentNodeId: string, childNodeId: string) => {
        const edgeId = `e-${parentNodeId}-${childNodeId}-pc`;
        if (localNewNodesMap.has(parentNodeId) && localNewNodesMap.has(childNodeId)) {
            if (!localNewEdges.find(e => e.id === edgeId)) {
                 localNewEdges.push({ id: edgeId, source: parentNodeId, target: childNodeId, ...defaultEdgeStyle });
            }
        }
    };

    const addSpouseConnection = (node1Id: string, node2Id: string) => {
        const edgeId = `e-spouse-${[node1Id, node2Id].sort().join('-')}`;
         if (localNewNodesMap.has(node1Id) && localNewNodesMap.has(node2Id)) {
            if (!localNewEdges.find(e => e.id === edgeId)) {
                 localNewEdges.push({ id: edgeId, source: node1Id, target: node2Id, ...spouseEdgeStyle });
            }
         }
    };

    const rootY = 0;
    const parentY = rootY - VERTICAL_GENERATION_GAP;
    const childrenY = rootY + VERTICAL_GENERATION_GAP;

    const allSpousesAndExSpousesOfRoot = Array.from(new Set([
      ...(currentRootPersonData.spouseIds || []),
      ...(currentRootPersonData.divorcedSpouseIds || [])
    ]))
    .map(id => membersMap.get(id))
    .filter(Boolean) as BasicPerson[];
    
    const sortedEverSpouses = sortSpousesByOrder(allSpousesAndExSpousesOfRoot, true);

    const siblingsOfRootData = _findSiblingsOf(currentRootPersonData, membersMap);
    const { older: olderSiblings, younger: youngerSiblings } = separateSiblings(currentRootPersonData, siblingsOfRootData, membersMap);

    const lineForLayout: BasicPerson[] = [
        ...olderSiblings,
        currentRootPersonData,
        ...sortedEverSpouses,
        ...youngerSiblings
    ];

    let totalMainLineWidth = 0;
    if (lineForLayout.length > 0) {
        totalMainLineWidth = (lineForLayout.length * NODE_WIDTH) + ((lineForLayout.length - 1) * MAIN_LINE_HORIZONTAL_GAP);
    }
    const startXForMainLine = -totalMainLineWidth / 2 + NODE_WIDTH / 2;

    let currentXForMainLine = startXForMainLine;
    lineForLayout.forEach((person) => {
        const relDetails = getRelationshipToRoot(currentRootPersonData, person, membersMap);
        let nodeCategory = relDetails.category;
        
        let spouseIdx: number | undefined = undefined;
        let isDivorcedFromThisRoot = false;

        if (person.id === currentRootPersonData.id) {
            nodeCategory = 'root';
        } else {
            const everSpouseIndex = sortedEverSpouses.findIndex(s => s.id === person.id);
            if (everSpouseIndex !== -1) {
                nodeCategory = 'spouse';
                spouseIdx = everSpouseIndex;
                isDivorcedFromThisRoot = (currentRootPersonData.divorcedSpouseIds || []).includes(person.id);
            }
        }
        
        addNodeToMap(person, currentXForMainLine, rootY, relDetails.label, nodeCategory, spouseIdx, undefined, isDivorcedFromThisRoot);
        currentXForMainLine += NODE_WIDTH + MAIN_LINE_HORIZONTAL_GAP;
    });

    const finalRootNodeInLayout = localNewNodesMap.get(currentRootPersonData.id);

    // Connect current spouses (not divorced ones) with spouse edge
    (currentRootPersonData.spouseIds || []).forEach(spouseId => {
        const spouseNode = localNewNodesMap.get(spouseId);
        if (finalRootNodeInLayout && spouseNode) {
            addSpouseConnection(finalRootNodeInLayout.id, spouseNode.id);
        }
    });


    const { father: fatherOfRoot, mother: motherOfRoot } = _findRawParentsOf(currentRootPersonData.id, membersMap);
    let fatherNode: Node<FamilyNodeData> | undefined;
    let motherNode: Node<FamilyNodeData> | undefined;
    const parentsCenterX = finalRootNodeInLayout ? finalRootNodeInLayout.position.x + NODE_WIDTH / 2 : 0;

    if (fatherOfRoot && motherOfRoot) {
        const fatherX = parentsCenterX - (NODE_WIDTH + MAIN_LINE_HORIZONTAL_GAP) / 2;
        const motherX = parentsCenterX + (NODE_WIDTH + MAIN_LINE_HORIZONTAL_GAP) / 2;
        fatherNode = addNodeToMap(fatherOfRoot, fatherX, parentY, "Father", 'parent');
        motherNode = addNodeToMap(motherOfRoot, motherX, parentY, "Mother", 'parent');
        if (fatherNode && motherNode && (fatherOfRoot.spouseIds || []).includes(motherOfRoot.id)) {
             addSpouseConnection(fatherNode.id, motherNode.id);
        }
    } else if (fatherOfRoot) {
        fatherNode = addNodeToMap(fatherOfRoot, parentsCenterX, parentY, "Father", 'parent');
    } else if (motherOfRoot) {
        motherNode = addNodeToMap(motherOfRoot, parentsCenterX, parentY, "Mother", 'parent');
    }

    if (finalRootNodeInLayout) {
        if (fatherNode) addParentChildEdge(fatherNode.id, finalRootNodeInLayout.id);
        if (motherNode) addParentChildEdge(motherNode.id, finalRootNodeInLayout.id);
    }

    lineForLayout.forEach(personOnLine => {
        if (personOnLine.id === currentRootPersonData.id) return;
        if (sortedEverSpouses.some(s => s.id === personOnLine.id)) return;

        if (fatherNode && personOnLine.fatherId === fatherNode.data.id) {
            addParentChildEdge(fatherNode.id, personOnLine.id);
        }
        if (motherNode && personOnLine.motherId === motherNode.data.id) {
            addParentChildEdge(motherNode.id, personOnLine.id);
        }
    });

    const childrenOfCurrentRoot = _findRawChildrenOf(currentRootPersonData.id, membersMap);
    const childrenBySpouseGroup = new Map<number, BasicPerson[]>();
    const rootSpouseOrderMap = new Map<string, number>();
    sortedEverSpouses.forEach((spouse, order) => rootSpouseOrderMap.set(spouse.id, order));


    childrenBySpouseGroup.set(-1, []);
    rootSpouseOrderMap.forEach((order) => childrenBySpouseGroup.set(order, []));


    childrenOfCurrentRoot.forEach(child => {
        let groupKey = -1;
        const coParentId = child.fatherId === currentRootPersonData.id ? child.motherId : child.fatherId;
        
        if (coParentId && rootSpouseOrderMap.has(coParentId)) {
            groupKey = rootSpouseOrderMap.get(coParentId)!;
        }
        
        if (!childrenBySpouseGroup.has(groupKey)) childrenBySpouseGroup.set(groupKey, []);
        childrenBySpouseGroup.get(groupKey)?.push(child);
    });

    childrenBySpouseGroup.forEach((group, key, map) => map.set(key, sortPeopleByAge(group, true)));


    const layoutOrderOfChildGroups = Array.from(childrenBySpouseGroup.keys()).sort((a, b) => a - b);


    let totalWidthForAllChildrenGroups = 0;
    layoutOrderOfChildGroups.forEach((groupKey, index) => {
        const group = childrenBySpouseGroup.get(groupKey);
        if (group && group.length > 0) {
            const widthOfThisGroup = (group.length * NODE_WIDTH) + (group.length > 1 ? (group.length - 1) * CHILD_INTRA_GROUP_HORIZONTAL_GAP : 0);
            totalWidthForAllChildrenGroups += widthOfThisGroup;
            if (index < layoutOrderOfChildGroups.length - 1 && layoutOrderOfChildGroups.length > 1) {
                totalWidthForAllChildrenGroups += CHILD_INTER_GROUP_HORIZONTAL_GAP;
            }
        }
    });

    let currentXForChildNodeLayout = (finalRootNodeInLayout ? (finalRootNodeInLayout.position.x + NODE_WIDTH / 2) : 0) - totalWidthForAllChildrenGroups / 2 + NODE_WIDTH / 2;

    layoutOrderOfChildGroups.forEach((groupKey) => {
        const group = childrenBySpouseGroup.get(groupKey);
        if (!group || group.length === 0) return;

        let groupStartX = currentXForChildNodeLayout;
        group.forEach((child) => {
            const relDetails = getRelationshipToRoot(currentRootPersonData, child, membersMap);
            const parentSpouseOrderForNode = groupKey === -1 ? undefined : groupKey;
            addNodeToMap(child, groupStartX, childrenY, relDetails.label, 'child', undefined, parentSpouseOrderForNode);

            if (child.fatherId === currentRootPersonData.id || child.motherId === currentRootPersonData.id) {
                if (finalRootNodeInLayout) addParentChildEdge(finalRootNodeInLayout.id, child.id);
            }

            const coParentIdForEdge = (child.fatherId === currentRootPersonData.id) ? child.motherId : child.fatherId;
            if (coParentIdForEdge && localNewNodesMap.has(coParentIdForEdge) && sortedEverSpouses.some(s => s.id === coParentIdForEdge) ) {
                 addParentChildEdge(coParentIdForEdge, child.id);
            }

            groupStartX += NODE_WIDTH + CHILD_INTRA_GROUP_HORIZONTAL_GAP;
        });
        currentXForChildNodeLayout = groupStartX - CHILD_INTRA_GROUP_HORIZONTAL_GAP + CHILD_INTER_GROUP_HORIZONTAL_GAP;
    });

    const finalNodes = Array.from(localNewNodesMap.values());
    const uniqueEdgeIds = new Set<string>();
    const finalEdges = localNewEdges.filter(edge => {
      if (!uniqueEdgeIds.has(edge.id)) {
        uniqueEdgeIds.add(edge.id);
        return true;
      }
      return false;
    });

    setNodes(finalNodes);
    setEdges(finalEdges);

  }, [currentRootId, membersMap, setNodes, setEdges, originalUserProfile, allFamilyMembers]);


  if (!originalUserProfile || !currentRootId || !membersMap.get(currentRootId)) {
    return <div className="text-center p-8">Loading user profile or selected root for tree...</div>;
  }

  return (
    <div style={{ height: 'calc(100vh - 200px)', minHeight: '700px', width: '100%' }} className="rounded-lg shadow-inner border bg-muted/20 relative overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeReactFlow}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        snapToGrid={true}
        snapGrid={[15,15]}
        minZoom={0.1}
        maxZoom={2}
      >
        <Controls />
        <MiniMap nodeStrokeWidth={3} zoomable pannable />
        <Background gap={16} color="hsl(var(--border))" />
      </ReactFlow>
       <div className="absolute bottom-2 left-2 text-xs text-muted-foreground p-1 bg-background/50 rounded">
        Click any node to make it new center. Click current center to add relatives.
      </div>
    </div>
  );
}
