
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Info } from 'lucide-react';

export default function AboutUsPage() {
  return (
    <div className="container mx-auto py-12">
      <Card className="max-w-3xl mx-auto shadow-xl">
        <CardHeader className="text-center">
          <Info className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle className="text-4xl font-headline text-primary">About KinKonnect</CardTitle>
        </CardHeader>
        <CardContent className="text-lg text-foreground/80 leading-relaxed space-y-6 px-8 py-6">
          <p>
            KinKonnect is a modern family tree and relationship discovery platform built to help you connect, understand, and celebrate your roots. Whether you&apos;re documenting your close family or discovering long-lost relatives, KinKonnect makes it easy, visual, and meaningful.
          </p>
          <p>
            We believe that family is more than just names on a chart — it’s a story, a connection, a legacy. Our app allows users to build interactive family trees, send connection requests, and explore shared ancestry in an intuitive way.
          </p>
          <p>
            From grandparents to cousins to newly found kin, KinKonnect helps preserve your family history and lets you build your lineage with love and accuracy.
          </p>
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
