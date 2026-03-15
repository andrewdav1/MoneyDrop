import { Stack } from "expo-router";
import { COLORS } from "@/constants/config";

export default function DropDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.background } }}>
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
