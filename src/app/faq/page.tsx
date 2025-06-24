
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const faqs = [
    {
        question: "Where do I enter my initials?",
        answer: "Initials should always be placed at the end of the name (e.g., 'Arjun Narayanan R'). This helps with standardization and searching."
    },
    {
        question: "Why is the sibling order required?",
        answer: "If you don’t know the exact date of birth of a person, but you know their order among siblings (e.g., eldest or youngest), this helps maintain the correct sibling sequence in the tree and improves sorting accuracy."
    },
    {
        question: "What if I don’t know the exact spelling of a person's name?",
        answer: "Our system compares the date of birth, name, and birthplace between trees. Minor spelling mistakes are usually handled by the matching algorithm, but if the name is completely different, it will be treated as a human error. If you know the person, try contacting them for the correct name. If not, ensure other fields like DOB and birthplace are accurate to help identify a potential match."
    },
    {
        question: "What if I only know the name and nothing else about the person?",
        answer: "Try to enter the name with the correct spelling. Even if it’s not accurate, include other known information such as their children or related fields if possible. These details can significantly help in matching the person correctly in the Discover scan."
    },
    {
        question: "How do I add multiple spouses?",
        answer: "Click on the person you want to add a spouse to, then select 'Add Family Member' and choose 'Spouse'. The system will automatically identify them as the next spouse in order. You can add as many spouses as needed."
    },
    {
        question: "How do I add children for a person with multiple spouses?",
        answer: "First, add the child to one of the parents. For example, go to the father's profile and add a 'Son' or 'Daughter'. If the father has multiple spouses, the system will prompt you to select the other parent (the mother) from the list of spouses. This correctly links the child to both parents."
    },
    {
        question: "What is the difference between a public and private profile?",
        answer: "If your profile is set to Private, your tree will not be visible to others when they use the 'Discover' feature. It’s like creating your family tree in isolation. A Public profile allows your tree to be included in discovery scans, helping you find and be found by potential relatives."
    },
    {
        question: "Do I need to fill in the optional fields?",
        answer: "Yes, it's highly recommended. The more details you provide (like birthplace, religion, caste), the more accurate the matching algorithm becomes when comparing your tree with others."
    },
    {
        question: "What should I write in the short description on my profile?",
        answer: "You can mention your current job, the name of your company, your position, and any activities you’re involved in (e.g., social service, volunteering, etc.). This adds a personal touch to your profile."
    },
    {
        question: "How does the 'Discover' feature work?",
        answer: "The Discover scan compares your family tree data (names, DOBs, places, etc.) with all other public trees in the KinKonnect network. It uses a scoring system to find trees that have significant overlaps with yours, suggesting potential family connections you might not have known about."
    },
    {
        question: "What is a 'Konnection'?",
        answer: "A Konnection is a confirmed link between you and another KinKonnect user. After discovering a potential match, you can send a 'Konnect Request'. Once they accept, you become Konnected, which allows you to view each other's full family trees."
    },
    {
        question: "What events appear on the Family Calendar?",
        answer: "The calendar automatically shows important dates for all members in your tree, including birthdays, anniversaries with spouses, and the anniversaries of members who have passed away (remembrances)."
    }
];


export default function FaqPage() {
  return (
    <div className="container mx-auto py-12">
      <Card className="max-w-3xl mx-auto shadow-xl">
        <CardHeader className="text-center">
          <HelpCircle className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle className="text-4xl font-headline text-primary">Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="px-4 md:px-8 py-6">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem value={`item-${index}`} key={index}>
                <AccordionTrigger className="text-left font-semibold text-lg hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground leading-relaxed pt-2">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="text-center mt-10">
            <Button asChild>
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
