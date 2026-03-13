import { Stack } from "expo-router";
import { COLORS } from "@/constants/config";

export default function DropDetailLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.primary,
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="[id]" options={{ title: "Drop Details" }} />
    </Stack>
  );
}
