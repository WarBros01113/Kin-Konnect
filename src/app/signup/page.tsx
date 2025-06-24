
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUp, googleProvider } from '@/lib/firebase/auth';
import { auth } from '@/lib/firebase/config';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile, getUserProfile } from '@/lib/firebase/firestore';
import type { Profile } from '@/types';
import { Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const GoogleIcon = () => (
    <svg role="img" viewBox="0 0 24 24" className="h-5 w-5 mr-2">
        <path fill="currentColor" d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.25,22C17.6,22 21.5,18.33 21.5,12.33C21.5,11.76 21.35,11.1 21.35,11.1V11.1Z"></path>
    </svg>
);


export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      toast({ title: 'Signup Failed', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const user = await signUp(email, password);
      if (user) {
        // Create a basic profile with new graph-based fields
        const initialProfileData: Partial<Omit<Profile, 'id' | 'userId'>> = {
          email: user.email!, // Ensure email is included
          name: user.displayName || user.email,
          aliasName: null,
          gender: 'Other',
          isDeceased: false,
          fatherId: null,
          motherId: null,
          spouseIds: [],
          divorcedSpouseIds: [],
          childIds: [],
          siblingIds: [],
          isPublic: true, // Default to public
        };
        await updateUserProfile(user.uid, initialProfileData);
        toast({ title: 'Signup Successful', description: 'Welcome to KinKonnect! Please complete your profile.' });
        router.push('/profile');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up. Please try again.');
      toast({ title: 'Signup Failed', description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;
      const profile = await getUserProfile(user.uid);
      
      if (!profile) {
        const initialProfileData: Partial<Omit<Profile, 'id' | 'userId'>> = {
          email: user.email!,
          name: user.displayName || user.email,
          aliasName: null,
          gender: 'Other',
          isDeceased: false,
          fatherId: null,
          motherId: null,
          spouseIds: [],
          divorcedSpouseIds: [],
          childIds: [],
          isPublic: true,
        };
        await updateUserProfile(user.uid, initialProfileData);
        toast({ title: 'Signup Successful', description: 'Welcome! Please complete your profile.' });
        router.push('/profile');
      } else {
        toast({ title: 'Login Successful', description: 'Welcome back!' });
        router.push('/dashboard');
      }
    } catch (error: any) {
      if (error.code === 'auth/account-exists-with-different-credential') {
        toast({
          title: 'Account Exists',
          description: 'This email is already registered. Please log in to link your Google account.',
          variant: 'destructive',
          duration: 7000
        });
        router.push('/login');
      } else {
        setError(error.message);
        toast({ title: 'Google Sign-Up Failed', description: error.message, variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex items-center justify-center min-h-screen -mt-16">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline">Create your KinKonnect Account</CardTitle>
          <CardDescription>Join our community and start building your family tree.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full" onClick={handleGoogleSignUp} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
            Sign up with Google
          </Button>
          <div className="flex items-center">
              <Separator className="flex-1" />
              <span className="mx-4 text-xs text-muted-foreground">OR</span>
              <Separator className="flex-1" />
          </div>
          <form onSubmit={handleEmailSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="text-base"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full text-lg py-3" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Sign Up with Email'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Button variant="link" asChild className="p-0 h-auto">
              <Link href="/login" className="font-medium text-primary hover:underline">
                Login
              </Link>
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
