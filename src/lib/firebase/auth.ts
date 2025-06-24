import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  sendPasswordResetEmail, // Import sendPasswordResetEmail
  User as FirebaseUser,
  Auth,
  GoogleAuthProvider,
} from 'firebase/auth';
import type { User } from '@/types';
import { auth } from './config';

export const googleProvider = new GoogleAuthProvider();

export const signUp = async (email: string, password: string): Promise<User | null> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const signIn = async (email: string, password: string): Promise<User | null> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const signOut = async (): Promise<void> => {
  return firebaseSignOut(auth);
};

export const onAuthChanged = (callback: (user: User | null) => void) => {
  return firebaseOnAuthStateChanged(auth, (user) => {
    callback(user as User | null);
  });
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser as User | null;
};

// New function to send password reset email
export const sendPasswordReset = async (email: string): Promise<void> => {
  return sendPasswordResetEmail(auth, email);
};
