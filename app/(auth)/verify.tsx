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
import { useLocalSearchParams, useRouter } from "expo-router";
import { confirmSmsCode } from "@/lib/auth";
import { COLORS } from "@/constants/config";

export default function VerifyScreen() {
  const router = useRouter();
  const { phone, verificationId } = useLocalSearchParams<{
    phone: string;
    verificationId: string;
  }>();

  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    setError(null);
    if (code.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    try {
      setIsVerifying(true);
      await confirmSmsCode(verificationId, code);
      // Root layout will redirect to /(tabs)/home after auth state changes
    } catch (e: any) {
      setError(e.message ?? "Invalid code. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Verify your number</Text>
      <Text style={styles.subtitle}>
        We sent a 6-digit code to{"\n"}
        <Text style={styles.phone}>{phone}</Text>
      </Text>

      <TextInput
        style={styles.input}
        value={code}
        onChangeText={setCode}
        placeholder="000000"
        placeholderTextColor={COLORS.textMuted}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={[styles.button, isVerifying && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={isVerifying}
      >
        {isVerifying ? (
          <ActivityIndicator color={COLORS.background} />
        ) : (
          <Text style={styles.buttonText}>Verify</Text>
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
  back: { position: "absolute", top: 64, left: 24 },
  backText: { color: COLORS.primary, fontSize: 16 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 22,
  },
  phone: { color: COLORS.primary, fontWeight: "600" },
  input: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 32,
    letterSpacing: 12,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    textAlign: "center",
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
