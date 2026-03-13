import { View, Text, StyleSheet, TouchableOpacity, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useActiveDrops } from "@/hooks/useActiveDrops";
import { useAuthStore } from "@/store/authStore";
import { COLORS } from "@/constants/config";
import type { Drop } from "@/types";

export default function HomeScreen() {
  const router = useRouter();
  const { drops, isLoading } = useActiveDrops();
  const isAdmin = useAuthStore((s) => s.appUser?.isAdmin ?? false);

  function renderDrop({ item }: { item: Drop }) {
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.liveTag}>🟢 LIVE</Text>
          <Text style={styles.city}>📍 {item.city}</Text>
        </View>
        <Text style={styles.prize}>
          ${((item.prizeAmountCents ?? 0) / 100).toFixed(2)}
        </Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push("/(tabs)/drop")}
        >
          <Text style={styles.primaryBtnText}>View Clue →</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
        <Text style={styles.muted}>Loading drops...</Text>
      ) : drops.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.muted}>No active drops right now.{"\n"}Check back soon!</Text>
        </View>
      ) : (
        <FlatList
          data={drops}
          keyExtractor={(d) => d.id}
          renderItem={renderDrop}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  topRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
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
  list: {
    paddingBottom: 32,
  },
  separator: { height: 12 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  liveTag: { fontSize: 13, fontWeight: "700", color: COLORS.success },
  city: { fontSize: 14, color: COLORS.textMuted },
  prize: {
    fontSize: 44,
    fontWeight: "900",
    color: COLORS.primary,
    marginBottom: 20,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: "700",
  },
  emptyCard: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  muted: {
    color: COLORS.textMuted,
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
});
