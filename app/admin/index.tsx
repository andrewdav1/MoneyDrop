import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { subscribeToAllDrops } from "@/lib/firestore";
import { COLORS } from "@/constants/config";
import type { Drop, DropStatus } from "@/types";

const STATUS_META: Record<DropStatus, { label: string; color: string }> = {
  scheduled: { label: "Upcoming", color: COLORS.secondary },
  active:    { label: "Active",   color: COLORS.success },
  claimed:   { label: "Claimed",  color: COLORS.textMuted },
  expired:   { label: "Expired",  color: COLORS.danger },
};

export default function AdminScreen() {
  const router = useRouter();
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return subscribeToAllDrops((all) => {
      setDrops(all);
      setLoading(false);
    });
  }, []);

  function formatDate(value: any): string {
    if (!value) return "—";
    const date = value?.toDate ? value.toDate() : new Date(value);
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function renderDrop({ item }: { item: Drop }) {
    const meta = STATUS_META[item.status];
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push(`/admin/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.rowLeft}>
          <View style={styles.rowTop}>
            <Text style={styles.dropTitle} numberOfLines={1}>{item.title}</Text>
            <View style={[styles.badge, { backgroundColor: meta.color + "22", borderColor: meta.color }]}>
              <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
            </View>
          </View>
          <Text style={styles.dropMeta}>
            {item.city}  ·  ${(item.prizeAmountCents / 100).toFixed(0)}  ·  {formatDate(item.scheduledAt)}
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={drops}
          keyExtractor={(d) => d.id}
          renderItem={renderDrop}
          contentContainerStyle={drops.length === 0 ? styles.empty : styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No drops yet. Create one below.</Text>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => router.push("/admin/create")}>
        <Text style={styles.fabText}>+ New Drop</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  list: { padding: 16, paddingBottom: 100 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyText: { color: COLORS.textMuted, fontSize: 15, textAlign: "center" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
  },
  rowLeft: { flex: 1 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  dropTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: COLORS.text },
  dropMeta: { fontSize: 13, color: COLORS.textMuted },
  chevron: { fontSize: 22, color: COLORS.textMuted, marginLeft: 8 },

  badge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },

  separator: { height: 10 },

  fab: {
    position: "absolute",
    bottom: 32,
    right: 24,
    left: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  fabText: { color: COLORS.background, fontSize: 16, fontWeight: "800" },
});
