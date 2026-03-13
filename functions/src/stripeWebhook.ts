import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import Stripe from "stripe";
import { getStripe, stripeSecretKey, stripeWebhookSecret } from "./stripe";
import { KycStatus } from "./types";

/**
 * stripeWebhook — raw HTTPS endpoint (NOT a callable)
 *
 * Receives Stripe Identity webhook events and updates Firestore.
 * Must be registered in the Stripe Dashboard with the function's URL.
 *
 * Local testing with Stripe CLI:
 *   stripe listen --forward-to http://127.0.0.1:5001/demo-moneydrop/us-central1/stripeWebhook
 *   stripe trigger identity.verification_session.verified
 *
 * Events handled:
 *   identity.verification_session.verified       → kycStatus: "verified"
 *   identity.verification_session.requires_input → kycStatus: "requires_input"
 *   identity.verification_session.canceled       → kycStatus: "none"
 */
export const stripeWebhook = onRequest(
  {
    region: "us-central1",
    secrets: [stripeSecretKey, stripeWebhookSecret],
    // Stripe sends raw JSON — do not parse the body automatically
    invoker: "public",
  },
  async (req, res) => {
    // ── Only accept POST ───────────────────────────────────────────────────
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const sig = req.headers["stripe-signature"];
    if (!sig || typeof sig !== "string") {
      res.status(400).json({ error: "Missing stripe-signature header" });
      return;
    }

    // ── Verify signature ───────────────────────────────────────────────────
    // Firebase Functions provides req.rawBody (Buffer) for signature validation.
    const stripe = getStripe();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        stripeWebhookSecret.value()
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Webhook signature verification failed:", msg);
      res.status(400).json({ error: `Webhook error: ${msg}` });
      return;
    }

    // ── Route by event type ────────────────────────────────────────────────
    const session = event.data.object as Stripe.Identity.VerificationSession;
    const uid = session.metadata?.uid;

    if (!uid) {
      // Silently accept — may be a test event without metadata
      console.warn(`Event ${event.type} has no uid in metadata; ignoring.`);
      res.status(200).json({ received: true });
      return;
    }

    const userRef = admin.firestore().collection("users").doc(uid);
    const now = admin.firestore.FieldValue.serverTimestamp();

    try {
      switch (event.type) {
        case "identity.verification_session.verified":
          await userRef.update({
            kycStatus: "verified" satisfies KycStatus,
            kycVerifiedAt: now,
            kycUpdatedAt: now,
            // Clear the session ID — no longer needed
            kycVerificationSessionId: admin.firestore.FieldValue.delete(),
            kycLastError: admin.firestore.FieldValue.delete(),
          });
          console.log(`KYC verified for uid ${uid}`);
          break;

        case "identity.verification_session.requires_input": {
          const errorCode = session.last_error?.code ?? "unknown";
          const errorReason = session.last_error?.reason ?? "";
          await userRef.update({
            kycStatus: "requires_input" satisfies KycStatus,
            kycLastError: `${errorCode}${errorReason ? `: ${errorReason}` : ""}`,
            kycUpdatedAt: now,
          });
          console.log(`KYC requires_input for uid ${uid}: ${errorCode}`);
          break;
        }

        case "identity.verification_session.canceled":
          await userRef.update({
            kycStatus: "none" satisfies KycStatus,
            kycUpdatedAt: now,
            kycVerificationSessionId: admin.firestore.FieldValue.delete(),
          });
          console.log(`KYC canceled for uid ${uid}`);
          break;

        default:
          console.log(`Unhandled Stripe Identity event: ${event.type}`);
      }
    } catch (err) {
      console.error(`Failed to update Firestore for uid ${uid}:`, err);
      // Return 500 so Stripe retries the webhook
      res.status(500).json({ error: "Internal error processing webhook" });
      return;
    }

    res.status(200).json({ received: true });
  }
);
