import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/providers/AuthProvider';
import Navbar from '@/components/Navbar';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/ThemeProvider';
import TermsGuard from '@/components/TermsGuard'; // Import the new guard

export const metadata: Metadata = {
  title: 'KinKonnect',
  description: 'Connect with your family.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Alegreya&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet"></link>

        {/* Favicon Tags */}
        <link rel="icon" href="/images/tab_logo.jpg" type="image/jpg" />
        <link rel="apple-touch-icon" href="/images/tab_logo.jpg" />
        
      </head>
      <body className="font-body antialiased" suppressHydrationWarning={true}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <TermsGuard>
              <Navbar />
              <main className="container mx-auto px-4 py-8">
                {children}
              </main>
              <Toaster />
            </TermsGuard>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
