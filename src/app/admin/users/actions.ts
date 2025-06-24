
'use server';

import { deleteUserAccount } from '@/lib/firebase/firestore';

// Action to delete a user's Firestore data
export async function deleteUserAction(userId: string): Promise<{ success: boolean, error?: string, errorCode?: string }> {
  console.log(`[Admin Action] Server Action invoked to delete user: ${userId}.`);
  try {
    // We can't directly get request.auth.uid here easily without Admin SDK or passing it from client (which isn't ideal for security checks)
    // The Firebase client SDK calls within deleteUserAccount will use the currently authenticated user's context from the session.
    console.log(`[Admin Action] Attempting to delete user: ${userId}.`);
    await deleteUserAccount(userId);
    console.log(`[Admin Action] Successfully processed deleteUserAccount for user: ${userId}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[Admin Action] Error processing deleteUserAccount for user ${userId}. Firebase Error Code: ${error.code || 'N/A'}, Message: ${error.message}`, error);
    
    let clientErrorMessage = `Failed to delete user. Please check server logs for details.`;
    if (error.code) {
        clientErrorMessage = `Error deleting user (Code: ${error.code}): ${error.message}. Please meticulously verify your Firestore security rules and ensure the current logged-in admin user's document in Firestore has 'isAdmin: true' (boolean). Check browser console and Firebase Console (Functions logs if applicable, Firestore operation logs if available for rejections) for further details.`;
    } else if (error.message) {
         clientErrorMessage = `Error deleting user: ${error.message}. Please meticulously verify your Firestore security rules and ensure the current logged-in admin user's document in Firestore has 'isAdmin: true' (boolean). Check browser console and Firebase Console for further details.`;
    }
    
    return { success: false, error: clientErrorMessage, errorCode: error.code };
  }
}

