
'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { setUserHasAgreedToTerms } from '@/lib/firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileText } from 'lucide-react';
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function TermsAndConditionsPage() {
  const { user, authLoading, refreshAuthContext } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAgree = async () => {
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in to agree to the terms.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await setUserHasAgreedToTerms(user.uid);
      await refreshAuthContext(); // Refresh auth context to get the new 'hasAgreedToTerms' status
      toast({ title: 'Thank You!', description: 'Welcome to KinKonnect.' });
      router.push('/dashboard');
    } catch (error: any) {
      toast({ title: 'Error', description: `Failed to save your agreement. ${error.message}`, variant: 'destructive' });
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-4xl shadow-xl">
        <CardHeader className="text-center">
          <FileText className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle className="text-4xl font-headline text-primary">Terms and Conditions</CardTitle>
          <CardDescription>Please read and agree to our terms and privacy policy to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[50vh] w-full rounded-md border p-4 text-sm leading-relaxed">
            <div className="space-y-6">
              <h3 className="text-xl font-semibold font-headline">Welcome to KinKonnect!</h3>
              <p>These terms and conditions outline the rules and regulations for the use of KinKonnect's Website, located at this domain. By accessing this website we assume you accept these terms and conditions. Do not continue to use KinKonnect if you do not agree to take all of the terms and conditions stated on this page.</p>

              <h4 className="text-lg font-semibold font-headline">1. User Accounts</h4>
              <p>When you create an account with us, you must provide us with information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service. You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.</p>

              <h4 className="text-lg font-semibold font-headline">2. User Content & Data</h4>
              <p>Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, or other material ("Content"). You are responsible for the Content that you post to the Service, including its legality, reliability, and appropriateness. By posting Content to the Service, you grant us the right and license to use, modify, publicly perform, publicly display, reproduce, and distribute such Content on and through the Service for the purpose of operating and providing the Service.</p>
              <p>You retain any and all of your rights to any Content you submit, post or display on or through the Service and you are responsible for protecting those rights. You agree that this license includes the right for us to make your Content available to other users of the Service, who may also use your Content subject to these Terms, particularly through the "Discover" feature.</p>

              <h4 className="text-lg font-semibold font-headline">3. The "Discover" Feature</h4>
              <p>KinKonnect includes a "Discover" feature designed to help you find potential relatives by comparing your family tree data with that of other users. By setting your profile to "Public", you agree to allow our system to analyze your family tree data (such as names, dates of birth, places, etc.) and compare it with the data of other public profiles. The results will only show a summary of potential matches and will not expose your entire tree to non-connected users. To view full trees, a "Konnection" request must be sent and accepted.</p>
              <p>If you set your profile to "Private", your data will not be included in any Discover scans, and you will not be able to use the feature to find others.</p>
              
              <h4 className="text-lg font-semibold font-headline">4. Acceptable Use</h4>
              <p>You agree not to use the Service for any purpose that is illegal or prohibited by these Terms. You agree not to use the Service in any manner that could damage, disable, overburden, or impair the Service or interfere with any other party's use and enjoyment of the Service. You must not enter false, misleading, or defamatory information about living people.</p>

              <h2 className="text-2xl font-bold font-headline pt-6 border-t mt-8">Privacy Policy</h2>

              <h4 className="text-lg font-semibold font-headline">Information We Collect</h4>
              <p>We collect information you provide directly to us, including:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Account Information:</strong> Your name, email address, and password.</li>
                <li><strong>Profile and Family Tree Data:</strong> Any information you enter about yourself and your family members, such as names, dates, places, relationships, and stories. This is the core data of the application.</li>
              </ul>
              
              <h4 className="text-lg font-semibold font-headline">How We Use Information</h4>
              <p>We use the information we collect to:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Provide, maintain, and improve our Service.</li>
                <li>Operate the "Discover" feature to help you find potential relatives, if your profile is public.</li>
                <li>Communicate with you, including sending you service-related notifications.</li>
                <li>We do not sell your personal data to third parties for marketing purposes.</li>
              </ul>
              
              <h4 className="text-lg font-semibold font-headline">Data Sharing and Your Choices</h4>
              <p>Your information is shared with other users only in limited ways to facilitate family connections:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Public Profiles:</strong> If your profile is public, snippets of your data (e.g., names, dates of matching individuals) may be shown to other users as part of a "Discover" match result.</li>
                <li><strong>Konnections:</strong> Once you form a "Konnection" with another user, you grant them permission to view your full family tree details, and vice-versa.</li>
                <li><strong>Private Profiles:</strong> If your profile is private, your data is not shared with other users through the Discover feature.</li>
              </ul>

              <h4 className="text-lg font-semibold font-headline">Data Security</h4>
              <p>We use Firebase's robust security features to help protect your information. However, no electronic storage is 100% secure, and we cannot guarantee its absolute security.</p>
              
              <h4 className="text-lg font-semibold font-headline">Changes to This Policy</h4>
              <p>We may update our Terms and Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page. You are advised to review this Privacy Policy periodically for any changes.</p>
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Button onClick={handleAgree} className="w-full sm:w-1/2 text-lg py-6" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'I Read and Agree to the Terms'}
          </Button>
          <p className="text-xs text-muted-foreground">By clicking "I Agree," you confirm that you accept the terms and our privacy policy.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
