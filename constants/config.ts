// ---------------------------------------------------------------------------
// App-wide constants
// ---------------------------------------------------------------------------

export const APP_NAME = "MoneyDrop";

/** Drop goes live once per day at this UTC hour */
export const DAILY_DROP_HOUR_UTC = 18; // 6 PM UTC

/** How long after activation the drop stays claimable (ms) */
export const DROP_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

/** Colours */
export const COLORS = {
  background: "#0A0A0A",
  surface: "#1A1A1A",
  card: "#242424",
  primary: "#FFD700", // Gold
  primaryDark: "#B8960C",
  secondary: "#00E5FF",
  success: "#00C853",
  danger: "#FF3D00",
  text: "#FFFFFF",
  textMuted: "#9E9E9E",
  border: "#333333",
} as const;

export const FONTS = {
  regular: "System",
  bold: "System",
} as const;
