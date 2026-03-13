import { create } from "zustand";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { User } from "@/types";
import { getUser, createUser } from "@/lib/firestore";

interface AuthState {
  firebaseUser: FirebaseUser | null;
  appUser: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  setFirebaseUser: (user: FirebaseUser | null) => void;
  setAppUser: (user: User | null) => void;
  initialize: () => () => void; // returns unsubscribe fn
}

export const useAuthStore = create<AuthState>((set, get) => ({
  firebaseUser: null,
  appUser: null,
  isLoading: true,
  isInitialized: false,

  setFirebaseUser: (user) => set({ firebaseUser: user }),
  setAppUser: (user) => set({ appUser: user }),

  initialize: () => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      set({ firebaseUser, isLoading: true });

      if (firebaseUser) {
        let appUser = await getUser(firebaseUser.uid);
        if (!appUser) {
          // First login — provision the user document
          await createUser(firebaseUser.uid, firebaseUser.phoneNumber ?? "");
          appUser = await getUser(firebaseUser.uid);
        }
        set({ appUser, isLoading: false, isInitialized: true });
      } else {
        set({ appUser: null, isLoading: false, isInitialized: true });
      }
    });

    return unsubscribe;
  },
}));
