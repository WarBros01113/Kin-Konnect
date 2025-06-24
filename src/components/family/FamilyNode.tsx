
'use client';

import type { NodeProps } from 'reactflow';
import { memo } from 'react';
import { calculateAge } from '@/lib/utils';
import { User } from 'lucide-react'; 
import type { FamilyNodeData } from '@/types';
import { cn } from '@/lib/utils';

const FamilyNodeComponent = ({ data, selected }: NodeProps<FamilyNodeData>) => {
  let displayAgeOrStatus = '';
  if (data.isDeceased) {
    displayAgeOrStatus = "(Deceased)";
  } else if (data.dob && data.dob !== "N/A") {
    const age = calculateAge(data.dob);
    displayAgeOrStatus = age !== null ? `(Age: ${age})` : '';
  } else if (data.dob === "N/A") {
    displayAgeOrStatus = "(DOB: N/A)";
  }

  let divorcedStatusText = "";
  // Display "Divorced" if this node is an ex-spouse of the current tree root
  if (data.isDivorcedFromCurrentRoot && !data.isDeceased) {
    divorcedStatusText = "(Divorced)";
  }


  const displayDob = data.dob && data.dob !== "N/A" ? new Date(data.dob).toLocaleDateString() : (data.dob === "N/A" ? "" : "");

  const nodeBaseClasses = "p-3 border-2 rounded-lg shadow-lg w-44 text-center font-body transition-all duration-150";
  const selectedClasses = selected ? 'ring-2 ring-primary ring-offset-2' : '';

  let dynamicStyles: React.CSSProperties = {};
  let categoryClass = '';

  if (data.nodeCategory === 'parent' || data.nodeCategory === 'sibling') {
    categoryClass = 'border-kin-parent-sibling-border bg-kin-parent-sibling-bg';
  } else if (data.nodeCategory === 'spouse' || data.nodeCategory === 'child') {
    categoryClass = 'border-kin-spouse-child-border bg-kin-spouse-child-bg';
  } else {
    categoryClass = 'bg-card border-border';
  }

  if (data.nodeCategory === 'spouse' && data.spouseOrder !== undefined && data.spouseOrder < 20) {
    const order = data.spouseOrder;
    dynamicStyles = {
      borderColor: `hsl(var(--kin-spouse-${order}-border-h), var(--kin-spouse-${order}-border-s), var(--kin-spouse-${order}-border-l))`,
      backgroundColor: `hsl(var(--kin-spouse-${order}-bg-h), var(--kin-spouse-${order}-bg-s), var(--kin-spouse-${order}-bg-l))`,
    };
  } else if (data.nodeCategory === 'child' && data.parentSpouseOrder !== undefined && data.parentSpouseOrder < 20) {
    const order = data.parentSpouseOrder;
    dynamicStyles = {
      borderColor: `hsl(var(--kin-spouse-${order}-border-h), var(--kin-spouse-${order}-border-s), var(--kin-spouse-${order}-border-l))`,
      backgroundColor: `hsl(var(--kin-spouse-${order}-bg-h), var(--kin-spouse-${order}-bg-s), var(--kin-spouse-${order}-bg-l))`,
    };
  }
  
  // If node is marked as divorced from current root, override border/bg for visual distinction
  if (data.isDivorcedFromCurrentRoot && !data.isDeceased) {
    // Example: use a muted or specific "divorced" style.
    // For simplicity, we can just add a class or modify existing ones.
    // categoryClass = `${categoryClass} border-dashed border-destructive/50`; // Example
    dynamicStyles = {
        ...dynamicStyles,
        // borderStyle: 'dashed', // Not easily doable with tailwind vars directly
        // borderColor: 'hsl(var(--destructive))', // Example, use a specific variable if desired
    };
  }


  const nodeStyles = cn(nodeBaseClasses, selectedClasses, categoryClass);

  const nameTextClass = data.isDeceased ? 'text-muted-foreground line-through' : 'text-foreground';
  const detailTextClass = data.isDeceased ? 'text-muted-foreground/80' : 'text-muted-foreground';
  const iconClass = data.isDeceased ? 'text-muted-foreground' : 'text-foreground';

  const nameStyles = cn("font-headline font-semibold text-base truncate", nameTextClass);

  return (
    <div className={nodeStyles} style={dynamicStyles}>
      <div className="flex justify-center items-center mb-1">
        <User className={cn('w-6 h-6', iconClass)} />
      </div>
      <div className={nameStyles} title={data.name}>
        {data.name}
      </div>
      <div className={cn("text-xs italic mt-0.5 truncate", detailTextClass)} title={data.relationship}>
        {data.relationship}
      </div>

      {displayDob && (
        <div className={cn("text-xs mt-1", detailTextClass)}>
          {displayDob}
        </div>
      )}
       {displayAgeOrStatus && displayDob && (
         <div className={cn("text-xs mt-0.5", detailTextClass, data.isDeceased && 'font-medium')}>
            {displayAgeOrStatus}
         </div>
       )}
       {!displayDob && data.isDeceased && (
            <div className={cn("text-xs font-medium mt-0.5", detailTextClass)}>(Deceased)</div>
       )}
        {divorcedStatusText && (
          <div className={cn("text-xs mt-0.5 font-medium text-destructive/80", detailTextClass)}>
            {divorcedStatusText}
          </div>
        )}
        {data.gender && (
         <div className={cn("text-xs mt-0.5", detailTextClass)}>
            {data.gender}
         </div>
        )}
    </div>
  );
};

FamilyNodeComponent.displayName = 'FamilyNode';
export default memo(FamilyNodeComponent);
