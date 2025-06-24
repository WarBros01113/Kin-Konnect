'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Instagram, Youtube, Info as InfoIcon, Mail, HelpCircle, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';


export default function AppFooter() {
  const { toast } = useToast();

  const handleTvaresClick = () => {
    toast({
      title: 'TVARES',
      description: 'TVARES official website coming soon.',
    });
  };

  const feedbackEmail = "shortfilm01113@gmail.com";
  const feedbackSubject = "Feedback for KinKonnect App";
  
  const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(feedbackEmail)}&su=${encodeURIComponent(feedbackSubject)}`;

  return (
    <footer className="mt-16 py-8 bg-primary/10 dark:bg-muted/20 text-foreground/80 dark:text-foreground/70 rounded-lg shadow-md">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 items-start mb-8">
          
          <div className="md:col-span-1 space-y-3">
            <h3 className="text-lg font-semibold text-primary dark:text-primary">Connect & Explore</h3>
            <div className="flex flex-col items-start space-y-2">
              <Button variant="link" asChild className="p-0 h-auto text-foreground/70 hover:text-primary dark:text-foreground/60 dark:hover:text-primary">
                <Link href="/about" className="flex items-center">
                  <InfoIcon className="h-5 w-5 mr-2" /> About Us
                </Link>
              </Button>
               <Button variant="link" asChild className="p-0 h-auto text-foreground/70 hover:text-primary dark:text-foreground/60 dark:hover:text-primary">
                <Link href="/faq" className="flex items-center">
                  <HelpCircle className="h-5 w-5 mr-2" /> FAQs
                </Link>
              </Button>
               <Button variant="link" asChild className="p-0 h-auto text-foreground/70 hover:text-primary dark:text-foreground/60 dark:hover:text-primary">
                <Link href="/terms" className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" /> Terms & Conditions
                </Link>
              </Button>
              <a
                href="https://www.instagram.com/kin_konnect?igsh=aXhibXh0ZTVkcWdu"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="KinKonnect Instagram"
                className={cn(buttonVariants({ variant: "link" }), "p-0 h-auto flex items-center text-foreground/70 hover:text-primary dark:text-foreground/60 dark:hover:text-primary")}
              >
                <Instagram className="h-5 w-5 mr-2" /> Instagram
              </a>
              <a
                href="https://www.youtube.com/channel/UCPWETTbRubkb3NL2PmMRYMQ"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="KinKonnect YouTube"
                className={cn(buttonVariants({ variant: "link" }), "p-0 h-auto flex items-center text-foreground/70 hover:text-primary dark:text-foreground/60 dark:hover:text-primary")}
              >
                <Youtube className="h-5 w-5 mr-2" /> YouTube
              </a>
            </div>
          </div>

          <div className="md:col-span-2 flex flex-col md:items-end">
            <h3 className="text-lg font-semibold text-primary dark:text-primary mb-3 md:text-right">Share Your Thoughts</h3>
            <a
              href={gmailComposeUrl}
              target="_blank" 
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "default", size: "default" }), 
                "w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90"
              )}
            >
              <Mail className="h-5 w-5 mr-2" /> Send Feedback via Gmail
            </a>
            <p className="text-xs text-muted-foreground mt-2 md:text-right">
              This will open Gmail in your browser.
            </p>
          </div>
        </div>

        <div className="border-t border-primary/20 dark:border-muted/30 pt-6 text-center text-xs text-muted-foreground dark:text-muted-foreground/80 space-y-1">
          <p>&copy; {new Date().getFullYear() + 1} All rights reserved.</p>
          <p>
            A product of{' '}
            <Button
              variant="link"
              onClick={handleTvaresClick}
              className="p-0 h-auto text-xs text-primary hover:text-primary/80 dark:text-primary dark:hover:text-primary/70 hover:underline"
            >
              TVARES
            </Button>
          </p>
        </div>
      </div>
    </footer>
  );
}