import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { COLORS } from "@/constants/config";

export default function AdminLayout() {
  const router = useRouter();
  const appUser = useAuthStore((s) => s.appUser);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  useEffect(() => {
    // Wait until auth is fully resolved before checking admin status.
    // Without this, a missing/false isAdmin field bounces admins on first load.
    if (!isInitialized) return;
    if (appUser === null || !appUser.isAdmin) {
      router.replace("/(tabs)/home");
    }
  }, [appUser, isInitialized]);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.primary,
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Drops" }} />
      <Stack.Screen name="create" options={{ title: "New Drop" }} />
      <Stack.Screen name="[id]" options={{ title: "Edit Drop" }} />
    </Stack>
  );
}
