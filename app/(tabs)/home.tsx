import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useActiveDrop } from "@/hooks/useActiveDrop";
import { CountdownTimer } from "@/components/CountdownTimer";
import { useAuthStore } from "@/store/authStore";
import { COLORS } from "@/constants/config";

export default function HomeScreen() {
  const router = useRouter();
  const { drop, isLoading, msUntilDrop } = useActiveDrop();
  const isAdmin = useAuthStore((s) => s.appUser?.isAdmin ?? false);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.title}>💰 MoneyDrop</Text>
        {isAdmin && (
          <TouchableOpacity
            style={styles.adminBtn}
            onPress={() => router.push("/admin")}
          >
            <Text style={styles.adminBtnText}>Admin</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <Text style={styles.muted}>Loading today's drop...</Text>
      ) : drop?.status === "active" ? (
        <View style={styles.card}>
          <Text style={styles.liveTag}>🟢 DROP IS LIVE</Text>
          <Text style={styles.prize}>
            ${((drop.prizeAmountCents ?? 0) / 100).toFixed(2)}
          </Text>
          <Text style={styles.city}>📍 {drop.city}</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push("/(tabs)/drop")}
          >
            <Text style={styles.primaryBtnText}>View Clue →</Text>
          </TouchableOpacity>
        </View>
      ) : drop?.status === "scheduled" ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Next drop in</Text>
          <CountdownTimer
            targetMs={drop.scheduledAt instanceof Date
              ? drop.scheduledAt.getTime()
              : (drop.scheduledAt as any).seconds * 1000}
          />
          <Text style={styles.prize}>
            ${((drop.prizeAmountCents ?? 0) / 100).toFixed(2)} prize
          </Text>
          <Text style={styles.city}>📍 {drop.city}</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.muted}>No drop scheduled yet.{"\n"}Check back soon!</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  topRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.primary,
  },
  adminBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  adminBtnText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  card: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  liveTag: { fontSize: 13, fontWeight: "700", color: COLORS.success, marginBottom: 12 },
  cardLabel: { fontSize: 15, color: COLORS.textMuted, marginBottom: 12 },
  prize: {
    fontSize: 48,
    fontWeight: "900",
    color: COLORS.primary,
    marginBottom: 8,
  },
  city: { fontSize: 17, color: COLORS.text, marginBottom: 24 },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  primaryBtnText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: "700",
  },
  muted: {
    color: COLORS.textMuted,
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
});
