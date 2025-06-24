
import type { FamilyMember, Profile, BasicPerson } from '@/types'; // Added BasicPerson
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { calculateAge } from '@/lib/utils';
import { Edit, Trash2, CalendarDays, User, MapPin, BookUser, Users2, UserPlus, Eye, Sparkles, VenetianMask, Link2 } from 'lucide-react'; // Added Link2 for generic relation

interface FamilyMemberCardProps {
  member: FamilyMember; // This member is from the user's collection
  onEdit: (member: FamilyMember) => void;
  onDelete: (memberId: string) => void;
  onAddRelativeTo: (member: BasicPerson) => void; // Anchor can be Profile or FamilyMember
  onViewTree: (memberId: string) => void;
  isCurrentRoot: boolean;
  isEditable: boolean; // New prop to control edit/delete/add actions
}

export default function FamilyMemberCard({
  member,
  onEdit,
  onDelete,
  onAddRelativeTo,
  onViewTree,
  isCurrentRoot,
  isEditable, // Use the new prop
}: FamilyMemberCardProps) {
  let ageString = "";
  if (member.isDeceased) {
    ageString = "Deceased";
  } else if (member.dob === "N/A" || !member.dob) {
    ageString = "N/A";
  } else {
    const age = calculateAge(member.dob);
    ageString = age !== null ? `${age} years old` : "N/A";
  }

  const displayDob = member.dob === "N/A" ? "N/A" : (member.dob ? new Date(member.dob).toLocaleDateString() : "N/A");

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
      <CardHeader className="flex flex-row items-start space-x-4 p-4">
        <div className="relative w-16 h-16 rounded-md bg-muted flex items-center justify-center flex-shrink-0 border border-muted-foreground/20">
          <User className="w-10 h-10 text-muted-foreground" />
        </div>
        <div className="flex-grow">
          <CardTitle className="text-2xl font-headline mb-1">{member.name}</CardTitle>
           <CardDescription className="text-primary flex items-center">
             <Link2 className="w-4 h-4 mr-1.5"/> Family Member {member.isDeceased ? "(Deceased)" : ""}
          </CardDescription>
        </div>
         {isEditable && (
            <Button variant="ghost" size="icon" onClick={() => onAddRelativeTo(member)} className="ml-auto flex-shrink-0">
            <UserPlus className="w-5 h-5" />
            <span className="sr-only">Add relative to {member.name}</span>
            </Button>
         )}
      </CardHeader>
      <CardContent className="p-4 space-y-3 flex-grow">
        <div className="flex items-center text-sm text-muted-foreground">
          <CalendarDays className="w-4 h-4 mr-2 text-accent" />
          Born: {displayDob}
          {!member.isDeceased && member.dob && member.dob !== "N/A" && ` (${ageString})`}
          {member.isDeceased && ` (${ageString})`}
          {member.dob === "N/A" && !member.isDeceased && " (Age: N/A)"}
        </div>
         {member.gender && (
          <div className="flex items-center text-sm text-muted-foreground">
            <VenetianMask className="w-4 h-4 mr-2 text-accent" />
            Gender: {member.gender}
          </div>
        )}
        {member.nativePlace && (
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 mr-2 text-accent" />
            Native Place: {member.nativePlace}
          </div>
        )}
        {member.currentPlace && (
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 mr-2 text-accent" />
            Current Place: {member.currentPlace}
          </div>
        )}
        {member.religion && (
          <div className="flex items-center text-sm text-muted-foreground">
            <BookUser className="w-4 h-4 mr-2 text-accent" />
            Religion: {member.religion}
          </div>
        )}
        {member.caste && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Users2 className="w-4 h-4 mr-2 text-accent" />
            Caste: {member.caste}
          </div>
        )}
        {member.stories && (
           <div className="mt-2 pt-2 border-t border-muted/50">
            <h4 className="text-xs font-semibold text-foreground mb-1 flex items-center">
                <Sparkles className="w-3 h-3 mr-1.5 text-accent" />
                Stories & Notes:
            </h4>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{member.stories}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 border-t flex flex-wrap items-center justify-between gap-y-2 gap-x-4">
        <div className="flex items-center">
            <Button
              variant={isCurrentRoot ? "default" : "outline"}
              size="sm"
              onClick={() => onViewTree(member.id)}
              disabled={isCurrentRoot}
            >
              <Eye className="w-4 h-4 mr-1" /> {isCurrentRoot ? "Viewing Tree" : "View Tree From Here"}
            </Button>
        </div>
        {isEditable && (
            <div className="flex flex-wrap items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(member)}>
                <Edit className="w-4 h-4 mr-1" /> Edit Details
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onDelete(member.id)}>
                <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
            </div>
        )}
      </CardFooter>
    </Card>
  );
}
