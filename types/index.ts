// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type KycStatus =
  | "none"           // never started
  | "pending"        // session created / Stripe processing
  | "verified"       // identity confirmed ✓
  | "requires_input" // Stripe needs retry (bad image, unsupported doc, etc.)
  | "failed";        // hard failure — contact support

export interface User {
  uid: string;
  phone: string;
  displayName?: string;
  photoURL?: string;
  walletBalance: number;
  claimedDropIds: string[];
  createdAt: Date;
  isAdmin: boolean;
  /** Expo push token — set on device registration, absent if permission denied */
  expoPushToken?: string;
  /** Stripe Identity KYC status */
  kycStatus?: KycStatus;
  /** Active Stripe VerificationSession ID — cleared once verified */
  kycVerificationSessionId?: string;
  /** ISO timestamp set by the webhook when kycStatus → "verified" */
  kycVerifiedAt?: Date;
  /** Last Stripe error code when kycStatus → "requires_input" */
  kycLastError?: string;
}

export type DropStatus = "scheduled" | "active" | "claimed" | "expired";

export interface Drop {
  id: string;
  title: string;
  description: string;
  /** Prize amount in USD cents */
  prizeAmountCents: number;
  city: string;
  /** Latitude of the drop location */
  lat: number;
  /** Longitude of the drop location */
  lng: number;
  /** Radius in metres within which the QR code can be claimed */
  claimRadiusMetres: number;
  clueImageUrl: string;
  clueText: string;
  qrCodeSecret: string;
  status: DropStatus;
  scheduledAt: Date;
  claimedAt?: Date;
  claimedByUid?: string;
  createdAt: Date;
}

export interface WalletTransaction {
  id: string;
  uid: string;
  type: "drop_claim" | "withdrawal" | "bonus";
  amountCents: number;
  description: string;
  dropId?: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Navigation param types (Expo Router typed routes use file paths,
// but these are useful for passing search params)
// ---------------------------------------------------------------------------

export interface VerifyParams {
  phone: string;
  verificationId: string;
}
