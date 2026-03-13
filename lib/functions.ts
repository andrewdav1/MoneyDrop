import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

// ---------------------------------------------------------------------------
// Typed wrappers for every Cloud Function callable
// ---------------------------------------------------------------------------

export interface ClaimDropRequest {
  dropId: string;
  qrCodeSecret: string;
  /** Optional GPS for proximity validation */
  lat?: number;
  lng?: number;
}

export interface ClaimDropResponse {
  success: boolean;
  message: string;
  prizeAmountCents?: number;
}

/**
 * Call the `claimDrop` Cloud Function.
 * All validation and atomic writes happen server-side.
 */
export async function callClaimDrop(
  payload: ClaimDropRequest
): Promise<ClaimDropResponse> {
  const fn = httpsCallable<ClaimDropRequest, ClaimDropResponse>(
    functions,
    "claimDrop"
  );
  const result = await fn(payload);
  return result.data;
}

// ---------------------------------------------------------------------------
// Stripe Identity KYC
// ---------------------------------------------------------------------------

export interface CreateVerificationSessionResponse {
  verificationSessionId: string;
  /** Stripe-hosted verification URL — open with expo-web-browser */
  verificationUrl: string;
}

/**
 * Call the `createVerificationSession` Cloud Function.
 * Returns the IDs needed to present Stripe's identity capture sheet.
 */
export async function callCreateVerificationSession(): Promise<CreateVerificationSessionResponse> {
  const fn = httpsCallable<Record<string, never>, CreateVerificationSessionResponse>(
    functions,
    "createVerificationSession"
  );
  const result = await fn({});
  return result.data;
}
