'use client';

import type { NodeProps } from 'reactflow';
import { memo } from 'react';
import { calculateAge } from '@/lib/utils';
import { User } from 'lucide-react'; 
import type { FamilyNodeData } from '@/types';
import { cn } from '@/lib/utils';

const FamilyNodeComponent = ({ data, selected }: NodeProps<FamilyNodeData>) => {
  const displayDob = data.dob && data.dob !== "N/A" ? new Date(data.dob).toLocaleDateString() : (data.dob === "N/A" ? "" : "");

  let ageText = '';
  if (!data.isDeceased && data.dob && data.dob !== "N/A") {
    const age = calculateAge(data.dob);
    ageText = age !== null ? `Age: ${age}` : '';
  }

  const nodeBaseClasses = "p-3 border-2 rounded-lg shadow-lg w-44 text-center font-body transition-all duration-150";
  const selectedClasses = selected ? 'ring-2 ring-primary ring-offset-2' : '';
  const divorcedClasses = data.isDivorcedFromCurrentRoot ? 'border-dashed' : '';

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

  const nodeStyles = cn(nodeBaseClasses, selectedClasses, categoryClass, divorcedClasses);

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
      
      {data.isDeceased ? (
        <div className={cn("text-xs font-medium mt-0.5", detailTextClass)}>(Deceased)</div>
      ) : data.isDivorcedFromCurrentRoot ? (
        <div className={cn("text-xs font-medium text-destructive/80 mt-0.5", detailTextClass)}>(Divorced)</div>
      ) : null}

      {displayDob && (
        <div className={cn("text-xs mt-1", detailTextClass)}>
          {displayDob}
        </div>
      )}
       {ageText && (
         <div className={cn("text-xs mt-0.5", detailTextClass)}>
            ({ageText})
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
