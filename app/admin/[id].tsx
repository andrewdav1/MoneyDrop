import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Share,
  Image,
  ActionSheetIOS,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import QRCode from "react-native-qrcode-svg";
import { storage } from "@/lib/firebase";
import { subscribeToDrop, updateDrop, deleteDrop } from "@/lib/firestore";
import { COLORS } from "@/constants/config";
import type { Drop, DropStatus } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUSES: DropStatus[] = ["scheduled", "active", "claimed", "expired"];

const STATUS_LABELS: Record<DropStatus, string> = {
  scheduled: "Upcoming",
  active: "Active",
  claimed: "Claimed",
  expired: "Expired",
};

const STATUS_COLORS: Record<DropStatus, string> = {
  scheduled: COLORS.secondary,
  active: COLORS.success,
  claimed: COLORS.textMuted,
  expired: COLORS.danger,
};

function splitCityState(city: string): [string, string] {
  const idx = city.lastIndexOf(", ");
  if (idx !== -1) return [city.slice(0, idx), city.slice(idx + 2)];
  return [city, ""];
}

function toDate(value: any): Date {
  if (!value) return new Date();
  if (value?.toDate) return value.toDate();
  return new Date(value);
}

function formatDateInput(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${m}/${day}/${d.getFullYear()}`;
}

function formatTimeInput(d: Date): string {
  let h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");
  const meridiem = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${min} ${meridiem}`;
}

function parseScheduledAt(dateText: string, timeText: string): Date | null {
  const dateMatch = dateText.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const timeMatch = timeText.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!dateMatch || !timeMatch) return null;
  const [, m, d, y] = dateMatch;
  const [, h, min, mer] = timeMatch;
  let hours = parseInt(h, 10);
  if (mer.toUpperCase() === "PM" && hours !== 12) hours += 12;
  if (mer.toUpperCase() === "AM" && hours === 12) hours = 0;
  const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), hours, parseInt(min, 10));
  return isNaN(date.getTime()) ? null : date;
}

