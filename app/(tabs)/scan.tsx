import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";
import { useActiveDrops } from "@/hooks/useActiveDrops";
import { claimDrop } from "@/lib/firestore";
import { COLORS } from "@/constants/config";

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const { drops } = useActiveDrops();

  async function handleBarCodeScanned({ data }: { data: string }) {
    if (scanned || isClaiming) return;
    setScanned(true);

    if (drops.length === 0) {
      Alert.alert("No Active Drop", "There is no active drop to claim right now.");
      setScanned(false);
      return;
    }

    // Match the scanned QR secret against all active drops
    const matchedDrop = drops.find((d) => d.qrCodeSecret === data);
    if (!matchedDrop) {
      Alert.alert("Not Recognized", "This QR code doesn't match any active drop.");
      setScanned(false);
      return;
    }

    try {
      setIsClaiming(true);

      // Attempt to get GPS for server-side proximity validation
      let coords: { lat: number; lng: number } | undefined;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      }

      const result = await claimDrop(matchedDrop.id, data, coords);
      Alert.alert(
        result.success ? "🎉 Claimed!" : "Not Valid",
        result.message,
        [{ text: "OK", onPress: () => setScanned(false) }]
      );
    } catch (e: any) {
      Alert.alert("Could Not Claim", e.message ?? "Something went wrong.");
      setScanned(false);
    } finally {
      setIsClaiming(false);
    }
  }

  if (!permission) {
    return <SafeAreaView style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>📷 QR Scanner</Text>
        <Text style={styles.muted}>Camera permission is needed to scan QR codes.</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const hint =
    drops.length === 0
      ? "Waiting for an active drop..."
      : drops.length === 1
      ? `Scanning for: ${drops[0].city} drop`
      : `${drops.length} active drops — scan any QR code`;

  return (
    <View style={styles.fullscreen}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />

      {/* Overlay */}
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <Text style={styles.overlayTitle}>Scan the QR Code</Text>
        <View style={styles.viewfinder} />
        <Text style={styles.overlayHint}>{hint}</Text>

        {isClaiming && (
          <View style={styles.claimingOverlay}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.claimingText}>Claiming drop...</Text>
          </View>
        )}

        {scanned && !isClaiming && (
          <TouchableOpacity style={styles.btn} onPress={() => setScanned(false)}>
            <Text style={styles.btnText}>Scan Again</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </View>
  );
}

const FRAME = 260;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  fullscreen: { flex: 1 },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  overlayTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "700",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  viewfinder: {
    width: FRAME,
    height: FRAME,
    borderWidth: 3,
    borderColor: COLORS.primary,
    borderRadius: 20,
  },
  overlayHint: {
    color: COLORS.text,
    fontSize: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  claimingOverlay: { alignItems: "center", gap: 12 },
  claimingText: { color: COLORS.primary, fontSize: 16, fontWeight: "700" },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.primary, marginBottom: 16 },
  muted: { color: COLORS.textMuted, fontSize: 16, textAlign: "center", marginBottom: 32 },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  btnText: { color: COLORS.background, fontSize: 16, fontWeight: "700" },
});
