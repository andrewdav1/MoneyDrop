import * as admin from "firebase-admin";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { broadcast, getTokenForUser, sendToToken } from "./notifications";

/**
 * onDropClaimed — Firestore trigger
 *
 * Fires when a drop document is updated. On a status transition to "claimed":
 *  1. Sends a personal "🎉 You won!" notification to the winner
 *  2. Broadcasts a "drop was claimed" notification to all other users
 *  3. Writes a server-side audit log entry
 */
export const onDropClaimed = onDocumentUpdated(
  { document: "drops/{dropId}", region: "us-central1" },
  async (event) => {
    const before = event.data?.before.data();
    const after  = event.data?.after.data();

    if (!before || !after) return;
    if (before.status === after.status) return;
    if (after.status !== "claimed") return;

    const { dropId } = event.params;
    const { claimedByUid, prizeAmountCents, city, title } = after;
    const prize = `$${((prizeAmountCents as number) / 100).toFixed(2)}`;

    console.log(
      `Drop ${dropId} ("${title}" in ${city}) claimed by ${claimedByUid} for ${prize}`
    );

    // ── 1. Personal "You won!" notification to the winner ──────────────────
    const winnerToken = await getTokenForUser(claimedByUid as string).catch(() => null);
    if (winnerToken) {
      await sendToToken(claimedByUid as string, winnerToken, {
        title: "🎉 You won!",
        body: `You claimed the ${title ?? city} drop and earned ${prize}. Check your wallet!`,
        screen: "wallet",
        data: { dropId, prize },
      }).catch((err) => console.error("Failed to send winner notification:", err));
    }

    // ── 2. Broadcast "drop was claimed" to everyone else ───────────────────
    await broadcast(
      {
        title: "Drop Claimed",
        body: `Someone just claimed the ${city} drop. Stay tuned for the next one!`,
        screen: "home",
        data: { dropId },
      },
      { excludeUids: [claimedByUid as string] }
    ).catch((err) => console.error("Failed to broadcast claim notification:", err));

    // ── 3. Audit log ────────────────────────────────────────────────────────
    await admin.firestore().collection("audit_logs").add({
      event: "drop_claimed",
      dropId,
      claimedByUid,
      prizeAmountCents,
      city,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
);
