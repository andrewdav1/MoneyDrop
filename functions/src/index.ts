import * as admin from "firebase-admin";

// Initialise the Admin SDK once, before any function imports use it
admin.initializeApp();

if (process.env.FUNCTIONS_EMULATOR === "true") {
  console.info("[Functions] Running in emulator mode");
}

// ---------------------------------------------------------------------------
// HTTPS Callables
// ---------------------------------------------------------------------------
export { claimDrop } from "./claimDrop";

// ---------------------------------------------------------------------------
// Scheduled (Pub/Sub)
// ---------------------------------------------------------------------------
export { activateScheduledDrops } from "./scheduledDrops";

// ---------------------------------------------------------------------------
// Firestore triggers
// ---------------------------------------------------------------------------
export { onDropClaimed } from "./onDropClaimed";

// ---------------------------------------------------------------------------
// Stripe Identity KYC
// ---------------------------------------------------------------------------
export { createVerificationSession } from "./createVerificationSession";
export { stripeWebhook } from "./stripeWebhook";
