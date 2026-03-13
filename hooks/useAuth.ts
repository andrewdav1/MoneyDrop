import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const { firebaseUser, appUser, isLoading, isInitialized, initialize } =
    useAuthStore();

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, []);

  return {
    firebaseUser,
    appUser,
    isLoading,
    isInitialized,
    isAuthenticated: !!firebaseUser,
    isAdmin: appUser?.isAdmin ?? false,
  };
}
