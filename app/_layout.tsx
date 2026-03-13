import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function RootLayout() {
  const { isAuthenticated, isInitialized } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // Register for push notifications once the user is signed in.
  // The hook is a no-op when appUser is null.
  usePushNotifications();

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/phone");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)/home");
    }
  }, [isAuthenticated, isInitialized, segments]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Slot />
    </SafeAreaProvider>
  );
}
