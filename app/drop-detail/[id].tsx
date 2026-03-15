import { useEffect, useState } from "react";
import { View, Text, Image, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { subscribeToDrop } from "@/lib/firestore";
import { COLORS } from "@/constants/config";
import type { Drop, DropStatus } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDate(value: any): Date {
  if (!value) return new Date();
  if (value?.toDate) return value.toDate();
  return new Date(value);
}

function formatScheduledAt(value: any): string {
  return toDate(value).toLocaleString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const STATUS_LABEL: Record<DropStatus, string> = {
  scheduled: "⏳ Upcoming",
  active:    "🟢 Live",
  claimed:   "✅ Claimed",
  expired:   "💨 Expired",
};

const STATUS_COLOR: Record<DropStatus, string> = {
  scheduled: COLORS.secondary,
  active:    COLORS.success,
  claimed:   COLORS.success,
  expired:   COLORS.textMuted,
};

const IMAGE_HEIGHT = 240;

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function DropDetailScreen() {
  const {
    id,
    title,
    city,
    status,
    clueText,
    clueImageUrl,
    prizeAmountCents,
    scheduledAtMs,
  } = useLocalSearchParams<{
    id: string;
    title?: string;
    city?: string;
    status?: string;
    clueText?: string;
    clueImageUrl?: string;
    prizeAmountCents?: string;
    scheduledAtMs?: string;
  }>();

  const router = useRouter();

  // Build initial drop from route params — instant render, no spinner.
  const initialDrop: Drop | null = title
    ? {
        id: id ?? "",
        title,
        city: city ?? "",
        status: (status ?? "expired") as DropStatus,
        clueText: clueText ?? "",
        clueImageUrl: clueImageUrl ?? "",
        prizeAmountCents: parseInt(prizeAmountCents ?? "0", 10),
        scheduledAt: new Date(parseInt(scheduledAtMs ?? "0", 10)),
        description: "",
        lat: 0,
        lng: 0,
        claimRadiusMetres: 0,
        qrCodeSecret: "",
        createdAt: new Date(),
      }
    : null;

  const [drop, setDrop] = useState<Drop | null>(initialDrop);
  const [isLoading, setIsLoading] = useState(initialDrop === null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (!id) return;
    return subscribeToDrop(id, (d) => {
      if (d) setDrop(d);
      setIsLoading(false);
    });
  }, [id]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (!drop) {
    return (
      <SafeAreaView style={styles.center}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Text style={styles.backChevron}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.muted}>Drop not found.</Text>
      </SafeAreaView>
    );
  }

  const statusColor = STATUS_COLOR[drop.status];

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Custom back row */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backRow} hitSlop={12}>
        <Text style={styles.backChevron}>‹</Text>
        <Text style={styles.backLabel}>{drop.title || "Drop Details"}</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Meta row */}
        <View style={styles.metaRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "22", borderColor: statusColor }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {STATUS_LABEL[drop.status]}
            </Text>
          </View>
          <Text style={styles.city}>📍 {drop.city}</Text>
        </View>

        {/* Clue image — fixed container so layout never shifts */}
        <View style={styles.imageContainer}>
          {drop.clueImageUrl ? (
            <>
              {/* Skeleton placeholder always rendered at full size */}
              {!imageLoaded && <View style={styles.imageSkeleton} />}
              <Image
                source={{ uri: drop.clueImageUrl }}
                style={[styles.clueImage, !imageLoaded && styles.imageHidden]}
                resizeMode="cover"
                onLoad={() => setImageLoaded(true)}
              />
            </>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderText}>📸 No clue image</Text>
            </View>
          )}
        </View>

        {/* Clue */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Clue</Text>
          <Text style={styles.sectionValue}>{drop.clueText}</Text>
        </View>

        {/* Prize */}
        <View style={[styles.section, styles.prizeSection]}>
          <Text style={[styles.sectionLabel, { color: COLORS.primary }]}>Prize</Text>
          <Text style={styles.prize}>
            ${((drop.prizeAmountCents ?? 0) / 100).toFixed(2)}
          </Text>
        </View>

        {/* Scheduled */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Scheduled</Text>
          <Text style={styles.sectionValue}>{formatScheduledAt(drop.scheduledAt)}</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center" },
  muted: { color: COLORS.textMuted, fontSize: 15 },

  // Custom header
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backChevron: { fontSize: 32, color: COLORS.primary, lineHeight: 36, marginRight: 6 },
  backLabel: { fontSize: 17, fontWeight: "600", color: COLORS.primary },

  scroll: { paddingHorizontal: 24, paddingBottom: 48 },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statusBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: { fontSize: 13, fontWeight: "700" },
  city: { fontSize: 14, color: COLORS.textMuted, fontWeight: "500" },

  // Image
  imageContainer: {
    width: "100%",
    height: IMAGE_HEIGHT,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
    backgroundColor: COLORS.surface,
  },
  imageSkeleton: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.surface,
  },
  clueImage: {
    width: "100%",
    height: IMAGE_HEIGHT,
  },
  imageHidden: { opacity: 0 },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
  },
  placeholderText: { color: COLORS.textMuted, fontSize: 15 },

  section: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  prizeSection: { alignItems: "center", borderColor: COLORS.primary },
  sectionLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  sectionValue: { fontSize: 16, color: COLORS.text, lineHeight: 24 },
  prize: { fontSize: 44, fontWeight: "900", color: COLORS.primary },
});
