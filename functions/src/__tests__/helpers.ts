import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { CallableRequest } from "firebase-functions/v2/https";
import { ClaimDropRequest, Drop, UserDoc } from "../types";

export const db = () => admin.firestore();

// ---------------------------------------------------------------------------
// ID generation — unique per-test so tests never share documents
// ---------------------------------------------------------------------------
let _seq = 0;
export function uid(prefix = "id"): string {
  return `${prefix}-${Date.now()}-${++_seq}`;
}

// ---------------------------------------------------------------------------
// Timestamps
// ---------------------------------------------------------------------------
export function minsAgo(n: number): Timestamp {
  return Timestamp.fromMillis(Date.now() - n * 60_000);
}
export function minsFromNow(n: number): Timestamp {
  return Timestamp.fromMillis(Date.now() + n * 60_000);
}

// ---------------------------------------------------------------------------
// Firestore factories
// ---------------------------------------------------------------------------

/** Write an active drop and return its ID + the secret used. */
export async function createDrop(
  overrides: Partial<Omit<Drop, "scheduledAt"> & { scheduledAt: Timestamp }> = {}
): Promise<{ dropId: string; secret: string }> {
  const dropId = uid("drop");
  const secret = uid("secret");

  const doc: Omit<Drop, "id"> = {
    title: "Test Drop",
    city: "San Francisco",
    lat: 37.7749,
    lng: -122.4194,
    claimRadiusMetres: 500,
    prizeAmountCents: 10_000,
    qrCodeSecret: secret,
    status: "active",
    scheduledAt: minsAgo(5), // went live 5 minutes ago
    ...overrides,
  };

  await db().collection("drops").doc(dropId).set(doc);
  return { dropId, secret };
}

/** Write a user document and return its UID. */
export async function createUser(
  overrides: Partial<UserDoc> = {}
): Promise<string> {
  const userUid = uid("user");
  const doc: UserDoc = {
    uid: userUid,
    walletBalance: 0,
    claimedDropIds: [],
    ...overrides,
  };
  await db().collection("users").doc(userUid).set(doc);
  return userUid;
}

// ---------------------------------------------------------------------------
// CallableRequest factory
// ---------------------------------------------------------------------------

type MinimalAuth = { uid: string };

/**
 * Build a CallableRequest<ClaimDropRequest>.
 * Pass `auth: null` to simulate an unauthenticated call.
 */
export function makeRequest(
  data: Partial<ClaimDropRequest>,
  auth: MinimalAuth | null = { uid: uid("caller") }
): CallableRequest<ClaimDropRequest> {
  return {
    data: data as ClaimDropRequest,
    auth: auth
      ? { uid: auth.uid, token: {} as admin.auth.DecodedIdToken }
      : undefined,
    rawRequest: {} as any,
    acceptsStreaming: false,
    app: undefined,
    instanceIdToken: undefined,
  } as CallableRequest<ClaimDropRequest>;
}

// ---------------------------------------------------------------------------
// Assertion helpers
// ---------------------------------------------------------------------------

/** Fetch a drop document. */
export async function getDrop(dropId: string): Promise<Drop & { id: string }> {
  const snap = await db().collection("drops").doc(dropId).get();
  return { id: snap.id, ...(snap.data() as Drop) };
}

/** Fetch a user document. */
export async function getUser(userUid: string): Promise<UserDoc> {
  const snap = await db().collection("users").doc(userUid).get();
  return snap.data() as UserDoc;
}

/** Return all transactions for a user, newest first. */
export async function getUserTransactions(
  userUid: string
): Promise<admin.firestore.DocumentData[]> {
  const snap = await db()
    .collection("transactions")
    .where("uid", "==", userUid)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
