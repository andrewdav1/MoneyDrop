import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "@/constants/config";

interface Props {
  balanceCents: number;
}

export function WalletBalance({ balanceCents }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Balance</Text>
      <Text style={styles.amount}>${(balanceCents / 100).toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center" },
  label: { fontSize: 12, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 },
  amount: { fontSize: 36, fontWeight: "900", color: COLORS.primary },
});
