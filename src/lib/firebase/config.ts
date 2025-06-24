
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfigValues = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const placeholderConfigValues = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// Use fallbacks if environment variables are not set
const firebaseConfig = {
  apiKey: firebaseConfigValues.apiKey || placeholderConfigValues.apiKey,
  authDomain: firebaseConfigValues.authDomain || placeholderConfigValues.authDomain,
  projectId: firebaseConfigValues.projectId || placeholderConfigValues.projectId,
  storageBucket: firebaseConfigValues.storageBucket || placeholderConfigValues.storageBucket,
  messagingSenderId: firebaseConfigValues.messagingSenderId || placeholderConfigValues.messagingSenderId,
  appId: firebaseConfigValues.appId || placeholderConfigValues.appId,
};

// Check if critical Firebase config values are still using placeholders
if (
  !firebaseConfig.apiKey || firebaseConfig.apiKey === placeholderConfigValues.apiKey ||
  !firebaseConfig.authDomain || firebaseConfig.authDomain === placeholderConfigValues.authDomain ||
  !firebaseConfig.projectId || firebaseConfig.projectId === placeholderConfigValues.projectId
) {
  let missingVars = [];
  if (!firebaseConfigValues.apiKey) missingVars.push("NEXT_PUBLIC_FIREBASE_API_KEY");
  if (!firebaseConfigValues.authDomain) missingVars.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  if (!firebaseConfigValues.projectId) missingVars.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");

  const errorMessage =
    "Firebase configuration is missing or using placeholder values. " +
    "This will cause network errors (like net::ERR_NAME_NOT_RESOLVED). " +
    "Please ensure your Firebase environment variables are set correctly in your Firebase Studio project settings. " +
    (missingVars.length > 0 ? `Missing or using placeholders for: ${missingVars.join(", ")}.` : "");
  
  // In a client-side context, throwing an error here might be too disruptive at the module level.
  // Instead, we can log a prominent error. For server-side (which this file could be imported into), an error is fine.
  // For client-side, a persistent console error is better than breaking the app immediately at import time.
  console.error("CRITICAL FIREBASE CONFIGURATION ERROR:", errorMessage);
  // If this code runs early in the app's lifecycle on the client, this error might not stop execution but will log.
  // Depending on where Firebase services are first called, the SDK might then throw its own errors.
}


let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

export { app, auth, db, storage };
