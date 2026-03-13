import { create } from "zustand";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { User } from "@/types";
import { getUser, createUser, subscribeToUser } from "@/lib/firestore";

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
    let userUnsub: (() => void) | null = null;

    const authUnsub = onAuthStateChanged(auth, async (firebaseUser) => {
      // Tear down any previous user subscription
      userUnsub?.();
      userUnsub = null;

      set({ firebaseUser, isLoading: true });

      if (firebaseUser) {
        // Ensure user document exists before subscribing
        const existing = await getUser(firebaseUser.uid);
        if (!existing) {
          await createUser(firebaseUser.uid, firebaseUser.phoneNumber ?? "");
        }

        // Subscribe to real-time updates so walletBalance, kycStatus, etc.
        // stay current without requiring a re-login.
        userUnsub = subscribeToUser(firebaseUser.uid, (appUser) => {
          set({ appUser, isLoading: false, isInitialized: true });
        });
      } else {
        set({ appUser: null, isLoading: false, isInitialized: true });
      }
    });

    return () => {
      authUnsub();
      userUnsub?.();
    };
  },
}));
