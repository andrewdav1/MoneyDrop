import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useWallet } from "@/hooks/useWallet";
import { WalletTransaction } from "@/types";
import { signOut } from "@/lib/auth";
import { COLORS } from "@/constants/config";

function TransactionRow({ item }: { item: WalletTransaction }) {
  const isCredit = item.type === "drop_claim" || item.type === "bonus";
  const sign = isCredit ? "+" : "-";
  const amount = `${sign}$${(Math.abs(item.amountCents) / 100).toFixed(2)}`;

  return (
    <View style={styles.txRow}>
      <View style={styles.txInfo}>
        <Text style={styles.txDesc}>{item.description}</Text>
        <Text style={styles.txDate}>
          {item.createdAt instanceof Date
            ? item.createdAt.toLocaleDateString()
            : new Date((item.createdAt as any).seconds * 1000).toLocaleDateString()}
        </Text>
      </View>
      <Text style={[styles.txAmount, isCredit ? styles.credit : styles.debit]}>
        {amount}
      </Text>
    </View>
  );
}

export default function WalletScreen() {
  const router = useRouter();
  const { balanceCents, transactions, isLoading } = useWallet();

  async function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💰 Wallet</Text>
        <TouchableOpacity onPress={handleSignOut}>
          <Text style={styles.signOut}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balance}>${(balanceCents / 100).toFixed(2)}</Text>
        <TouchableOpacity
          style={styles.withdrawBtn}
          onPress={() => router.push("/withdraw")}
        >
          <Text style={styles.withdrawBtnText}>Withdraw →</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Transaction History</Text>

      {isLoading ? (
        <Text style={styles.muted}>Loading transactions...</Text>
      ) : transactions.length === 0 ? (
        <Text style={styles.muted}>No transactions yet.{"\n"}Win a drop to see earnings here!</Text>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TransactionRow item={item} />}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 24 },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.primary },
  signOut: { color: COLORS.danger, fontSize: 14, fontWeight: "600" },
  balanceCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginBottom: 32,
  },
  balanceLabel: { fontSize: 13, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  balance: { fontSize: 52, fontWeight: "900", color: COLORS.primary, marginBottom: 20 },
  withdrawBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  withdrawBtnText: { color: COLORS.background, fontSize: 15, fontWeight: "700" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text, marginBottom: 12 },
  txRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  txInfo: { flex: 1, marginRight: 12 },
  txDesc: { fontSize: 14, color: COLORS.text, fontWeight: "500", marginBottom: 4 },
  txDate: { fontSize: 12, color: COLORS.textMuted },
  txAmount: { fontSize: 16, fontWeight: "700" },
  credit: { color: COLORS.success },
  debit: { color: COLORS.danger },
  muted: { color: COLORS.textMuted, fontSize: 15, textAlign: "center", marginTop: 40, lineHeight: 24 },
});
