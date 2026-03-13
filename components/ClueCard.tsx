import { View, Text, Image, StyleSheet } from "react-native";
import { Drop } from "@/types";
import { COLORS } from "@/constants/config";

interface Props {
  drop: Drop;
}

export function ClueCard({ drop }: Props) {
  return (
    <View style={styles.card}>
      {drop.clueImageUrl ? (
        <Image source={{ uri: drop.clueImageUrl }} style={styles.image} resizeMode="cover" />
      ) : null}
      <View style={styles.body}>
        <Text style={styles.city}>📍 {drop.city}</Text>
        <Text style={styles.clue}>{drop.clueText}</Text>
        <Text style={styles.prize}>
          Prize: ${((drop.prizeAmountCents ?? 0) / 100).toFixed(2)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  image: { width: "100%", height: 200 },
  body: { padding: 16 },
  city: { fontSize: 14, color: COLORS.textMuted, marginBottom: 8, fontWeight: "600" },
  clue: { fontSize: 16, color: COLORS.text, lineHeight: 24, marginBottom: 12 },
  prize: { fontSize: 18, color: COLORS.primary, fontWeight: "700" },
});
