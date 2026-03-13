import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { broadcast } from "./notifications";

const db = () => admin.firestore();

/**
 * activateScheduledDrops — Pub/Sub Scheduled Function
 *
 * Runs every minute. Scans for drops in "scheduled" state whose
 * scheduledAt has passed and flips them to "active".
 *
 * Also expires any "active" drops whose claim window (30 min) has closed.
 */
export const activateScheduledDrops = onSchedule(
  { schedule: "every 1 minutes", region: "us-central1", timeoutSeconds: 60 },
  async () => {
    const firestore = db();
    const now = Timestamp.now();
    const CLAIM_WINDOW_SECS = 30 * 60; // 30 minutes

    const [toActivate, toExpire] = await Promise.all([
      // Drops ready to go live
      firestore
        .collection("drops")
        .where("status", "==", "scheduled")
        .where("scheduledAt", "<=", now)
        .get(),

      // Active drops whose window has elapsed
      firestore
        .collection("drops")
        .where("status", "==", "active")
        .where(
          "scheduledAt",
          "<=",
          Timestamp.fromMillis(now.toMillis() - CLAIM_WINDOW_SECS * 1000)
        )
        .get(),
    ]);

    if (toActivate.empty && toExpire.empty) return;

    const batch = firestore.batch();

    toActivate.docs.forEach((snap) => {
      console.log(`Activating drop ${snap.id}`);
      batch.update(snap.ref, {
        status: "active",
        activatedAt: FieldValue.serverTimestamp(),
      });
    });

    toExpire.docs.forEach((snap) => {
      console.log(`Expiring drop ${snap.id}`);
      batch.update(snap.ref, {
        status: "expired",
        expiredAt: FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
    console.log(
      `Activated ${toActivate.size} drop(s), expired ${toExpire.size} drop(s).`
    );

    // Send "drop is live" push notification for each newly activated drop
    for (const snap of toActivate.docs) {
      const { title, city, prizeAmountCents } = snap.data();
      const prize = `$${((prizeAmountCents as number) / 100).toFixed(2)}`;
      await broadcast(
        {
          title: "💰 Drop is LIVE!",
          body: `${prize} drop in ${city} — find the clue and claim it now!`,
          screen: "drop",
          data: { dropId: snap.id, dropTitle: title ?? "" },
        }
      ).catch((err) => console.error("Failed to broadcast drop-live notification:", err));
    }
  }
);
