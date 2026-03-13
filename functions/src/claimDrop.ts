import * as admin from "firebase-admin";
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { ClaimDropRequest, ClaimDropResponse, Drop, UserDoc } from "./types";
import { safeEqual, haversineMetres } from "./utils";

const db = () => admin.firestore();

/**
 * claimDropHandler — the pure, testable handler.
 *
 * Validates and atomically processes a drop claim inside a Firestore
 * transaction. All security logic lives here; clients cannot bypass it
 * because Firestore rules deny direct writes to drops/transactions.
 *
 * Checks performed (in order):
 *  1. User is authenticated
 *  2. Request payload is well-formed
 *  3. Drop document exists
 *  4. Drop status is "active"
 *  5. Drop has not expired (scheduledAt + claimWindowMs)
 *  6. QR secret matches (constant-time comparison)
 *  7. User has not already claimed this drop
 *  8. If client provides GPS coords, user is within claimRadiusMetres
 */
export async function claimDropHandler(
  request: CallableRequest<ClaimDropRequest>
): Promise<ClaimDropResponse> {
  // ── 1. Auth check ───────────────────────────────────────────────────────
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in to claim a drop.");
  }
  const uid = request.auth.uid;

    // ── 2. Input validation ─────────────────────────────────────────────────
    const { dropId, qrCodeSecret, lat, lng } = request.data;

    if (!dropId || typeof dropId !== "string") {
      throw new HttpsError("invalid-argument", "dropId is required.");
    }
    if (!qrCodeSecret || typeof qrCodeSecret !== "string") {
      throw new HttpsError("invalid-argument", "qrCodeSecret is required.");
    }
    const hasGps =
      typeof lat === "number" && typeof lng === "number" &&
      isFinite(lat) && isFinite(lng);

    // ── 3–8. Atomic Firestore transaction ───────────────────────────────────
    const firestore = db();
    const dropRef = firestore.collection("drops").doc(dropId);
    const userRef = firestore.collection("users").doc(uid);
    const txRef = firestore.collection("transactions").doc(); // pre-generate ID

    let prizeAmountCents = 0;

    try {
      await firestore.runTransaction(async (tx) => {
        const [dropSnap, userSnap] = await Promise.all([
          tx.get(dropRef),
          tx.get(userRef),
        ]);

        // ── 3. Drop exists ────────────────────────────────────────────────
        if (!dropSnap.exists) {
          throw new HttpsError("not-found", "Drop not found.");
        }
        const drop = dropSnap.data() as Drop;

        // ── 4. Status check ───────────────────────────────────────────────
        if (drop.status !== "active") {
          const msg =
            drop.status === "claimed"
              ? "This drop has already been claimed."
              : drop.status === "expired"
              ? "This drop has expired."
              : "This drop is not yet active.";
          throw new HttpsError("failed-precondition", msg);
        }

        // ── 5. Expiry check ───────────────────────────────────────────────
        const CLAIM_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours
        const scheduledMs = drop.scheduledAt.toMillis();
        if (Date.now() > scheduledMs + CLAIM_WINDOW_MS) {
          // Mark expired and bail — we'll let the scheduled function handle it
          // normally, but we protect against the race here.
          tx.update(dropRef, { status: "expired" });
          throw new HttpsError("deadline-exceeded", "The claim window for this drop has closed.");
        }

        // ── 6. QR secret validation (constant-time) ───────────────────────
        if (!safeEqual(drop.qrCodeSecret, qrCodeSecret)) {
          throw new HttpsError("permission-denied", "Invalid QR code.");
        }

        // ── 7. Duplicate claim check ──────────────────────────────────────
        if (!userSnap.exists) {
          throw new HttpsError("not-found", "User account not found.");
        }
        const user = userSnap.data() as UserDoc;
        if (user.claimedDropIds?.includes(dropId)) {
          throw new HttpsError("already-exists", "You have already claimed this drop.");
        }

        // ── 8. GPS proximity check (optional) ────────────────────────────
        if (hasGps) {
          const distanceM = haversineMetres(lat!, lng!, drop.lat, drop.lng);
          if (distanceM > drop.claimRadiusMetres) {
            throw new HttpsError(
              "out-of-range",
              `You are ${Math.round(distanceM)}m away. Must be within ${drop.claimRadiusMetres}m to claim.`
            );
          }
        }

        prizeAmountCents = drop.prizeAmountCents;
        const now = FieldValue.serverTimestamp();

        // ── Atomic writes ─────────────────────────────────────────────────
        tx.update(dropRef, {
          status: "claimed",
          claimedAt: now,
          claimedByUid: uid,
        });

        tx.update(userRef, {
          walletBalance: FieldValue.increment(prizeAmountCents),
          claimedDropIds: FieldValue.arrayUnion(dropId),
        });

        tx.set(txRef, {
          uid,
          type: "drop_claim",
          amountCents: prizeAmountCents,
          description: `Claimed drop: ${drop.title ?? dropId} in ${drop.city}`,
          dropId,
          createdAt: now,
        });
      });
    } catch (err: unknown) {
      // Re-throw HttpsErrors as-is; wrap unexpected errors
      if (err instanceof HttpsError) throw err;
      console.error("claimDrop transaction failed:", err);
      throw new HttpsError("internal", "An unexpected error occurred. Please try again.");
    }

    return {
      success: true,
      message: "Congratulations! You claimed the drop.",
      prizeAmountCents,
    };
}

/** HTTPS Callable wrapper — deployed to Firebase. */
export const claimDrop = onCall<ClaimDropRequest, Promise<ClaimDropResponse>>(
  { region: "us-central1", enforceAppCheck: false },
  claimDropHandler
);
