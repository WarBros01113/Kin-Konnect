
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/providers/AuthProvider';
import { getUserProfile, getFamilyMembers } from '@/lib/firebase/firestore';
import type { Profile, FamilyMember, BasicPerson, CalendarEvent } from '@/types';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, CalendarDays, Gift, Users as UsersIconLucide, AlertTriangle, User as UserIconLucideSingle, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, getYear, getMonth, getDate, setYear, isSameDay, parseISO } from 'date-fns';
import { getOrdinal, cn } from '@/lib/utils';
import type { DayProps as RDPDayProps, CaptionProps } from 'react-day-picker';
import { useDayPicker, useNavigation } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


function CustomCaption(props: CaptionProps) {
  const { displayMonth } = props;
  const { goToMonth, nextMonth, previousMonth } = useNavigation();
  const { fromYear, toYear } = useDayPicker();

  const years = [];
  if (fromYear && toYear) {
    for (let i = fromYear; i <= toYear; i++) {
      years.push(i);
    }
  } else {
    const currentDisplayYear = displayMonth.getFullYear();
    for (let i = currentDisplayYear - 5; i <= currentDisplayYear + 5; i++) {
      years.push(i);
    }
  }

  const months = Array.from({ length: 12 }, (_, i) => new Date(displayMonth.getFullYear(), i, 1));

  const handleYearChange = (value: string) => {
    const newYear = parseInt(value, 10);
    const newMonthDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth());
    newMonthDate.setFullYear(newYear);
    goToMonth(newMonthDate);
  };

  const handleMonthChange = (value: string) => {
    const newMonthIndex = parseInt(value, 10);
    const newDate = new Date(props.displayMonth.getFullYear(), newMonthIndex);
    goToMonth(newDate);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 mb-2 border-b">
      <div className="flex items-center">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => previousMonth && goToMonth(previousMonth)}
          disabled={!previousMonth}
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="sr-only">Previous month</span>
        </Button>
        <span className="mx-3 text-lg font-semibold text-foreground text-center">
          {format(displayMonth, 'MMMM yyyy')}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => nextMonth && goToMonth(nextMonth)}
          disabled={!nextMonth}
        >
          <ChevronRight className="h-5 w-5" />
          <span className="sr-only">Next month</span>
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <Select
          value={props.displayMonth.getMonth().toString()}
          onValueChange={handleMonthChange}
        >
          <SelectTrigger className="w-[130px] h-9 text-sm">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {months.map((monthDate, index) => (
              <SelectItem key={index} value={index.toString()}>
                {format(monthDate, 'MMMM')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={props.displayMonth.getFullYear().toString()}
          onValueChange={handleYearChange}
        >
          <SelectTrigger className="w-[90px] h-9 text-sm">
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}


function FamilyCalendarPageContent() {
  const { user: authUser } = useAuth();
  const [allPeople, setAllPeople] = useState<BasicPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentDisplayMonth, setCurrentDisplayMonth] = useState<Date>(new Date());

  useEffect(() => {
    if (authUser) {
      setLoading(true);
      setError(null);
      Promise.all([getUserProfile(authUser.uid), getFamilyMembers(authUser.uid)])
        .then(([profile, members]) => {
          const combined: BasicPerson[] = [];
          if (profile) combined.push(profile);
          combined.push(...members.filter(fm => !fm.isAlternateProfile));
          setAllPeople(combined);
        })
        .catch(err => {
          console.error("Error fetching data for calendar:", err);
          setError(err.message || "Could not load family data.");
        })
        .finally(() => setLoading(false));
    }
  }, [authUser]);

  const peopleMap = useMemo(() => new Map(allPeople.map(p => [p.id, p])), [allPeople]);

  const eventsForCurrentDisplayMonth = useMemo(() => {
    const events: CalendarEvent[] = [];
    const year = getYear(currentDisplayMonth);
    const monthIndex = getMonth(currentDisplayMonth);

    allPeople.forEach(person => {
      // Birthdays
      if (person.dob && person.dob !== "N/A") {
        try {
          const dobDate = parseISO(person.dob);
          if (getMonth(dobDate) === monthIndex) {
            const birthdayThisYear = setYear(dobDate, year);
            const age = year - getYear(dobDate);
            if (age >=0 ) {
              events.push({
                id: `${person.id}-birthday-${year}`,
                date: birthdayThisYear,
                type: 'birthday',
                title: `${person.name || 'Member'}'s ${getOrdinal(age)} Birthday`,
                description: `Born ${format(dobDate, 'PPP')}`,
                personId1: person.id,
                personName1: person.name || 'Member',
                originalEventDate: person.dob,
              });
            }
          }
        } catch (e) { console.warn(`Invalid DOB for ${person.name}: ${person.dob}`); }
      }

      // Anniversaries (New logic for per-spouse dates)
      if (person.spouseIds && person.spouseIds.length > 0 && person.anniversaryDates) {
        for (const spouseId of person.spouseIds) {
          if (person.id < spouseId) { // Process each pair only once
            const spouse = peopleMap.get(spouseId);
            const anniversaryDateStr = person.anniversaryDates[spouseId];
            if (spouse && anniversaryDateStr && anniversaryDateStr !== "N/A") {
              try {
                const annivDateOrig = parseISO(anniversaryDateStr);
                if (getMonth(annivDateOrig) === monthIndex) {
                  const anniversaryThisYear = setYear(annivDateOrig, year);
                  const yearsMarried = year - getYear(annivDateOrig);
                  if (yearsMarried >= 0) {
                    events.push({
                      id: `${person.id}-${spouse.id}-anniversary-${year}`,
                      date: anniversaryThisYear,
                      type: 'anniversary',
                      title: `${getOrdinal(yearsMarried)} Anniv: ${person.name} & ${spouse.name}`,
                      description: `Married on ${format(annivDateOrig, 'PPP')}`,
                      personId1: person.id,
                      personName1: person.name || 'Person 1',
                      personId2: spouse.id,
                      personName2: spouse.name || 'Person 2',
                      originalEventDate: anniversaryDateStr,
                    });
                  }
                }
              } catch (e) { console.warn(`Invalid anniversaryDate for ${person.name} & ${spouse.name}: ${anniversaryDateStr}`); }
            }
          }
        }
      }
      
      // Death Anniversaries
      if (person.isDeceased && person.deceasedDate && person.deceasedDate !== "N/A") {
         try {
          const deceasedDateOrig = parseISO(person.deceasedDate);
           if (getMonth(deceasedDateOrig) === monthIndex) {
            const deathAnnivThisYear = setYear(deceasedDateOrig, year);
            const yearsSinceDeath = year - getYear(deceasedDateOrig);
            if (yearsSinceDeath >= 0) {
              events.push({
                id: `${person.id}-death-anniversary-${year}`,
                date: deathAnnivThisYear,
                type: 'death-anniversary',
                title: `${getOrdinal(yearsSinceDeath)} Remembrance: ${person.name || 'Member'}`,
                description: `Passed on ${format(deceasedDateOrig, 'PPP')}`,
                personId1: person.id,
                personName1: person.name || 'Member',
                originalEventDate: person.deceasedDate,
              });
            }
          }
        } catch (e) { console.warn(`Invalid deceasedDate for ${person.name}: ${person.deceasedDate}`); }
      }
    });
    // Sort events by date, then type, then title
    return events.sort((a, b) => {
        const dateComparison = a.date.getTime() - b.date.getTime();
        if (dateComparison !== 0) return dateComparison;
        
        const typeOrder = { 'birthday': 1, 'anniversary': 2, 'death-anniversary': 3 };
        // @ts-ignore
        const typeComparison = typeOrder[a.type] - typeOrder[b.type];
        if (typeComparison !== 0) return typeComparison;
        
        return a.title.localeCompare(b.title);
      });
  }, [allPeople, currentDisplayMonth, peopleMap]);


  const DayWithEvents = (dayPickerProps: RDPDayProps) => {
    const { date, displayMonth: _displayMonthInternal, ...buttonDOMProps } = dayPickerProps;

    const eventsOnDay = useMemo(() =>
      eventsForCurrentDisplayMonth.filter(event => isSameDay(event.date, date)),
    [date, eventsForCurrentDisplayMonth]);

    return (
      <button
        type="button"
        {...buttonDOMProps} 
        className={cn(
          (buttonDOMProps as any).className,
          "relative flex flex-col items-center justify-center"
        )}
      >
        <span className="absolute top-1.5">{getDate(date)}</span>
        {eventsOnDay.length > 0 && (
          <div className="absolute bottom-1 flex space-x-0.5">
            {eventsOnDay.slice(0,3).map(event => (
              <span key={event.id} className={cn(
                "w-1.5 h-1.5 rounded-full",
                event.type === 'birthday' && 'bg-blue-500',
                event.type === 'anniversary' && 'bg-pink-500',
                event.type === 'death-anniversary' && 'bg-gray-500',
              )}></span>
            ))}
          </div>
        )}
      </button>
    );
  };

  const currentCalendarYear = getYear(new Date());
  const fromYearVal = currentCalendarYear - 100;
  const toYearVal = currentCalendarYear + 50;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading family calendar...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4 text-center">
         <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive mb-2">Error Loading Calendar</h1>
        <p className="text-destructive-foreground bg-destructive/10 p-3 rounded-md mb-4">{error}</p>
         <p className="text-muted-foreground">Please try refreshing the page. If the problem persists, check your connection or contact support.</p>
      </div>
    );
  }
  
  if (allPeople.length === 0) {
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4 text-center">
         <UserIconLucideSingle className="h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold text-primary mb-2">Family Data Needed</h1>
        <p className="text-muted-foreground">Add family members with birth dates, anniversaries, or deceased dates to see events on the calendar.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center">
            <CalendarDays className="mr-3 h-8 w-8 text-primary" /> Family Calendar
          </CardTitle>
          <CardDescription>
            View important life events for your family members. Navigate months and years using the controls above the calendar.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-2/3">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={currentDisplayMonth}
              onMonthChange={setCurrentDisplayMonth}
              className="rounded-md border p-3 w-full"
              components={{ Day: DayWithEvents, Caption: CustomCaption }}
              fromYear={fromYearVal}
              toYear={toYearVal}
              modifiersClassNames={{
                selected: 'bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary focus:text-primary-foreground',
                today: 'bg-accent text-accent-foreground',
              }}
            />
          </div>
          <div className="lg:w-1/3 space-y-4">
            <h3 className="text-xl font-semibold border-b pb-2">
              Events in {format(currentDisplayMonth, 'MMMM yyyy')}
            </h3>
            {eventsForCurrentDisplayMonth.length > 0 ? (
              <ul className="space-y-3 max-h-[300px] lg:max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                {eventsForCurrentDisplayMonth.map(event => (
                  <li key={event.id} className="p-3 rounded-md border bg-muted/30">
                     <p className="text-xs text-muted-foreground mb-1">{format(event.date, 'MMMM do')}</p>
                    <div className="flex items-center mb-1">
                       {event.type === 'birthday' && <Gift className="w-5 h-5 mr-2 text-blue-500 flex-shrink-0" />}
                       {event.type === 'anniversary' && <UsersIconLucide className="w-5 h-5 mr-2 text-pink-500 flex-shrink-0" />}
                       {event.type === 'death-anniversary' && <UserIconLucideSingle className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0" />}
                      <strong className="text-sm">{event.title}</strong>
                    </div>
                    {event.description && <p className="text-xs text-muted-foreground">{event.description}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No events for this month.</p>
            )}
             <div className="mt-4 pt-4 border-t">
                <h4 className="font-medium text-sm mb-2">Event Types:</h4>
                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-blue-500 mr-1.5"></span>Birthday</div>
                    <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-pink-500 mr-1.5"></span>Anniversary</div>
                    <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-gray-500 mr-1.5"></span>Remembrance</div>
                </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function FamilyCalendarPage() {
  return (
    <AuthGuard>
      <FamilyCalendarPageContent />
    </AuthGuard>
  );
}
