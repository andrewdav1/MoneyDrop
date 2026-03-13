import { useState, useCallback } from "react";
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
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import QRCode from "react-native-qrcode-svg";
import { db, storage } from "@/lib/firebase";
import { COLORS } from "@/constants/config";

interface DropForm {
  title: string;
  description: string;
  city: string;
  prizeAmountDollars: string;
  clueText: string;
  claimRadiusMetres: string;
  lat: string;
  lng: string;
  qrCodeSecret: string;
}

const DEFAULT_FORM: DropForm = {
  title: "",
  description: "",
  city: "",
  prizeAmountDollars: "100",
  clueText: "",
  claimRadiusMetres: "100",
  lat: "",
  lng: "",
  qrCodeSecret: "",
};

function generateSecret(): string {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

async function uploadClueImage(localUri: string, dropTitle: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const ext = localUri.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `clue-images/${Date.now()}-${dropTitle.replace(/\s+/g, "-")}.${ext}`;
  const storageRef = ref(storage, filename);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

export default function CreateDropScreen() {
  const router = useRouter();
  const [form, setForm] = useState<DropForm>(DEFAULT_FORM);
  const [scheduledAt, setScheduledAt] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [clueImageUri, setClueImageUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedDrop, setSavedDrop] = useState<{ title: string; secret: string } | null>(null);

  function update(key: keyof DropForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const handleGenerate = useCallback(() => {
    update("qrCodeSecret", generateSecret());
  }, []);

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

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleCreate() {
    const { title, city, clueText, prizeAmountDollars, qrCodeSecret, lat, lng } = form;
    if (!title || !city || !clueText || !qrCodeSecret || !lat || !lng) {
      Alert.alert("Missing fields", "Please fill in all required fields.");
      return;
    }

    try {
      setIsSaving(true);

      let clueImageUrl = "";
      if (clueImageUri) {
        setIsUploading(true);
        clueImageUrl = await uploadClueImage(clueImageUri, title);
        setIsUploading(false);
      }

      await addDoc(collection(db, "drops"), {
        title,
        description: form.description,
        city,
        prizeAmountCents: Math.round(parseFloat(prizeAmountDollars) * 100),
        clueText,
        clueImageUrl,
        claimRadiusMetres: parseInt(form.claimRadiusMetres, 10),
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        scheduledAt,
        qrCodeSecret,
        status: "scheduled",
        createdAt: serverTimestamp(),
      });

      setSavedDrop({ title, secret: qrCodeSecret });
      setForm(DEFAULT_FORM);
      setScheduledAt(new Date());
      setClueImageUri(null);
    } catch (e: any) {
      setIsUploading(false);
      Alert.alert("Error", e.message ?? "Failed to create drop.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleShare() {
    if (!savedDrop) return;
    try {
      await Share.share({
        title: `QR Secret — ${savedDrop.title}`,
        message: `Drop: ${savedDrop.title}\nQR Secret: ${savedDrop.secret}`,
      });
    } catch {
      // cancelled — no-op
    }
  }

  const busy = isSaving || isUploading;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {(
          [
            { label: "Title *", key: "title", placeholder: "Downtown Treasure" },
            { label: "Description", key: "description", placeholder: "Short description..." },
            { label: "City *", key: "city", placeholder: "San Francisco" },
            { label: "Prize ($) *", key: "prizeAmountDollars", placeholder: "100", keyboard: "decimal-pad" },
            { label: "Clue Text *", key: "clueText", placeholder: "Find the golden statue near...", multiline: true },
            { label: "Claim Radius (m) *", key: "claimRadiusMetres", placeholder: "100", keyboard: "number-pad" },
          ] as Array<{ label: string; key: keyof DropForm; placeholder: string; keyboard?: any; multiline?: boolean }>
        ).map(({ label, key, placeholder, keyboard, multiline }) => (
          <View key={key} style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              style={[styles.input, multiline && styles.inputMulti]}
              value={form[key]}
              onChangeText={(v) => update(key, v)}
              placeholder={placeholder}
              placeholderTextColor={COLORS.textMuted}
              keyboardType={keyboard ?? "default"}
              multiline={multiline}
              numberOfLines={multiline ? 3 : 1}
            />
          </View>
        ))}

        {/* Lat / Lng — default keyboard so minus sign is accessible */}
        <View style={styles.coordRow}>
          {(["lat", "lng"] as const).map((key) => (
            <View key={key} style={[styles.field, styles.coordField]}>
              <Text style={styles.label}>{key === "lat" ? "Latitude *" : "Longitude *"}</Text>
              <TextInput
                style={styles.input}
                value={form[key]}
                onChangeText={(v) => {
                  // Allow digits, decimal point, and leading minus only
                  if (/^-?\d*\.?\d*$/.test(v) || v === "" || v === "-") update(key, v);
                }}
                placeholder={key === "lat" ? "37.7749" : "-122.4194"}
                placeholderTextColor={COLORS.textMuted}
                keyboardType="default"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          ))}
        </View>

        {/* Scheduled At — date + time pickers */}
        <View style={styles.field}>
          <Text style={styles.label}>Scheduled At *</Text>
          <View style={styles.dateTimeRow}>
            <TouchableOpacity
              style={[styles.input, styles.dateTimeBtn]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateTimeText}>
                {scheduledAt.toLocaleDateString(undefined, {
                  month: "short", day: "numeric", year: "numeric",
                })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.input, styles.dateTimeBtn]}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.dateTimeText}>
                {scheduledAt.toLocaleTimeString(undefined, {
                  hour: "numeric", minute: "2-digit", hour12: true,
                })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={scheduledAt}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={(_, date) => {
              setShowDatePicker(Platform.OS === "ios");
              if (date) {
                setScheduledAt((prev) => {
                  const next = new Date(date);
                  next.setHours(prev.getHours(), prev.getMinutes());
                  return next;
                });
              }
              if (Platform.OS !== "ios") setShowDatePicker(false);
            }}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={scheduledAt}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(_, date) => {
              if (date) setScheduledAt(date);
              if (Platform.OS !== "ios") setShowTimePicker(false);
            }}
          />
        )}

        {Platform.OS === "ios" && (showDatePicker || showTimePicker) && (
          <TouchableOpacity
            style={styles.dateTimeDone}
            onPress={() => { setShowDatePicker(false); setShowTimePicker(false); }}
          >
            <Text style={styles.dateTimeDoneText}>Done</Text>
          </TouchableOpacity>
        )}

        {/* Clue Image Picker */}
        <View style={styles.field}>
          <Text style={styles.label}>Clue Image</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage} activeOpacity={0.7}>
            {clueImageUri ? (
              <Image source={{ uri: clueImageUri }} style={styles.imagePreview} resizeMode="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderIcon}>📷</Text>
                <Text style={styles.imagePlaceholderText}>Tap to add clue image</Text>
                <Text style={styles.imagePlaceholderSub}>Camera or photo library</Text>
              </View>
            )}
          </TouchableOpacity>
          {clueImageUri && (
            <TouchableOpacity onPress={() => setClueImageUri(null)} style={styles.removeImage}>
              <Text style={styles.removeImageText}>Remove image</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* QR Code Secret */}
        <View style={styles.field}>
          <Text style={styles.label}>QR Code Secret *</Text>
          <View style={styles.secretRow}>
            <TextInput
              style={[styles.input, styles.secretInput]}
              value={form.qrCodeSecret}
              onChangeText={(v) => update("qrCodeSecret", v)}
              placeholder="Tap Generate or enter manually"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate}>
              <Text style={styles.generateBtnText}>Generate</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Live QR preview */}
        {form.qrCodeSecret.length > 0 && (
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>QR Preview</Text>
            <View style={styles.qrWrapper}>
              <QRCode
                value={form.qrCodeSecret}
                size={180}
                backgroundColor={COLORS.card}
                color={COLORS.text}
              />
            </View>
            <Text style={styles.previewHint}>
              This code will be embedded in the physical drop location.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.createBtn, busy && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={busy}
        >
          {busy ? (
            <View style={styles.busyRow}>
              <ActivityIndicator color={COLORS.background} />
              <Text style={[styles.createBtnText, { marginLeft: 8 }]}>
                {isUploading ? "Uploading image…" : "Saving…"}
              </Text>
            </View>
          ) : (
            <Text style={styles.createBtnText}>Create Drop</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Post-save QR modal */}
      <Modal
        visible={!!savedDrop}
        transparent
        animationType="fade"
        onRequestClose={() => { setSavedDrop(null); router.back(); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Drop Created!</Text>
            <Text style={styles.modalSubtitle}>{savedDrop?.title}</Text>

            <View style={styles.qrWrapper}>
              {savedDrop && (
                <QRCode value={savedDrop.secret} size={220} backgroundColor="#ffffff" color="#000000" />
              )}
            </View>

            <Text style={styles.secretText}>{savedDrop?.secret}</Text>

            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <Text style={styles.shareBtnText}>Share / Save QR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => { setSavedDrop(null); router.back(); }}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 24, paddingBottom: 48 },

  field: { marginBottom: 16 },
  label: {
    fontSize: 12,
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
  inputMulti: { height: 80, textAlignVertical: "top" },

  coordRow: { flexDirection: "row", gap: 12 },
  coordField: { flex: 1 },

  dateTimeRow: { flexDirection: "row", gap: 12 },
  dateTimeBtn: { flex: 1, justifyContent: "center" },
  dateTimeText: { color: COLORS.text, fontSize: 15 },
  dateTimeDone: {
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  dateTimeDoneText: { color: COLORS.primary, fontSize: 15, fontWeight: "700" },

  // Image picker
  imagePicker: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
  },
  imagePreview: { width: "100%", height: 180 },
  imagePlaceholder: {
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  imagePlaceholderIcon: { fontSize: 32 },
  imagePlaceholderText: { color: COLORS.text, fontSize: 15, fontWeight: "600" },
  imagePlaceholderSub: { color: COLORS.textMuted, fontSize: 12 },
  removeImage: { marginTop: 6, alignSelf: "flex-end" },
  removeImageText: { color: COLORS.danger, fontSize: 13 },

  secretRow: { flexDirection: "row", gap: 8 },
  secretInput: { flex: 1 },
  generateBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
  },
  generateBtnText: { color: COLORS.background, fontSize: 14, fontWeight: "700" },

  previewCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  previewLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  qrWrapper: { padding: 16, backgroundColor: "#ffffff", borderRadius: 12 },
  previewHint: { marginTop: 12, fontSize: 12, color: COLORS.textMuted, textAlign: "center" },

  createBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { color: COLORS.background, fontSize: 17, fontWeight: "700" },
  busyRow: { flexDirection: "row", alignItems: "center" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    width: "100%",
  },
  modalTitle: { fontSize: 22, fontWeight: "800", color: COLORS.primary, marginBottom: 4 },
  modalSubtitle: { fontSize: 15, color: COLORS.textMuted, marginBottom: 24 },
  secretText: {
    marginTop: 16,
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
    paddingHorizontal: 32,
    alignItems: "center",
    width: "100%",
  },
  shareBtnText: { color: COLORS.background, fontSize: 16, fontWeight: "700" },
  doneBtn: { marginTop: 12, paddingVertical: 10 },
  doneBtnText: { color: COLORS.textMuted, fontSize: 15 },
});
