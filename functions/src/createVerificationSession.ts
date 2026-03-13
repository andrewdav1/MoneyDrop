import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { getStripe, stripeSecretKey } from "./stripe";
import { UserDoc } from "./types";

export interface CreateVerificationSessionResponse {
  verificationSessionId: string;
  /** Stripe-hosted verification URL — open with expo-web-browser */
  verificationUrl: string;
}

/**
 * createVerificationSession — HTTPS Callable
 *
 * Creates a Stripe Identity VerificationSession and returns the hosted
 * verification URL. The client opens this URL via expo-web-browser;
 * Stripe handles the ID capture flow and calls the webhook when complete.
 *
 * Also sets kycStatus: "pending" on the user document immediately so the UI
 * can show a loading state while waiting for the webhook.
 */
export const createVerificationSession = onCall<
  Record<string, never>,
  Promise<CreateVerificationSessionResponse>
>(
  { region: "us-central1", enforceAppCheck: false, secrets: [stripeSecretKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const uid = request.auth.uid;

    // ── Guard: already verified ────────────────────────────────────────────
    const userSnap = await admin.firestore().collection("users").doc(uid).get();
    if (!userSnap.exists) {
      throw new HttpsError("not-found", "User account not found.");
    }
    const user = userSnap.data() as UserDoc;
    if (user.kycStatus === "verified") {
      throw new HttpsError("already-exists", "Identity already verified.");
    }

    const stripe = getStripe();

    // ── Create VerificationSession ─────────────────────────────────────────
    // return_url brings the user back into the app after the hosted flow ends.
    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      options: {
        document: {
          allowed_types: ["driving_license", "id_card", "passport"],
          require_live_capture: true,
          require_matching_selfie: true,
        },
      },
      // Return user to the withdraw screen in the app after completion.
      // expo-web-browser's openAuthSessionAsync will close when this scheme fires.
      return_url: "moneydrop://withdraw",
      // uid stored in metadata so the webhook can find the user
      metadata: { uid },
    });

    // ── Mark user as KYC pending ───────────────────────────────────────────
    await admin.firestore().collection("users").doc(uid).update({
      kycStatus: "pending",
      kycVerificationSessionId: session.id,
      kycUpdatedAt: FieldValue.serverTimestamp(),
    });

    return {
      verificationSessionId: session.id,
      verificationUrl: session.url ?? "",
    };
  }
);
