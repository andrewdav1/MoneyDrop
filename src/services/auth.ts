// Authentication logic
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signOut,
    User
  } from 'firebase/auth';
  import { auth } from './firebase';
  
  // Sign up new user
  export const signUp = async (email: string, password: string): Promise<User> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error: any) {
      throw new Error(error.message);
    }
  };
  
  // Sign in existing user
  export const signIn = async (email: string, password: string): Promise<User> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error: any) {
      throw new Error(error.message);
    }
  };
  
  // Sign out
  export const logOut = async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };// Authentication service
