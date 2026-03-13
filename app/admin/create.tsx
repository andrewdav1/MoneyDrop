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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import QRCode from "react-native-qrcode-svg";
import { db } from "@/lib/firebase";
import { COLORS } from "@/constants/config";

interface DropForm {
  title: string;
  description: string;
  city: string;
  prizeAmountDollars: string;
  clueText: string;
  clueImageUrl: string;
  claimRadiusMetres: string;
  lat: string;
  lng: string;
  scheduledAt: string;
  qrCodeSecret: string;
}

const DEFAULT_FORM: DropForm = {
  title: "",
  description: "",
  city: "",
  prizeAmountDollars: "100",
  clueText: "",
  clueImageUrl: "",
  claimRadiusMetres: "100",
  lat: "",
  lng: "",
  scheduledAt: "",
  qrCodeSecret: "",
};

/** Generate a cryptographically random 32-char hex secret. */
function generateSecret(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export default function CreateDropScreen() {
  const router = useRouter();
  const [form, setForm] = useState<DropForm>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [savedDrop, setSavedDrop] = useState<{ title: string; secret: string } | null>(null);

  function update(key: keyof DropForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const handleGenerate = useCallback(() => {
    update("qrCodeSecret", generateSecret());
  }, []);

  async function handleCreate() {
    const { title, city, clueText, prizeAmountDollars, scheduledAt, qrCodeSecret, lat, lng } =
      form;
    if (!title || !city || !clueText || !scheduledAt || !qrCodeSecret || !lat || !lng) {
      Alert.alert("Missing fields", "Please fill in all required fields.");
      return;
    }

    try {
      setIsSaving(true);
      await addDoc(collection(db, "drops"), {
        title,
        description: form.description,
        city,
        prizeAmountCents: Math.round(parseFloat(prizeAmountDollars) * 100),
        clueText,
        clueImageUrl: form.clueImageUrl,
        claimRadiusMetres: parseInt(form.claimRadiusMetres, 10),
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        scheduledAt: new Date(scheduledAt),
        qrCodeSecret,
        status: "scheduled",
        createdAt: serverTimestamp(),
      });

      setSavedDrop({ title, secret: qrCodeSecret });
      setForm(DEFAULT_FORM);
    } catch (e: any) {
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
      // user cancelled share sheet — no-op
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {(
          [
            { label: "Title *", key: "title", placeholder: "Downtown Treasure" },
            { label: "Description", key: "description", placeholder: "Short description..." },
            { label: "City *", key: "city", placeholder: "San Francisco" },
            {
              label: "Prize ($) *",
              key: "prizeAmountDollars",
              placeholder: "100",
              keyboard: "decimal-pad",
            },
            {
              label: "Clue Text *",
              key: "clueText",
              placeholder: "Find the golden statue near...",
              multiline: true,
            },
            { label: "Clue Image URL", key: "clueImageUrl", placeholder: "https://..." },
            {
              label: "Claim Radius (m) *",
              key: "claimRadiusMetres",
              placeholder: "100",
              keyboard: "number-pad",
            },
            { label: "Latitude *", key: "lat", placeholder: "37.7749", keyboard: "decimal-pad" },
            {
              label: "Longitude *",
              key: "lng",
              placeholder: "-122.4194",
              keyboard: "decimal-pad",
            },
            { label: "Scheduled At (ISO) *", key: "scheduledAt", placeholder: "2026-03-13T18:00:00Z" },
          ] as Array<{
            label: string;
            key: keyof DropForm;
            placeholder: string;
            keyboard?: any;
            multiline?: boolean;
          }>
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

        {/* QR Code Secret — with Generate button */}
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

        {/* Live QR code preview */}
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
          style={[styles.createBtn, isSaving && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={COLORS.background} />
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
                <QRCode
                  value={savedDrop.secret}
                  size={220}
                  backgroundColor="#ffffff"
                  color="#000000"
                />
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
  qrWrapper: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderRadius: 12,
  },
  previewHint: {
    marginTop: 12,
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "center",
  },

  createBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { color: COLORS.background, fontSize: 17, fontWeight: "700" },

  // Modal
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
