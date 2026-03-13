import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "@/constants/config";

interface Props {
  /** Unix timestamp (ms) of the target time */
  targetMs: number;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function msToHMS(ms: number): { h: number; m: number; s: number } {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    h: Math.floor(total / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
}

export function CountdownTimer({ targetMs }: Props) {
  const [remaining, setRemaining] = useState(targetMs - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const r = targetMs - Date.now();
      setRemaining(r);
      if (r <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [targetMs]);

  const { h, m, s } = msToHMS(remaining);

  return (
    <View style={styles.row}>
      <Unit value={pad(h)} label="HRS" />
      <Text style={styles.colon}>:</Text>
      <Unit value={pad(m)} label="MIN" />
      <Text style={styles.colon}>:</Text>
      <Unit value={pad(s)} label="SEC" />
    </View>
  );
}

function Unit({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.unit}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginVertical: 12 },
  colon: { fontSize: 40, fontWeight: "900", color: COLORS.primary, marginHorizontal: 4, marginBottom: 16 },
  unit: { alignItems: "center" },
  value: { fontSize: 48, fontWeight: "900", color: COLORS.primary, letterSpacing: 2 },
  label: { fontSize: 10, color: COLORS.textMuted, fontWeight: "700", letterSpacing: 1.5 },
});