async function compressImage(localUri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 800 } }],
    { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

async function uploadClueImage(localUri: string, title: string): Promise<string> {
  const compressed = await compressImage(localUri);
  const response = await fetch(compressed);
  const blob = await response.blob();
  const filename = `clue-images/${Date.now()}-${title.replace(/\s+/g, "-")}.jpg`;
  const storageRef = ref(storage, filename);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

// ---------------------------------------------------------------------------
// Form type
// ---------------------------------------------------------------------------

interface EditForm {
  title: string;
  description: string;
  city: string;
  state: string;
  clueText: string;
  prizeAmountDollars: string;
  claimRadiusMiles: string;
  lat: string;
  lng: string;
  dateText: string;
  timeText: string;
  status: DropStatus;
  clueImageUrl: string;
}

function dropToForm(drop: Drop): EditForm {
  const [city, state] = splitCityState(drop.city);
  const scheduled = toDate(drop.scheduledAt);
  return {
    title: drop.title ?? "",
    description: drop.description ?? "",
    city,
    state,
    clueText: drop.clueText ?? "",
    prizeAmountDollars: (((drop.prizeAmountCents ?? 0) / 100)).toFixed(2),
    claimRadiusMiles: ((drop.claimRadiusMetres ?? 0) / 1609.344).toFixed(2),
    lat: String(drop.lat ?? ""),
    lng: String(drop.lng ?? ""),
    dateText: formatDateInput(scheduled),
    timeText: formatTimeInput(scheduled),
    status: drop.status,
    clueImageUrl: drop.clueImageUrl ?? "",
  };
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function EditDropScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [drop, setDrop] = useState<Drop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState<EditForm | null>(null);
  const [clueImageUri, setClueImageUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const initialized = useRef(false);

  useEffect(() => {
    if (!id) return;
    return subscribeToDrop(id, (d) => {
      setDrop(d);
      setIsLoading(false);
      if (d && !initialized.current) {
        initialized.current = true;
        setForm(dropToForm(d));
      }
    });
  }, [id]);

  function update(key: keyof EditForm, value: string) {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  // ── Image picker ──────────────────────────────────────────────────────────

  async function pickFromLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access to pick a clue image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) setClueImageUri(result.assets[0].uri);
  }

  async function pickFromCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow camera access to capture a clue image.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) setClueImageUri(result.assets[0].uri);
  }

  function handlePickImage() {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", "Take Photo", "Choose from Library"], cancelButtonIndex: 0 },
        (idx) => {
          if (idx === 1) pickFromCamera();
          if (idx === 2) pickFromLibrary();
        }
      );
    } else {
      Alert.alert("Clue Image", "Choose source", [
        { text: "Camera", onPress: pickFromCamera },
        { text: "Library", onPress: pickFromLibrary },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!form || !drop) return;

    const scheduledAt = parseScheduledAt(form.dateText, form.timeText);
    if (!scheduledAt) {
      Alert.alert("Invalid date/time", "Enter date as mm/dd/yyyy and time as hh:mm AM/PM.");
      return;
    }

    const prizeAmountCents = Math.round(parseFloat(form.prizeAmountDollars) * 100);
    const claimRadiusMetres = Math.round(parseFloat(form.claimRadiusMiles) * 1609.344);
    if (isNaN(prizeAmountCents) || isNaN(claimRadiusMetres)) {
      Alert.alert("Invalid values", "Prize and radius must be valid numbers.");
      return;
    }

    try {
      setIsSaving(true);
      let clueImageUrl = form.clueImageUrl;
      if (clueImageUri) {
        setIsUploading(true);
        clueImageUrl = await uploadClueImage(clueImageUri, form.title);
        setIsUploading(false);
        setClueImageUri(null);
        setForm((prev) => prev ? { ...prev, clueImageUrl } : prev);
      }

      await updateDrop(drop.id, {
        title: form.title,
        description: form.description,
        city: form.state ? `${form.city}, ${form.state.toUpperCase()}` : form.city,
        clueText: form.clueText,
        prizeAmountCents,
        claimRadiusMetres,
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        scheduledAt,
        clueImageUrl,
        status: form.status,
      });

      Alert.alert("Saved", "Drop updated successfully.");
    } catch (e: any) {
      setIsUploading(false);
      Alert.alert("Error", e.message ?? "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  }

  // ── Quick status ─────────────────────────────────────────────────────────

  async function handleSetStatus(status: DropStatus) {
    if (!drop) return;
    try {
      await updateDrop(drop.id, { status });
      setForm((prev) => prev ? { ...prev, status } : prev);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to update status.");
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  function handleDelete() {
    Alert.alert("Delete Drop", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDrop(drop!.id);
            router.back();
          } catch (e: any) {
            Alert.alert("Error", e.message ?? "Failed to delete drop.");
          }
        },
      },
    ]);
  }

  // ── Share QR ─────────────────────────────────────────────────────────────

  async function handleShare() {
    if (!drop) return;
    try {
      await Share.share({
        title: `QR Secret — ${drop.title}`,
        message: `Drop: ${drop.title}\nCity: ${drop.city}\nQR Secret: ${drop.qrCodeSecret}`,
      });
    } catch {
      // cancelled
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading || !form) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (!drop) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.muted}>Drop not found.</Text>
      </SafeAreaView>
    );
  }

  const busy = isSaving || isUploading;
  const imageSource = clueImageUri
    ? { uri: clueImageUri }
    : form.clueImageUrl
    ? { uri: form.clueImageUrl }
    : null;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Status quick-set ─────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>Status</Text>
        <View style={styles.statusRow}>
          {STATUSES.map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.statusBtn,
                form.status === s && { backgroundColor: STATUS_COLORS[s] + "33", borderColor: STATUS_COLORS[s] },
              ]}
              onPress={() => handleSetStatus(s)}
            >
              <Text style={[
                styles.statusBtnText,
                form.status === s && { color: STATUS_COLORS[s] },
              ]}>
                {STATUS_LABELS[s]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Core fields ──────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>Details</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Title</Text>
          <TextInput style={styles.input} value={form.title} onChangeText={(v) => update("title", v)} placeholderTextColor={COLORS.textMuted} placeholder="Title" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput style={[styles.input, styles.inputMulti]} value={form.description} onChangeText={(v) => update("description", v)} placeholder="Short description..." placeholderTextColor={COLORS.textMuted} multiline numberOfLines={3} />
        </View>

        {/* City + State */}
        <View style={styles.cityRow}>
          <View style={[styles.field, styles.cityField]}>
            <Text style={styles.label}>City</Text>
            <TextInput style={styles.input} value={form.city} onChangeText={(v) => update("city", v)} placeholder="San Francisco" placeholderTextColor={COLORS.textMuted} />
          </View>
          <View style={[styles.field, styles.stateField]}>
            <Text style={styles.label}>State</Text>
            <TextInput
              style={styles.input}
              value={form.state}
              onChangeText={(v) => update("state", v.toUpperCase().replace(/[^A-Z]/g, ""))}
              placeholder="CA"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="characters"
              maxLength={2}
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Clue Text</Text>
          <TextInput style={[styles.input, styles.inputMulti]} value={form.clueText} onChangeText={(v) => update("clueText", v)} placeholder="Find the golden statue near..." placeholderTextColor={COLORS.textMuted} multiline numberOfLines={4} />
        </View>

        {/* Prize + Radius */}
        <View style={styles.twoCol}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Prize ($)</Text>
            <TextInput style={styles.input} value={form.prizeAmountDollars} onChangeText={(v) => update("prizeAmountDollars", v)} placeholder="100" placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Radius (mi)</Text>
            <TextInput style={styles.input} value={form.claimRadiusMiles} onChangeText={(v) => update("claimRadiusMiles", v)} placeholder="0.06" placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" />
          </View>
        </View>

        {/* Lat / Lng */}
        <View style={styles.twoCol}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Latitude</Text>
            <TextInput
              style={styles.input}
              value={form.lat}
              onChangeText={(v) => { if (/^-?\d*\.?\d*$/.test(v) || v === "" || v === "-") update("lat", v); }}
              placeholder="37.7749"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="default"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Longitude</Text>
            <TextInput
              style={styles.input}
              value={form.lng}
              onChangeText={(v) => { if (/^-?\d*\.?\d*$/.test(v) || v === "" || v === "-") update("lng", v); }}
              placeholder="-122.4194"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="default"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Date + Time */}
        <View style={styles.twoCol}>
          <View style={[styles.field, { flex: 3 }]}>
            <Text style={styles.label}>Date</Text>
            <TextInput style={styles.input} value={form.dateText} onChangeText={(v) => update("dateText", v)} placeholder="mm/dd/yyyy" placeholderTextColor={COLORS.textMuted} keyboardType="numbers-and-punctuation" autoCorrect={false} maxLength={10} />
          </View>
          <View style={[styles.field, { flex: 2 }]}>
            <Text style={styles.label}>Time</Text>
            <TextInput style={styles.input} value={form.timeText} onChangeText={(v) => update("timeText", v)} placeholder="hh:mm AM" placeholderTextColor={COLORS.textMuted} keyboardType="numbers-and-punctuation" autoCorrect={false} autoCapitalize="characters" maxLength={8} />
          </View>
        </View>

        {/* ── Clue Image ───────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>Clue Image</Text>
        <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage} activeOpacity={0.7}>
          {imageSource ? (
            <Image source={imageSource} style={styles.imagePreview} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderIcon}>📷</Text>
              <Text style={styles.imagePlaceholderText}>Tap to change clue image</Text>
            </View>
          )}
        </TouchableOpacity>
        {(clueImageUri || form.clueImageUrl) && (
          <TouchableOpacity
            style={styles.removeImage}
            onPress={() => { setClueImageUri(null); setForm((p) => p ? { ...p, clueImageUrl: "" } : p); }}
          >
            <Text style={styles.removeImageText}>Remove image</Text>
          </TouchableOpacity>
        )}

        {/* ── QR Code ──────────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>QR Code</Text>
        <View style={styles.qrCard}>
          <View style={styles.qrWrapper}>
            <QRCode value={drop.qrCodeSecret} size={160} backgroundColor="#ffffff" color="#000000" />
          </View>
          <Text style={styles.secretText}>{drop.qrCodeSecret}</Text>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>Share / Save QR</Text>
          </TouchableOpacity>
        </View>

        {/* ── Save ─────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.saveBtn, busy && styles.btnDisabled]}
          onPress={handleSave}
          disabled={busy}
        >
          {busy ? (
            <View style={styles.busyRow}>
              <ActivityIndicator color={COLORS.background} />
              <Text style={[styles.saveBtnText, { marginLeft: 8 }]}>
                {isUploading ? "Uploading image…" : "Saving…"}
              </Text>
            </View>
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        {/* ── Delete ───────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>Delete Drop</Text>
        </TouchableOpacity>

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
  scroll: { padding: 20, paddingBottom: 60 },
  muted: { color: COLORS.textMuted, fontSize: 15 },

  sectionHeader: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 12,
  },

  // Status quick-set
  statusRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  statusBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  statusBtnText: { fontSize: 13, fontWeight: "600", color: COLORS.textMuted },

  // Form fields
  field: { marginBottom: 14 },
  label: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputMulti: { height: 90, textAlignVertical: "top" },
  twoCol: { flexDirection: "row", gap: 12 },
  cityRow: { flexDirection: "row", gap: 12 },
  cityField: { flex: 1 },
  stateField: { width: 72 },

  // Image picker
  imagePicker: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
  },
  imagePreview: { width: "100%", height: 180 },
  imagePlaceholder: { height: 120, alignItems: "center", justifyContent: "center", gap: 8 },
  imagePlaceholderIcon: { fontSize: 28 },
  imagePlaceholderText: { color: COLORS.textMuted, fontSize: 14 },
  removeImage: { marginTop: 6, alignSelf: "flex-end" },
  removeImageText: { color: COLORS.danger, fontSize: 13 },

  // QR
  qrCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qrWrapper: { padding: 12, backgroundColor: "#ffffff", borderRadius: 10 },
  secretText: {
    marginTop: 12,
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: "monospace" as any,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  shareBtn: {
    marginTop: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  shareBtnText: { color: COLORS.text, fontSize: 14, fontWeight: "600" },

  // Action buttons
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 28,
  },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { color: COLORS.background, fontSize: 17, fontWeight: "700" },
  busyRow: { flexDirection: "row", alignItems: "center" },

  deleteBtn: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  deleteBtnText: { color: COLORS.danger, fontSize: 16, fontWeight: "700" },
});
