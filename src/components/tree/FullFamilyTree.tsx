
'use client';

import React from 'react';
import type { BasicPerson } from '@/types'; 

interface TreeNode extends BasicPerson {
  children: TreeNode[];
  generationLevel: number;
  color?: string;
  spouseGroupIndex?: number;
}

interface FullFamilyTreeProps {
  treeRoot: TreeNode | null;
}

export default function FullFamilyTree({ treeRoot }: FullFamilyTreeProps) {
  const renderPerson = (person: TreeNode, level: number) => (
    <div 
      key={person.id} 
      className="p-3 border rounded-lg shadow-md my-2"
      style={{ 
        marginLeft: `${level * 25}px`,
        borderColor: person.color || 'hsl(var(--border))',
        borderWidth: '2px',
        backgroundColor: person.color ? `${person.color.replace(')', ', 0.1)').replace('hsl', 'hsla')}` : 'hsl(var(--card))'
      }}
    >
      <p className="font-bold text-lg">{person.name || 'Unnamed'}</p>
      <p className="text-sm text-muted-foreground">
        ID: {person.id.substring(0,8)}...
      </p>
      <p className="text-sm text-muted-foreground">
        Generation: {person.generationLevel !== undefined ? person.generationLevel : 'N/A'}
      </p>
      {person.dob && <p className="text-xs">DOB: {person.dob === "N/A" ? "N/A" : new Date(person.dob).toLocaleDateString()}</p>}
      {person.isDeceased && <p className="text-xs text-destructive-foreground bg-destructive/80 px-1 rounded-sm inline-block">Deceased</p>}
      {person.gender && <p className="text-xs">Gender: {person.gender}</p>}
      
      {person.spouseIds && person.spouseIds.length > 0 && (
        <p className="text-xs">Spouse(s): {person.spouseIds.length}</p>
      )}
      
      {person.spouseGroupIndex !== undefined && person.color && (
        <div className="flex items-center mt-1">
           <span className="text-xs mr-1">Child of spouse group:</span>
           <div style={{width: '10px', height: '10px', backgroundColor: person.color, borderRadius: '2px', border: '1px solid hsl(var(--foreground))' }}></div>
           <span className="text-xs ml-1">{person.spouseGroupIndex + 1}</span>
        </div>
      )}


      {person.children && person.children.length > 0 && (
        <div className="mt-2 pt-2 border-t border-dashed border-muted-foreground/30">
          {person.children.map(child => renderPerson(child, level + 1))}
        </div>
      )}
    </div>
  );

  if (!treeRoot) {
    return <p className="text-center text-muted-foreground">No tree data available or root person not found.</p>;
  }

  return <div className="overflow-x-auto p-1">{renderPerson(treeRoot, 0)}</div>;
}
