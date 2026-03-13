import { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { subscribeToAllDrops } from "@/lib/firestore";
import { CountdownTimer } from "@/components/CountdownTimer";
import { useAuthStore } from "@/store/authStore";
import { COLORS } from "@/constants/config";
import type { Drop, DropStatus } from "@/types";

// ---------------------------------------------------------------------------
// Filter config
// ---------------------------------------------------------------------------

type Filter = "active" | "scheduled" | "claimed" | "expired";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "active",    label: "Active" },
  { key: "scheduled", label: "Upcoming" },
  { key: "claimed",   label: "Claimed" },
  { key: "expired",   label: "Expired" },
];

const EMPTY_MESSAGES: Record<Filter, string> = {
  active:    "No active drops right now.\nCheck back soon!",
  scheduled: "No upcoming drops scheduled.\nCheck back soon!",
  claimed:   "No drops have been claimed yet.",
  expired:   "No expired drops.",
};

// ---------------------------------------------------------------------------
// Drop card
// ---------------------------------------------------------------------------

function toMs(value: any): number {
  if (!value) return 0;
  if (value?.toDate) return value.toDate().getTime();
  return new Date(value).getTime();
}

function DropCard({ item, filter }: { item: Drop; filter: Filter }) {
  const router = useRouter();
  const prizeStr = `$${((item.prizeAmountCents ?? 0) / 100).toFixed(2)}`;

  if (filter === "active") {
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.liveTag}>🟢 LIVE</Text>
          <Text style={styles.city}>📍 {item.city}</Text>
        </View>
        <Text style={styles.prize}>{prizeStr}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push("/(tabs)/drop")}>
          <Text style={styles.primaryBtnText}>View Clue →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (filter === "scheduled") {
    const targetMs = toMs(item.scheduledAt);
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.upcomingTag}>⏳ UPCOMING</Text>
          <Text style={styles.city}>📍 {item.city}</Text>
        </View>
        <Text style={styles.dropTitle}>{item.title}</Text>
        <CountdownTimer targetMs={targetMs} />
        <Text style={styles.prize}>{prizeStr}</Text>
      </View>
    );
  }

  if (filter === "claimed") {
    return (
      <View style={[styles.card, styles.cardMuted]}>
        <View style={styles.cardTop}>
          <Text style={styles.claimedTag}>✅ CLAIMED</Text>
          <Text style={styles.city}>📍 {item.city}</Text>
        </View>
        <Text style={styles.dropTitleMuted}>{item.title}</Text>
        <Text style={styles.prizeMuted}>{prizeStr}</Text>
      </View>
    );
  }

  // expired
  return (
    <View style={[styles.card, styles.cardMuted]}>
      <View style={styles.cardTop}>
        <Text style={styles.expiredTag}>💨 EXPIRED</Text>
        <Text style={styles.city}>📍 {item.city}</Text>
      </View>
      <Text style={styles.dropTitleMuted}>{item.title}</Text>
      <Text style={styles.prizeMuted}>{prizeStr}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function HomeScreen() {
  const router = useRouter();
  const isAdmin = useAuthStore((s) => s.appUser?.isAdmin ?? false);

  const [allDrops, setAllDrops] = useState<Drop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("active");

  useEffect(() => {
    return subscribeToAllDrops((drops) => {
      setAllDrops(drops);
      setIsLoading(false);
    });
  }, []);

  const filtered = allDrops.filter((d) => d.status === filter);

  return (
    <SafeAreaView style={styles.container}>
      {/* Title row */}
      <View style={styles.topRow}>
        <Text style={styles.title}>💰 MoneyDrop</Text>
        {isAdmin && (
          <TouchableOpacity style={styles.adminBtn} onPress={() => router.push("/admin")}>
            <Text style={styles.adminBtnText}>Admin</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
        style={styles.pillScroll}
      >
        {FILTERS.map(({ key, label }) => {
          const selected = filter === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.pill, selected && styles.pillSelected]}
              onPress={() => setFilter(key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Drop list */}
      {isLoading ? (
        <Text style={styles.muted}>Loading drops...</Text>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.muted}>{EMPTY_MESSAGES[filter]}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(d) => d.id}
          renderItem={({ item }) => <DropCard item={item} filter={filter} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 24,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  title: { fontSize: 28, fontWeight: "800", color: COLORS.primary },
  adminBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  adminBtnText: { color: COLORS.textMuted, fontSize: 13, fontWeight: "600" },

  // Pills
  pillScroll: { flexGrow: 0, marginBottom: 16 },
  pillRow: { paddingHorizontal: 24, gap: 8 },
  pill: {
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pillText: { fontSize: 14, fontWeight: "600", color: COLORS.textMuted },
  pillTextSelected: { color: COLORS.background },

  // List
  list: { paddingHorizontal: 24, paddingBottom: 32 },
  separator: { height: 12 },

  // Cards
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardMuted: { opacity: 0.7 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  liveTag:     { fontSize: 13, fontWeight: "700", color: COLORS.success },
  upcomingTag: { fontSize: 13, fontWeight: "700", color: COLORS.secondary },
  claimedTag:  { fontSize: 13, fontWeight: "700", color: COLORS.success },
  expiredTag:  { fontSize: 13, fontWeight: "700", color: COLORS.textMuted },
  city:        { fontSize: 14, color: COLORS.textMuted },
  dropTitle:   { fontSize: 18, fontWeight: "700", color: COLORS.text, marginBottom: 4 },
  dropTitleMuted: { fontSize: 18, fontWeight: "700", color: COLORS.textMuted, marginBottom: 8 },
  prize: { fontSize: 44, fontWeight: "900", color: COLORS.primary, marginBottom: 20 },
  prizeMuted: { fontSize: 32, fontWeight: "900", color: COLORS.textMuted },

  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: COLORS.background, fontSize: 16, fontWeight: "700" },

  emptyCard: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  muted: { color: COLORS.textMuted, fontSize: 16, textAlign: "center", lineHeight: 24 },
});
