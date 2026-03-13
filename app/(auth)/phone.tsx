import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { sendSmsCode } from "@/lib/auth";
import { COLORS } from "@/constants/config";

export default function PhoneScreen() {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setError(null);
    if (!phone.startsWith("+")) {
      setError("Enter your number in international format (e.g. +14155552671).");
      return;
    }
    try {
      setIsSending(true);
      const verificationId = await sendSmsCode(phone);
      router.push({
        pathname: "/(auth)/verify",
        params: { phone, verificationId },
      });
    } catch (e: any) {
      setError(e.message ?? "Failed to send code. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >

      <Text style={styles.logo}>💰</Text>
      <Text style={styles.title}>MoneyDrop</Text>
      <Text style={styles.subtitle}>Enter your phone number to get started.</Text>

      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="+1 415 555 2671"
        placeholderTextColor={COLORS.textMuted}
        keyboardType="phone-pad"
        autoFocus
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={[styles.button, isSending && styles.buttonDisabled]}
        onPress={handleSend}
        disabled={isSending}
      >
        {isSending ? (
          <ActivityIndicator color={COLORS.background} />
        ) : (
          <Text style={styles.buttonText}>Send Code</Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logo: { fontSize: 56, marginBottom: 8 },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 40,
  },
  input: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  button: {
    width: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: COLORS.background,
    fontSize: 17,
    fontWeight: "700",
  },
  error: { color: COLORS.danger, marginBottom: 12, textAlign: "center" },
});
