import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  Share,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { subscribeToAllDrops } from "@/lib/firestore";
import { COLORS } from "@/constants/config";
import type { Drop, DropStatus } from "@/types";

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------

const STATUS_META: Record<DropStatus, { label: string; color: string }> = {
  scheduled: { label: "Scheduled", color: COLORS.secondary },
  active:    { label: "Active",    color: COLORS.success },
  claimed:   { label: "Claimed",   color: COLORS.textMuted },
  expired:   { label: "Expired",   color: COLORS.danger },
};

// ---------------------------------------------------------------------------
// Drop list screen
// ---------------------------------------------------------------------------

export default function AdminScreen() {
  const router = useRouter();
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDrop, setSelectedDrop] = useState<Drop | null>(null);

  useEffect(() => {
    return subscribeToAllDrops((all) => {
      setDrops(all);
      setLoading(false);
    });
  }, []);

  async function handleShare(drop: Drop) {
    try {
      await Share.share({
        title: `QR Secret — ${drop.title}`,
        message: `Drop: ${drop.title}\nCity: ${drop.city}\nQR Secret: ${drop.qrCodeSecret}`,
      });
    } catch {
      // cancelled — no-op
    }
  }

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
      <TouchableOpacity style={styles.row} onPress={() => setSelectedDrop(item)} activeOpacity={0.7}>
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

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push("/admin/create")}>
        <Text style={styles.fabText}>+ New Drop</Text>
      </TouchableOpacity>

      {/* Drop detail / QR modal */}
      <Modal
        visible={!!selectedDrop}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDrop(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selectedDrop && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle} numberOfLines={2}>{selectedDrop.title}</Text>
                    <Text style={styles.modalMeta}>
                      {selectedDrop.city}  ·  ${(selectedDrop.prizeAmountCents / 100).toFixed(0)}
                    </Text>
                  </View>
                  <View style={[
                    styles.badge,
                    {
                      backgroundColor: STATUS_META[selectedDrop.status].color + "22",
                      borderColor: STATUS_META[selectedDrop.status].color,
                    },
                  ]}>
                    <Text style={[styles.badgeText, { color: STATUS_META[selectedDrop.status].color }]}>
                      {STATUS_META[selectedDrop.status].label}
                    </Text>
                  </View>
                </View>

                <Text style={styles.sectionLabel}>Scheduled</Text>
                <Text style={styles.sectionValue}>{formatDate(selectedDrop.scheduledAt)}</Text>

                <Text style={styles.sectionLabel}>Clue</Text>
                <Text style={styles.sectionValue}>{selectedDrop.clueText}</Text>

                <Text style={styles.sectionLabel}>Location</Text>
                <Text style={styles.sectionValue}>
                  {selectedDrop.lat.toFixed(5)}, {selectedDrop.lng.toFixed(5)}  ·  {selectedDrop.claimRadiusMetres}m radius
                </Text>

                <Text style={styles.sectionLabel}>QR Code</Text>
                <View style={styles.qrWrapper}>
                  <QRCode
                    value={selectedDrop.qrCodeSecret}
                    size={180}
                    backgroundColor="#ffffff"
                    color="#000000"
                  />
                </View>
                <Text style={styles.secretText}>{selectedDrop.qrCodeSecret}</Text>

                <TouchableOpacity style={styles.shareBtn} onPress={() => handleShare(selectedDrop)}>
                  <Text style={styles.shareBtnText}>Share / Save QR</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedDrop(null)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: COLORS.text, marginBottom: 4 },
  modalMeta: { fontSize: 14, color: COLORS.textMuted },

  sectionLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
    marginTop: 14,
  },
  sectionValue: { fontSize: 14, color: COLORS.text, lineHeight: 20 },

  qrWrapper: {
    marginTop: 12,
    alignSelf: "center",
    padding: 16,
    backgroundColor: "#ffffff",
    borderRadius: 12,
  },
  secretText: {
    marginTop: 10,
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: "monospace" as any,
    textAlign: "center",
    letterSpacing: 0.5,
  },

  shareBtn: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  shareBtnText: { color: COLORS.background, fontSize: 16, fontWeight: "700" },

  closeBtn: { marginTop: 12, alignItems: "center", paddingVertical: 10 },
  closeBtnText: { color: COLORS.textMuted, fontSize: 15 },
});
