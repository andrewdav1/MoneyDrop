import Stripe from "stripe";
import { defineSecret } from "firebase-functions/params";

/**
 * Firebase secret references.
 *
 * Set them once via the CLI:
 *   firebase functions:secrets:set STRIPE_SECRET_KEY
 *   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
 *
 * For local emulator development, export them as environment variables:
 *   export STRIPE_SECRET_KEY=sk_test_...
 *   export STRIPE_WEBHOOK_SECRET=whsec_...
 */
export const stripeSecretKey    = defineSecret("STRIPE_SECRET_KEY");
export const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

/** Return an initialised Stripe client using the runtime secret value. */
export function getStripe(): Stripe {
  const key = stripeSecretKey.value();
  if (!key) throw new Error("STRIPE_SECRET_KEY secret is not set.");
  return new Stripe(key, { apiVersion: "2026-02-25.clover" });
}
