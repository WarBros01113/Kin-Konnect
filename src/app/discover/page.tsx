'use client';

import AuthGuard from '@/components/AuthGuard';
import DiscoveryTool from '@/components/discovery/DiscoveryTool';
import { DatabaseZap } from 'lucide-react'; 

function DiscoverPageContent() {
  return (
    <div className="container mx-auto py-8">
      <header className="mb-8 text-center">
        <DatabaseZap className="w-16 h-16 mx-auto text-primary mb-4" />
        <h1 className="text-3xl sm:text-4xl font-headline font-bold text-primary">Discover Family Connections</h1>
        <p className="text-base sm:text-lg text-muted-foreground mt-3 max-w-2xl mx-auto">
          Uncover hidden branches of your family tree! KinKonnect helps you find potential relatives across our network by intelligently comparing shared ancestral details. Your next connection could be just a scan away.
        </p>
      </header>
      <DiscoveryTool />
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <AuthGuard>
      <DiscoverPageContent />
    </AuthGuard>
  );
}
