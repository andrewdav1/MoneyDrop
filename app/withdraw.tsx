import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useAuthStore } from "@/store/authStore";
import { subscribeToUser } from "@/lib/firestore";
import { callCreateVerificationSession } from "@/lib/functions";
import { COLORS } from "@/constants/config";
import type { KycStatus, User } from "@/types";

// ---------------------------------------------------------------------------
// KYC status copy
// ---------------------------------------------------------------------------

const KYC_COPY: Record<
  KycStatus,
  { emoji: string; heading: string; body: string; color: string }
> = {
  none: {
    emoji: "🪪",
    heading: "Verify your identity",
    body: "One-time ID check required before your first withdrawal.\nTakes about 2 minutes.",
    color: COLORS.primary,
  },
  pending: {
    emoji: "⏳",
    heading: "Verification in progress",
    body: "Stripe is reviewing your documents. This usually takes less than a minute.",
    color: COLORS.secondary,
  },
  verified: {
    emoji: "✅",
    heading: "Identity verified",
    body: "You're all set to withdraw your earnings.",
    color: COLORS.success,
  },
  requires_input: {
    emoji: "🔁",
    heading: "Retry required",
    body: "Stripe couldn't verify your documents. Please try again with a clearer photo.",
    color: COLORS.danger,
  },
  failed: {
    emoji: "❌",
    heading: "Verification failed",
    body: "We couldn't verify your identity. Please contact support.",
    color: COLORS.danger,
  },
};

// ---------------------------------------------------------------------------
// Withdraw screen
// ---------------------------------------------------------------------------

