/**
 * scripts/seed.ts
 *
 * Populates the Firestore emulator with realistic test data.
 * Run with:  npm run seed
 *
 * Requires the emulator to already be running:  npm run emulator
 *
 * The script connects via the Admin SDK using the emulator environment
 * variables set automatically by the npm script wrapper.
 */

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";

import * as admin from "firebase-admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

// ---------------------------------------------------------------------------
// Init admin SDK in demo mode (no real service account needed)
// ---------------------------------------------------------------------------
admin.initializeApp({ projectId: "demo-moneydrop" });
const db = admin.firestore();
const auth = admin.auth();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function nowPlusMins(mins: number): Timestamp {
  return Timestamp.fromMillis(Date.now() + mins * 60_000);
}
function nowMinusMins(mins: number): Timestamp {
  return Timestamp.fromMillis(Date.now() - mins * 60_000);
}

// ---------------------------------------------------------------------------
// Seed data definitions
// ---------------------------------------------------------------------------

const USERS = [
  {
    uid: "test-admin-uid",
    phone: "+15550000001",
    displayName: "Admin User",
    walletBalance: 0,
    claimedDropIds: [] as string[],
    isAdmin: true,
    createdAt: Timestamp.now(),
  },
  {
    uid: "test-user-uid",
    phone: "+15550000002",
    displayName: "Alice Hunter",
    walletBalance: 5000, // $50 from a previous win
    claimedDropIds: ["drop-claimed"],
    isAdmin: false,
    createdAt: Timestamp.now(),
  },
  {
    uid: "test-user-2-uid",
    phone: "+15550000003",
    displayName: "Bob Seeker",
    walletBalance: 0,
    claimedDropIds: [] as string[],
    isAdmin: false,
    createdAt: Timestamp.now(),
  },
];

const DROPS = [
  {
    id: "drop-active",
    title: "Union Square Treasure",
    description: "A drop hidden in the heart of the city.",
    city: "San Francisco",
    lat: 37.7879,
    lng: -122.4075,
    claimRadiusMetres: 150,
    prizeAmountCents: 10000, // $100
    clueText:
      "I stand at the intersection of commerce and culture, where cable cars once turned. Look for the bronze fountain and face south.",
    clueImageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/UnionSquare-SF.jpg/640px-UnionSquare-SF.jpg",
    qrCodeSecret: "test-qr-secret-active-drop",
    status: "active",
    scheduledAt: nowMinusMins(10),
    createdAt: Timestamp.now(),
  },
  {
    id: "drop-scheduled",
    title: "Ferry Building Find",
    description: "Tomorrow's drop near the waterfront.",
    city: "San Francisco",
    lat: 37.7955,
    lng: -122.3937,
    claimRadiusMetres: 100,
    prizeAmountCents: 25000, // $250
    clueText:
      "At the edge of the bay where farmers sell their wares each Saturday, a clock tower watches over all who pass beneath its shadow.",
    clueImageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Ferry_Building%2C_San_Francisco.jpg/640px-Ferry_Building%2C_San_Francisco.jpg",
    qrCodeSecret: "test-qr-secret-scheduled-drop",
    status: "scheduled",
    scheduledAt: nowPlusMins(60 * 18), // 18 hours from now
    createdAt: Timestamp.now(),
  },
  {
    id: "drop-claimed",
    title: "Dolores Park Discovery",
    description: "Already claimed — shows history UI.",
    city: "San Francisco",
    lat: 37.7596,
    lng: -122.4269,
    claimRadiusMetres: 200,
    prizeAmountCents: 5000, // $50
    clueText: "Where the Mission meets the hill, blankets spread and dogs run free.",
    clueImageUrl: "",
    qrCodeSecret: "test-qr-secret-claimed-drop",
    status: "claimed",
    scheduledAt: nowMinusMins(60 * 24),
    claimedAt: nowMinusMins(60 * 23),
    claimedByUid: "test-user-uid",
    createdAt: Timestamp.now(),
  },
  {
    id: "drop-expired",
    title: "Coit Tower Dash",
    description: "Missed — shows expired UI.",
    city: "San Francisco",
    lat: 37.8024,
    lng: -122.4058,
    claimRadiusMetres: 100,
    prizeAmountCents: 7500,
    clueText: "A finger pointing skyward on the hill where firemen were once honoured.",
    clueImageUrl: "",
    qrCodeSecret: "test-qr-secret-expired-drop",
    status: "expired",
    scheduledAt: nowMinusMins(60 * 48),
    expiredAt: nowMinusMins(60 * 47 - 30),
    createdAt: Timestamp.now(),
  },
];

const TRANSACTIONS = [
  {
    id: "tx-001",
    uid: "test-user-uid",
    type: "drop_claim",
    amountCents: 5000,
    description: "Claimed drop: Dolores Park Discovery in San Francisco",
    dropId: "drop-claimed",
    createdAt: nowMinusMins(60 * 23),
  },
];

// ---------------------------------------------------------------------------
// Auth emulator users (phone sign-in test accounts)
// ---------------------------------------------------------------------------
const AUTH_USERS = [
  { uid: "test-admin-uid",  phoneNumber: "+15550000001" },
  { uid: "test-user-uid",   phoneNumber: "+15550000002" },
  { uid: "test-user-2-uid", phoneNumber: "+15550000003" },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function seed() {
  console.log("🌱 Seeding Firebase emulator...\n");

  // ── Auth users ─────────────────────────────────────────────────────────────
  console.log("  Creating Auth users...");
  for (const u of AUTH_USERS) {
    try {
      await auth.createUser({ uid: u.uid, phoneNumber: u.phoneNumber });
      console.log(`    ✓ ${u.phoneNumber} (${u.uid})`);
    } catch (e: any) {
      if (e.code === "auth/uid-already-exists" || e.code === "auth/phone-number-already-exists") {
        console.log(`    ~ ${u.phoneNumber} already exists, skipping`);
      } else {
        throw e;
      }
    }
  }

  // ── Firestore batch writes ─────────────────────────────────────────────────
  const batch = db.batch();

  console.log("\n  Writing users...");
  for (const user of USERS) {
    batch.set(db.collection("users").doc(user.uid), user);
    console.log(`    ✓ ${user.displayName} (${user.uid})`);
  }

  console.log("\n  Writing drops...");
  for (const drop of DROPS) {
    const { id, ...data } = drop;
    batch.set(db.collection("drops").doc(id), data);
    console.log(`    ✓ [${drop.status}] ${drop.title}`);
  }

  console.log("\n  Writing transactions...");
  for (const tx of TRANSACTIONS) {
    const { id, ...data } = tx;
    batch.set(db.collection("transactions").doc(id), data);
    console.log(`    ✓ ${tx.description}`);
  }

  await batch.commit();

  console.log("\n✅ Seed complete!\n");
  console.log("📋 Test accounts:");
  console.log("  Admin  → +1 555 000 0001 (uid: test-admin-uid)");
  console.log("  User 1 → +1 555 000 0002 (uid: test-user-uid, has $50 balance)");
  console.log("  User 2 → +1 555 000 0003 (uid: test-user-2-uid, fresh account)");
  console.log("\n🎯 Active drop QR secret:  test-qr-secret-active-drop");
  console.log("🌐 Emulator UI:            http://127.0.0.1:4000\n");

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
