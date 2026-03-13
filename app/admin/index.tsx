import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
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
  scheduledAt: string; // ISO date-time string
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

export default function AdminScreen() {
  const [form, setForm] = useState<DropForm>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);

  function update(key: keyof DropForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreate() {
    const { title, city, clueText, prizeAmountDollars, scheduledAt, qrCodeSecret, lat, lng } = form;
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

      Alert.alert("Drop Created", `"${title}" scheduled for ${scheduledAt}`);
      setForm(DEFAULT_FORM);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to create drop.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Admin — Create Drop</Text>

        {(
          [
            { label: "Title *", key: "title", placeholder: "Downtown Treasure" },
            { label: "Description", key: "description", placeholder: "Short description..." },
            { label: "City *", key: "city", placeholder: "San Francisco" },
            { label: "Prize ($) *", key: "prizeAmountDollars", placeholder: "100", keyboard: "decimal-pad" },
            { label: "Clue Text *", key: "clueText", placeholder: "Find the golden statue near...", multiline: true },
            { label: "Clue Image URL", key: "clueImageUrl", placeholder: "https://..." },
            { label: "Claim Radius (m) *", key: "claimRadiusMetres", placeholder: "100", keyboard: "number-pad" },
            { label: "Latitude *", key: "lat", placeholder: "37.7749", keyboard: "decimal-pad" },
            { label: "Longitude *", key: "lng", placeholder: "-122.4194", keyboard: "decimal-pad" },
            { label: "Scheduled At (ISO) *", key: "scheduledAt", placeholder: "2026-03-13T18:00:00Z" },
            { label: "QR Code Secret *", key: "qrCodeSecret", placeholder: "Random secret key" },
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: "800", color: COLORS.primary, marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { fontSize: 12, color: COLORS.textMuted, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
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
  createBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { color: COLORS.background, fontSize: 17, fontWeight: "700" },
});
