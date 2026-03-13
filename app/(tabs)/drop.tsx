import { View, Text, Image, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useActiveDrop } from "@/hooks/useActiveDrop";
import { COLORS } from "@/constants/config";

export default function DropScreen() {
  const { drop, isLoading } = useActiveDrop();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.muted}>Loading clue...</Text>
      </SafeAreaView>
    );
  }

  if (!drop || (drop.status !== "active" && drop.status !== "scheduled")) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>📍 Today's Drop</Text>
        <Text style={styles.muted}>No active drop right now.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>📍 Today's Drop</Text>

        <View style={styles.metaRow}>
          <Text style={styles.badge}>{drop.city}</Text>
          <Text style={[styles.badge, drop.status === "active" ? styles.badgeLive : styles.badgeScheduled]}>
            {drop.status === "active" ? "🟢 LIVE" : "⏳ COMING SOON"}
          </Text>
        </View>

        {drop.clueImageUrl ? (
          <Image source={{ uri: drop.clueImageUrl }} style={styles.clueImage} resizeMode="cover" />
        ) : (
          <View style={styles.clueImagePlaceholder}>
            <Text style={styles.placeholderText}>📸 Clue image loading...</Text>
          </View>
        )}

        <View style={styles.clueBox}>
          <Text style={styles.clueLabel}>Clue</Text>
          <Text style={styles.clueText}>{drop.clueText}</Text>
        </View>

        <View style={styles.prizeBox}>
          <Text style={styles.prizeLabel}>Prize</Text>
          <Text style={styles.prize}>${((drop.prizeAmountCents ?? 0) / 100).toFixed(2)}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 24, paddingBottom: 48 },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: 16,
  },
  metaRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  badge: {
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    fontSize: 13,
    fontWeight: "600",
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  badgeLive: { borderColor: COLORS.success, color: COLORS.success },
  badgeScheduled: { borderColor: COLORS.textMuted },
  clueImage: {
    width: "100%",
    height: 260,
    borderRadius: 16,
    marginBottom: 20,
  },
  clueImagePlaceholder: {
    width: "100%",
    height: 260,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  placeholderText: { color: COLORS.textMuted },
  clueBox: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clueLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 },
  clueText: { fontSize: 17, color: COLORS.text, lineHeight: 26 },
  prizeBox: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  prizeLabel: { fontSize: 12, color: COLORS.primary, fontWeight: "700", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 },
  prize: { fontSize: 40, fontWeight: "900", color: COLORS.primary },
  muted: { color: COLORS.textMuted, fontSize: 16, textAlign: "center", marginTop: 60 },
});
