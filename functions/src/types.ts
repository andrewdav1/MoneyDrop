// Shared domain types for Cloud Functions (mirrors app/types/index.ts)

export type DropStatus = "scheduled" | "active" | "claimed" | "expired";

export interface Drop {
  id?: string;
  title: string;
  prizeAmountCents: number;
  city: string;
  lat: number;
  lng: number;
  claimRadiusMetres: number;
  qrCodeSecret: string;
  status: DropStatus;
  scheduledAt: FirebaseFirestore.Timestamp;
  claimedAt?: FirebaseFirestore.Timestamp;
  claimedByUid?: string;
}

export type KycStatus =
  | "none"
  | "pending"
  | "verified"
  | "requires_input"
  | "failed";

export interface UserDoc {
  uid: string;
  walletBalance: number;
  claimedDropIds: string[];
  expoPushToken?: string;
  kycStatus?: KycStatus;
  kycVerificationSessionId?: string;
  kycVerifiedAt?: FirebaseFirestore.Timestamp;
  kycLastError?: string;
}

export interface ClaimDropRequest {
  dropId: string;
  qrCodeSecret: string;
  /** Optional — client's GPS latitude for proximity check */
  lat?: number;
  /** Optional — client's GPS longitude for proximity check */
  lng?: number;
}

export interface ClaimDropResponse {
  success: boolean;
  message: string;
  prizeAmountCents?: number;
}
