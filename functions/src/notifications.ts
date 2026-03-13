import * as admin from "firebase-admin";
import Expo, { ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";

const expo = new Expo();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationScreen = "home" | "drop" | "wallet";

export interface PushPayload {
  title: string;
  body: string;
  /** Which tab to open when the user taps the notification */
  screen: NotificationScreen;
  /** Additional arbitrary data passed through to the client */
  data?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

/**
 * Fetch all valid Expo push tokens from the users collection.
 * Returns a map of uid → token so we can remove stale tokens later.
 */
export async function getAllTokens(): Promise<Map<string, string>> {
  const snap = await admin
    .firestore()
    .collection("users")
    .where("expoPushToken", "!=", null)
    .select("expoPushToken")
    .get();

  const map = new Map<string, string>();
  snap.docs.forEach((doc) => {
    const token = doc.data().expoPushToken as string | undefined;
    if (token && Expo.isExpoPushToken(token)) {
      map.set(doc.id, token);
    }
  });
  return map;
}

/**
 * Fetch the push token for a single user. Returns null if not registered.
 */
export async function getTokenForUser(uid: string): Promise<string | null> {
  const snap = await admin.firestore().collection("users").doc(uid).get();
  const token = snap.data()?.expoPushToken as string | undefined;
  return token && Expo.isExpoPushToken(token) ? token : null;
}

/**
 * Remove an invalid token from the user document (called after a
 * DeviceNotRegistered error so we don't keep sending to dead tokens).
 */
async function pruneToken(uid: string): Promise<void> {
  await admin
    .firestore()
    .collection("users")
    .doc(uid)
    .update({ expoPushToken: admin.firestore.FieldValue.delete() });
  console.log(`Pruned stale push token for uid ${uid}`);
}

// ---------------------------------------------------------------------------
// Send helpers
// ---------------------------------------------------------------------------

/**
 * Send a notification to a single token.
 * Returns false and prunes the token if the device is no longer registered.
 */
export async function sendToToken(
  uid: string,
  token: string,
  payload: PushPayload
): Promise<boolean> {
  if (!Expo.isExpoPushToken(token)) {
    console.warn(`Invalid Expo push token for uid ${uid}: ${token}`);
    return false;
  }

  const message: ExpoPushMessage = {
    to: token,
    sound: "default",
    title: payload.title,
    body: payload.body,
    data: { screen: payload.screen, ...payload.data },
    // Android-specific
    channelId: "drops",
    priority: "high",
  };

  const [ticket] = await expo.sendPushNotificationsAsync([message]);
  return handleTicket(uid, ticket);
}

/**
 * Broadcast a notification to every registered user, optionally excluding
 * specific UIDs (e.g. the winner who gets a separate personal notification).
 *
 * Returns the number of successfully queued messages.
 */
export async function broadcast(
  payload: PushPayload,
  options: { excludeUids?: string[] } = {}
): Promise<number> {
  const tokenMap = await getAllTokens();
  const { excludeUids = [] } = options;

  const recipients: Array<{ uid: string; token: string }> = [];
  tokenMap.forEach((token, uid) => {
    if (!excludeUids.includes(uid)) {
      recipients.push({ uid, token });
    }
  });

  if (recipients.length === 0) return 0;

  const messages: ExpoPushMessage[] = recipients.map(({ token }) => ({
    to: token,
    sound: "default",
    title: payload.title,
    body: payload.body,
    data: { screen: payload.screen, ...payload.data },
    channelId: "drops",
    priority: "high",
  }));

  // Expo recommends sending in chunks of ≤100
  const chunks = expo.chunkPushNotifications(messages);
  const allTickets: ExpoPushTicket[] = [];

  for (const chunk of chunks) {
    const tickets = await expo.sendPushNotificationsAsync(chunk);
    allTickets.push(...tickets);
  }

  // Process tickets — prune stale tokens in parallel
  const pruneJobs: Promise<void>[] = [];
  allTickets.forEach((ticket, i) => {
    const { uid } = recipients[i];
    if (ticket.status === "error") {
      console.error(`Push error for uid ${uid}:`, ticket.details?.error, ticket.message);
      if (ticket.details?.error === "DeviceNotRegistered") {
        pruneJobs.push(pruneToken(uid));
      }
    }
  });
  await Promise.allSettled(pruneJobs);

  const sent = allTickets.filter((t) => t.status === "ok").length;
  console.log(`Broadcast sent to ${sent}/${recipients.length} devices`);
  return sent;
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function handleTicket(uid: string, ticket: ExpoPushTicket): boolean {
  if (ticket.status === "ok") return true;

  console.error(`Push error for uid ${uid}:`, ticket.details?.error, ticket.message);
  if (ticket.details?.error === "DeviceNotRegistered") {
    // Fire-and-forget — don't block the caller
    pruneToken(uid).catch(console.error);
  }
  return false;
}