export default function WithdrawScreen() {
  const router = useRouter();
  const appUserInit = useAuthStore((s) => s.appUser);

  // Real-time user state — kycStatus updates when the Stripe webhook fires
  const [user, setUser] = useState<User | null>(appUserInit);
  const [isStartingKyc, setIsStartingKyc] = useState(false);

  // Withdrawal form
  const [amountInput, setAmountInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const kycStatus: KycStatus = user?.kycStatus ?? "none";
  const meta = KYC_COPY[kycStatus];

  // Subscribe to real-time user doc so the screen reacts when the
  // Stripe webhook fires and kycStatus transitions server-side.
  useEffect(() => {
    if (!appUserInit?.uid) return;
    return subscribeToUser(appUserInit.uid, (updated) => {
      if (updated) setUser(updated);
    });
  }, [appUserInit?.uid]);

  // ── Start KYC ─────────────────────────────────────────────────────────────
  const handleStartKyc = useCallback(async () => {
    setIsStartingKyc(true);
    try {
      const { verificationUrl } = await callCreateVerificationSession();

      // Open Stripe's hosted identity capture page in a browser.
      // When the user finishes or closes, the Stripe webhook fires and
      // kycStatus updates automatically via the real-time subscription above.
      await WebBrowser.openBrowserAsync(verificationUrl);
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Could not start verification. Please try again.");
    } finally {
      setIsStartingKyc(false);
    }
  }, []);

  // ── Withdrawal submission (placeholder for Stripe Connect payout) ─────────
  const handleWithdraw = useCallback(async () => {
    const cents = Math.round(parseFloat(amountInput) * 100);
    if (isNaN(cents) || cents < 500) {
      Alert.alert("Minimum withdrawal", "Minimum withdrawal is $5.00.");
      return;
    }
    if (cents > (user?.walletBalance ?? 0)) {
      Alert.alert("Insufficient balance", "Amount exceeds your available balance.");
      return;
    }

    Alert.alert(
      "Confirm withdrawal",
      `Withdraw $${(cents / 100).toFixed(2)} to your bank account?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setIsSubmitting(true);
            try {
              // TODO: call a `requestWithdrawal` Cloud Function that creates
              // a Stripe Connect OutboundPayment or manual payout.
              await new Promise((r) => setTimeout(r, 1000));
              Alert.alert(
                "Withdrawal requested",
                "Your funds will arrive in 2–3 business days.",
                [{ text: "OK", onPress: () => router.back() }]
              );
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  }, [amountInput, user?.walletBalance, router]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Withdraw</Text>
          <View style={{ width: 48 }} />
        </View>

        {/* Balance */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balance}>
            ${((user?.walletBalance ?? 0) / 100).toFixed(2)}
          </Text>
        </View>

        {/* KYC status card */}
        <View style={[styles.kycCard, { borderColor: meta.color }]}>
          <Text style={styles.kycEmoji}>{meta.emoji}</Text>
          <Text style={[styles.kycHeading, { color: meta.color }]}>
            {meta.heading}
          </Text>
          <Text style={styles.kycBody}>{meta.body}</Text>

          {user?.kycLastError && kycStatus === "requires_input" && (
            <Text style={styles.kycError}>Reason: {user.kycLastError}</Text>
          )}

          {(kycStatus === "none" || kycStatus === "requires_input") && (
            <TouchableOpacity
              style={[styles.kycBtn, isStartingKyc && styles.btnDisabled]}
              onPress={handleStartKyc}
              disabled={isStartingKyc}
            >
              {isStartingKyc ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <Text style={styles.kycBtnText}>
                  {kycStatus === "none" ? "Start Verification" : "Retry Verification"}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {kycStatus === "pending" && (
            <ActivityIndicator color={COLORS.secondary} style={{ marginTop: 16 }} />
          )}
        </View>

        {/* Withdrawal form — only shown once KYC is verified */}
        {kycStatus === "verified" && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Withdrawal amount</Text>

            <View style={styles.inputRow}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                value={amountInput}
                onChangeText={setAmountInput}
                placeholder="0.00"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.quickAmounts}>
              {[10, 25, 50, 100].map((amount) => {
                const disabled = amount * 100 > (user?.walletBalance ?? 0);
                return (
                  <TouchableOpacity
                    key={amount}
                    style={[styles.quickBtn, disabled && styles.quickBtnDisabled]}
                    onPress={() => setAmountInput(String(amount))}
                    disabled={disabled}
                  >
                    <Text style={styles.quickBtnText}>${amount}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.bankRow}>
              <Text style={styles.bankLabel}>To</Text>
              <Text style={styles.bankValue}>••••  4242 (Visa Debit)</Text>
              <TouchableOpacity>
                <Text style={styles.bankChange}>Change</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.withdrawBtn,
                (isSubmitting || !amountInput) && styles.btnDisabled,
              ]}
              onPress={handleWithdraw}
              disabled={isSubmitting || !amountInput}
            >
              {isSubmitting ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <Text style={styles.withdrawBtnText}>
                  Withdraw ${parseFloat(amountInput || "0").toFixed(2)}
                </Text>
              )}
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              Funds typically arrive in 2–3 business days. Minimum $5.00.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 24, paddingBottom: 48 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  back: { color: COLORS.primary, fontSize: 16, width: 48 },
  title: { fontSize: 20, fontWeight: "800", color: COLORS.text },

  balanceCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  balance: { fontSize: 44, fontWeight: "900", color: COLORS.primary },

  kycCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1.5,
    marginBottom: 20,
  },
  kycEmoji: { fontSize: 40, marginBottom: 12 },
  kycHeading: { fontSize: 18, fontWeight: "800", marginBottom: 8 },
  kycBody: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 4,
  },
  kycError: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 8,
    textAlign: "center",
  },
  kycBtn: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    minWidth: 200,
    alignItems: "center",
  },
  kycBtnText: { color: COLORS.background, fontSize: 16, fontWeight: "700" },

  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formTitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  currencySymbol: { fontSize: 28, color: COLORS.textMuted, marginRight: 4 },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: "700",
    color: COLORS.text,
    paddingVertical: 14,
  },
  quickAmounts: { flexDirection: "row", gap: 8, marginBottom: 20 },
  quickBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickBtnDisabled: { opacity: 0.35 },
  quickBtnText: { color: COLORS.text, fontSize: 14, fontWeight: "600" },
  bankRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  bankLabel: { fontSize: 13, color: COLORS.textMuted, marginRight: 4 },
  bankValue: { flex: 1, color: COLORS.text, fontSize: 14, fontWeight: "500" },
  bankChange: { color: COLORS.primary, fontSize: 13, fontWeight: "600" },
  withdrawBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  withdrawBtnText: { color: COLORS.background, fontSize: 17, fontWeight: "700" },
  btnDisabled: { opacity: 0.5 },
  disclaimer: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
});
