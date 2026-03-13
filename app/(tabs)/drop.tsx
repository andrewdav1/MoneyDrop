import { View, Text, Image, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useActiveDrops } from "@/hooks/useActiveDrops";
import { COLORS } from "@/constants/config";
import type { Drop } from "@/types";

function DropCard({ drop }: { drop: Drop }) {
  return (
    <View style={styles.card}>
      <View style={styles.metaRow}>
        <Text style={styles.badge}>{drop.city}</Text>
        <Text style={[styles.badge, styles.badgeLive]}>🟢 LIVE</Text>
      </View>

      {drop.clueImageUrl ? (
        <Image source={{ uri: drop.clueImageUrl }} style={styles.clueImage} resizeMode="cover" />
      ) : (
        <View style={styles.clueImagePlaceholder}>
          <Text style={styles.placeholderText}>📸 No clue image</Text>
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
    </View>
  );
}

export default function DropScreen() {
  const { drops, isLoading } = useActiveDrops();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.muted}>Loading clues...</Text>
      </SafeAreaView>
    );
  }

  if (drops.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>📍 Active Drops</Text>
        <Text style={styles.muted}>No active drops right now.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>📍 Active Drops</Text>
        {drops.map((drop) => (
          <DropCard key={drop.id} drop={drop} />
        ))}
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
    marginBottom: 20,
  },
  card: {
    marginBottom: 24,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metaRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
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
  clueImage: {
    width: "100%",
    height: 220,
    borderRadius: 14,
    marginBottom: 16,
  },
  clueImagePlaceholder: {
    width: "100%",
    height: 220,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  placeholderText: { color: COLORS.textMuted },
  clueBox: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clueLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  clueText: { fontSize: 16, color: COLORS.text, lineHeight: 24 },
  prizeBox: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  prizeLabel: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: "700",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  prize: { fontSize: 36, fontWeight: "900", color: COLORS.primary },
  muted: { color: COLORS.textMuted, fontSize: 16, textAlign: "center", marginTop: 60 },
});
