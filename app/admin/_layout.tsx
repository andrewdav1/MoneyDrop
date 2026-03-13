import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { COLORS } from "@/constants/config";

export default function AdminLayout() {
  const router = useRouter();
  const appUser = useAuthStore((s) => s.appUser);

  useEffect(() => {
    if (appUser !== null && !appUser.isAdmin) {
      router.replace("/(tabs)/home");
    }
  }, [appUser]);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.primary,
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: COLORS.background },
      }}
    />
  );
}
