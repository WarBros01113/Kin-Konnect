'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn, sendPasswordReset, googleProvider } from '@/lib/firebase/auth';
import { auth } from '@/lib/firebase/config';
import { GoogleAuthProvider, signInWithPopup, linkWithCredential, type AuthCredential } from 'firebase/auth';
import { getUserProfile, updateUserProfile } from '@/lib/firebase/firestore';
import type { Profile } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail } from 'lucide-react';
import { Separator } from '@/components/ui/separator';


const GoogleIcon = () => (
    <svg role="img" viewBox="0 0 24 24" className="h-5 w-5 mr-2">
        <path fill="currentColor" d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.25,22C17.6,22 21.5,18.33 21.5,12.33C21.5,11.76 21.35,11.1 21.35,11.1V11.1Z"></path>
    </svg>
);


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  
  const [googleCredential, setGoogleCredential] = useState<AuthCredential | null>(null);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [emailForLinking, setEmailForLinking] = useState('');
  const [passwordForLinking, setPasswordForLinking] = useState('');
  const [linkingLoading, setLinkingLoading] = useState(false);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      toast({ title: 'Login Successful', description: 'Welcome back!' });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to login. Please check your credentials.');
      toast({ title: 'Login Failed', description: err.message || 'Please check your credentials.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const profile = await getUserProfile(userCredential.user.uid);
      if (!profile) {
        const { user } = userCredential;
        const initialProfileData: Partial<Omit<Profile, 'id' | 'userId'>> = {
          email: user.email!,
          name: user.displayName || user.email,
          aliasName: null,
          gender: 'Other',
          isDeceased: false,
          fatherId: null, motherId: null,
          spouseIds: [], divorcedSpouseIds: [], childIds: [], siblingIds: [],
          isPublic: true,
        };
        await updateUserProfile(user.uid, initialProfileData);
        toast({ title: 'Welcome!', description: 'Your account has been created. Please complete your profile.' });
        router.push('/profile');
      } else {
        toast({ title: 'Login Successful', description: 'Welcome back!' });
        router.push('/dashboard');
      }
    } catch (error: any) {
      if (error.code === 'auth/account-exists-with-different-credential') {
        const credential = GoogleAuthProvider.credentialFromError(error);
        setGoogleCredential(credential);
        setEmailForLinking(error.customData.email);
        setIsLinkDialogOpen(true);
      } else {
        setError(error.message || 'An unexpected error occurred during Google Sign-In.');
        toast({ title: 'Google Sign-In Failed', description: error.message, variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForLinking || !passwordForLinking || !googleCredential) {
      toast({ title: 'Error', description: 'Missing information to link accounts.', variant: 'destructive' });
      return;
    }
    setLinkingLoading(true);
    setError(null);
    try {
      const userCredential = await signIn(emailForLinking, passwordForLinking);
      if (userCredential.user) {
        await linkWithCredential(userCredential.user, googleCredential);
        toast({ title: 'Accounts Linked!', description: 'Your Google account is now linked successfully.' });
        router.push('/dashboard');
      }
    } catch (error: any) {
      setError(error.message);
      toast({ title: 'Linking Failed', description: error.message, variant: 'destructive' });
    } finally {
      setLinkingLoading(false);
      setIsLinkDialogOpen(false);
      setPasswordForLinking('');
    }
  };


  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordEmail) {
      toast({ title: 'Email Required', description: 'Please enter your email address.', variant: 'destructive' });
      return;
    }
    setForgotPasswordLoading(true);
    try {
      await sendPasswordReset(forgotPasswordEmail);
      toast({
        title: 'Password Reset Email Sent',
        description: 'If an account exists for this email, a password reset link has been sent.',
      });
      setIsForgotPasswordOpen(false); // Close dialog on success
      setForgotPasswordEmail(''); // Clear the email field
    } catch (err: any) {
      console.error("Forgot password error:", err);
      let errorMessage = 'Failed to send password reset email. Please try again.';
      if (err.code === 'auth/invalid-email') {
        errorMessage = 'The email address is not valid.';
      } else if (err.code === 'auth/user-not-found') {
        errorMessage = 'If an account exists for this email, a password reset link has been sent.';
         toast({
            title: 'Password Reset Email Sent',
            description: errorMessage,
        });
        setIsForgotPasswordOpen(false);
        setForgotPasswordEmail('');
        setForgotPasswordLoading(false);
        return;
      }
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen -mt-16">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline">Login to KinKonnect</CardTitle>
          <CardDescription>Enter your credentials to access your family tree.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
                Sign in with Google
            </Button>
            <div className="flex items-center">
                <Separator className="flex-1" />
                <span className="mx-4 text-xs text-muted-foreground">OR</span>
                <Separator className="flex-1" />
            </div>
          <form onSubmit={handleSubmit} className="space-y-6">
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
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full text-lg py-3" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Login'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2">
          <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
            <DialogTrigger asChild>
              <Button variant="link" className="p-0 h-auto text-sm text-primary hover:underline">
                Forgot Password?
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-headline text-2xl">Reset Your Password</DialogTitle>
                <DialogDescription>
                  Enter your registered email address below. We&apos;ll send you a link to reset your password.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="forgot-password-email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="forgot-password-email"
                      type="email"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="pl-8 text-base"
                    />
                  </div>
                </div>
                <DialogFooter className="sm:justify-start pt-2">
                   <Button type="submit" className="w-full sm:w-auto" disabled={forgotPasswordLoading}>
                    {forgotPasswordLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Send Reset Link'}
                  </Button>
                  <DialogClose asChild>
                    <Button type="button" variant="outline" className="w-full sm:w-auto">
                      Cancel
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Button variant="link" asChild className="p-0 h-auto">
              <Link href="/signup" className="font-medium text-primary hover:underline">
                Sign up
              </Link>
            </Button>
          </p>
        </CardFooter>
      </Card>
      
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Google Account</DialogTitle>
            <DialogDescription>
              An account already exists with the email <strong className="text-foreground">{emailForLinking}</strong>. Please enter your password for this account to link it with your Google Sign-In.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLinkAccount} className="space-y-4">
             <div className="space-y-2">
              <Label htmlFor="password-for-linking">Password</Label>
              <Input
                id="password-for-linking"
                type="password"
                value={passwordForLinking}
                onChange={(e) => setPasswordForLinking(e.target.value)}
                placeholder="Your existing account's password"
                required
              />
            </div>
             {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsLinkDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={linkingLoading}>
                {linkingLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Link Accounts
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
