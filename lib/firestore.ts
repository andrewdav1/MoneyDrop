import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  DocumentData,
  QuerySnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import { callClaimDrop } from "./functions";
import { Drop, User, WalletTransaction } from "@/types";

// ---------------------------------------------------------------------------
// Collection references
// ---------------------------------------------------------------------------
export const COLLECTIONS = {
  users: "users",
  drops: "drops",
  transactions: "transactions",
} as const;

// ---------------------------------------------------------------------------
// User helpers
// ---------------------------------------------------------------------------

export async function getUser(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.users, uid));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as unknown as User) : null;
}

/** Subscribe to real-time updates on a user document. */
export function subscribeToUser(
  uid: string,
  callback: (user: User | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, COLLECTIONS.users, uid), (snap) => {
    callback(snap.exists() ? ({ ...snap.data() } as unknown as User) : null);
  });
}

/** Persist (or clear) a device's Expo push token on the user document. */
export async function savePushToken(
  uid: string,
  token: string | null
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.users, uid), {
    expoPushToken: token ?? null,
  });
}

export async function createUser(uid: string, phone: string): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.users, uid), {
    uid,
    phone,
    walletBalance: 0,
    claimedDropIds: [],
    isAdmin: false,
    createdAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Drop helpers
// ---------------------------------------------------------------------------

export async function getActiveDrop(): Promise<Drop | null> {
  const q = query(
    collection(db, COLLECTIONS.drops),
    where("status", "==", "active"),
    orderBy("scheduledAt", "desc"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as unknown as Drop;
}

export function subscribeToActiveDrop(
  callback: (drop: Drop | null) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.drops),
    where("status", "in", ["scheduled", "active"]),
    orderBy("scheduledAt", "asc"),
    limit(1)
  );
  return onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
    if (snap.empty) {
      callback(null);
      return;
    }
    const d = snap.docs[0];
    callback({ id: d.id, ...d.data() } as unknown as Drop);
  });
}

/** Subscribe to all currently active drops ordered by scheduledAt asc. */
export function subscribeToActiveDrops(
  callback: (drops: Drop[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.drops),
    where("status", "==", "active"),
    orderBy("scheduledAt", "asc")
  );
  return onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as Drop)));
  });
}

/** Subscribe to all drops ordered newest-first (admin use). */
export function subscribeToAllDrops(
  callback: (drops: Drop[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.drops),
    orderBy("scheduledAt", "desc")
  );
  return onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as Drop)));
  });
}

// ---------------------------------------------------------------------------
// Claim helpers
// ---------------------------------------------------------------------------

/**
 * Claim a drop by delegating entirely to the `claimDrop` Cloud Function.
 * All validation (QR secret, expiry, duplicate, GPS proximity) runs
 * server-side in a Firestore transaction — clients cannot bypass it.
 *
 * @param dropId  - Firestore drop document ID
 * @param qrCodeSecret - Raw value decoded from the QR code
 * @param coords  - Optional GPS position for proximity validation
 */
export async function claimDrop(
  dropId: string,
  qrCodeSecret: string,
  coords?: { lat: number; lng: number }
): Promise<{ success: boolean; message: string; prizeAmountCents?: number }> {
  return callClaimDrop({ dropId, qrCodeSecret, ...coords });
}

// ---------------------------------------------------------------------------
// Wallet helpers
// ---------------------------------------------------------------------------

export async function getTransactions(uid: string): Promise<WalletTransaction[]> {
  const q = query(
    collection(db, COLLECTIONS.transactions),
    where("uid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as WalletTransaction));
}
