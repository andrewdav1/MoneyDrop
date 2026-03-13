/**
 * Integration tests for claimDropHandler.
 *
 * Requires the Firebase emulators to be running:
 *   npm run emulator          (from the project root)
 *
 * Each test creates its own uniquely-IDed Firestore documents so tests
 * are fully isolated and can run in parallel without teardown.
 */

import { HttpsError } from "firebase-functions/v2/https";
import { claimDropHandler } from "../claimDrop";
import {
  createDrop,
  createUser,
  makeRequest,
  getDrop,
  getUser,
  getUserTransactions,
  minsAgo,
  minsFromNow,
  uid,
} from "./helpers";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Assert a callable throws an HttpsError with the expected code. */
async function expectHttpsError(
  promise: Promise<unknown>,
  code: HttpsError["code"]
): Promise<HttpsError> {
  try {
    await promise;
    throw new Error(`Expected HttpsError("${code}") but resolved successfully`);
  } catch (err: unknown) {
    if (!(err instanceof HttpsError)) {
      throw new Error(
        `Expected HttpsError("${code}") but got: ${String(err)}`
      );
    }
    expect(err.code).toBe(code);
    return err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Happy paths
// ─────────────────────────────────────────────────────────────────────────────

describe("claimDropHandler — happy paths", () => {
  test("claims an active drop: returns success response", async () => {
    const userUid = await createUser();
    const { dropId, secret } = await createDrop();

    const result = await claimDropHandler(
      makeRequest({ dropId, qrCodeSecret: secret }, { uid: userUid })
    );

    expect(result.success).toBe(true);
    expect(result.message).toMatch(/congratulations/i);
    expect(result.prizeAmountCents).toBe(10_000);
  });

  test("updates drop status to 'claimed' and records claimedByUid", async () => {
    const userUid = await createUser();
    const { dropId, secret } = await createDrop();

    await claimDropHandler(
      makeRequest({ dropId, qrCodeSecret: secret }, { uid: userUid })
    );

    const drop = await getDrop(dropId);
    expect(drop.status).toBe("claimed");
    expect(drop.claimedByUid).toBe(userUid);
    expect(drop.claimedAt).toBeDefined();
  });

  test("increments user walletBalance by prizeAmountCents", async () => {
    const userUid = await createUser({ walletBalance: 500 });
    const { dropId, secret } = await createDrop({ prizeAmountCents: 2_500 });

    await claimDropHandler(
      makeRequest({ dropId, qrCodeSecret: secret }, { uid: userUid })
    );

    const user = await getUser(userUid);
    expect(user.walletBalance).toBe(3_000); // 500 existing + 2500 prize
  });

  test("appends dropId to user claimedDropIds", async () => {
    const existingDropId = uid("existing-drop");
    const userUid = await createUser({ claimedDropIds: [existingDropId] });
    const { dropId, secret } = await createDrop();

    await claimDropHandler(
      makeRequest({ dropId, qrCodeSecret: secret }, { uid: userUid })
    );

    const user = await getUser(userUid);
    expect(user.claimedDropIds).toContain(existingDropId); // previous entry preserved
    expect(user.claimedDropIds).toContain(dropId);          // new entry added
  });

  test("writes a transaction record with correct fields", async () => {
    const userUid = await createUser();
    const { dropId, secret } = await createDrop({ prizeAmountCents: 5_000 });

    await claimDropHandler(
      makeRequest({ dropId, qrCodeSecret: secret }, { uid: userUid })
    );

    const txs = await getUserTransactions(userUid);
    expect(txs).toHaveLength(1);
    const tx = txs[0];
    expect(tx.uid).toBe(userUid);
    expect(tx.type).toBe("drop_claim");
    expect(tx.amountCents).toBe(5_000);
    expect(tx.dropId).toBe(dropId);
    expect(tx.createdAt).toBeDefined();
  });

  test("succeeds with GPS coordinates within claimRadiusMetres", async () => {
    const userUid = await createUser();
    const { dropId, secret } = await createDrop({
      lat: 37.7749,
      lng: -122.4194,
      claimRadiusMetres: 500,
    });

    // User is ~0 m away (same coords)
    const result = await claimDropHandler(
      makeRequest(
        { dropId, qrCodeSecret: secret, lat: 37.7749, lng: -122.4194 },
        { uid: userUid }
      )
    );

    expect(result.success).toBe(true);
  });

  test("succeeds when GPS is omitted (proximity check skipped)", async () => {
    const userUid = await createUser();
    const { dropId, secret } = await createDrop({
      lat: 37.7749,
      lng: -122.4194,
      claimRadiusMetres: 10, // very tight radius — irrelevant without GPS
    });

    const result = await claimDropHandler(
      makeRequest({ dropId, qrCodeSecret: secret }, { uid: userUid })
    );

    expect(result.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Auth & input validation
// ─────────────────────────────────────────────────────────────────────────────

describe("claimDropHandler — auth & input validation", () => {
  test("throws 'unauthenticated' when request.auth is absent", async () => {
    const err = await expectHttpsError(
      claimDropHandler(makeRequest({ dropId: "x", qrCodeSecret: "y" }, null)),
      "unauthenticated"
    );
    expect(err.message).toMatch(/signed in/i);
  });

  test("throws 'invalid-argument' when dropId is missing", async () => {
    const userUid = await createUser();
    await expectHttpsError(
      claimDropHandler(
        makeRequest({ dropId: "", qrCodeSecret: "secret" }, { uid: userUid })
      ),
      "invalid-argument"
    );
  });

  test("throws 'invalid-argument' when qrCodeSecret is missing", async () => {
    const userUid = await createUser();
    await expectHttpsError(
      claimDropHandler(
        makeRequest({ dropId: "some-id", qrCodeSecret: "" }, { uid: userUid })
      ),
      "invalid-argument"
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Drop-state checks
// ─────────────────────────────────────────────────────────────────────────────

describe("claimDropHandler — drop state", () => {
  test("throws 'not-found' when the drop document does not exist", async () => {
    const userUid = await createUser();
    const err = await expectHttpsError(
      claimDropHandler(
        makeRequest({ dropId: uid("nonexistent"), qrCodeSecret: "x" }, { uid: userUid })
      ),
      "not-found"
    );
    expect(err.message).toMatch(/drop not found/i);
  });

  test("throws 'failed-precondition' when drop status is 'scheduled'", async () => {
    const userUid = await createUser();
    const { dropId, secret } = await createDrop({
      status: "scheduled",
      scheduledAt: minsFromNow(60),
    });
    const err = await expectHttpsError(
      claimDropHandler(makeRequest({ dropId, qrCodeSecret: secret }, { uid: userUid })),
      "failed-precondition"
    );
    expect(err.message).toMatch(/not yet active/i);
  });

  test("throws 'failed-precondition' when drop status is 'claimed'", async () => {
    const userUid = await createUser();
    const { dropId, secret } = await createDrop({ status: "claimed" });
    const err = await expectHttpsError(
      claimDropHandler(makeRequest({ dropId, qrCodeSecret: secret }, { uid: userUid })),
      "failed-precondition"
    );
    expect(err.message).toMatch(/already been claimed/i);
  });

  test("throws 'failed-precondition' when drop status is 'expired'", async () => {
    const userUid = await createUser();
    const { dropId, secret } = await createDrop({ status: "expired" });
    const err = await expectHttpsError(
      claimDropHandler(makeRequest({ dropId, qrCodeSecret: secret }, { uid: userUid })),
      "failed-precondition"
    );
    expect(err.message).toMatch(/expired/i);
  });

  test("throws 'deadline-exceeded' and marks drop expired when claim window has passed", async () => {
    const userUid = await createUser();
    // scheduledAt = 35 minutes ago → 30-min window has closed
    const { dropId, secret } = await createDrop({
      status: "active",
      scheduledAt: minsAgo(35),
    });

    const err = await expectHttpsError(
      claimDropHandler(makeRequest({ dropId, qrCodeSecret: secret }, { uid: userUid })),
      "deadline-exceeded"
    );
    expect(err.message).toMatch(/claim window/i);

    // The handler should have written status: "expired" in the transaction
    const drop = await getDrop(dropId);
    expect(drop.status).toBe("expired");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// QR secret validation
// ─────────────────────────────────────────────────────────────────────────────

describe("claimDropHandler — QR secret", () => {
  test("throws 'permission-denied' for a wrong QR secret", async () => {
    const userUid = await createUser();
    const { dropId } = await createDrop();
    const err = await expectHttpsError(
      claimDropHandler(
        makeRequest({ dropId, qrCodeSecret: "wrong-secret" }, { uid: userUid })
      ),
      "permission-denied"
    );
    expect(err.message).toMatch(/invalid qr code/i);
  });

  test("throws 'permission-denied' for a secret that differs only in case", async () => {
    const userUid = await createUser();
    const { dropId, secret } = await createDrop();
    await expectHttpsError(
      claimDropHandler(
        makeRequest({ dropId, qrCodeSecret: secret.toUpperCase() }, { uid: userUid })
      ),
      "permission-denied"
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// User state checks
// ─────────────────────────────────────────────────────────────────────────────

describe("claimDropHandler — user state", () => {
  test("throws 'not-found' when the user document does not exist", async () => {
    const { dropId, secret } = await createDrop();
    // Use a UID that has no Firestore document
    const err = await expectHttpsError(
      claimDropHandler(
        makeRequest({ dropId, qrCodeSecret: secret }, { uid: uid("ghost") })
      ),
      "not-found"
    );
    expect(err.message).toMatch(/user account not found/i);
  });

  test("throws 'already-exists' when user has already claimed this drop", async () => {
    const { dropId, secret } = await createDrop();
    const userUid = await createUser({ claimedDropIds: [dropId] });

    const err = await expectHttpsError(
      claimDropHandler(makeRequest({ dropId, qrCodeSecret: secret }, { uid: userUid })),
      "already-exists"
    );
    expect(err.message).toMatch(/already claimed/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GPS proximity check
// ─────────────────────────────────────────────────────────────────────────────

describe("claimDropHandler — GPS proximity", () => {
  const DROP_LAT = 37.7749;
  const DROP_LNG = -122.4194;
  const RADIUS_M = 100;

  test("throws 'out-of-range' when user is beyond claimRadiusMetres", async () => {
    const userUid = await createUser();
    const { dropId, secret } = await createDrop({
      lat: DROP_LAT,
      lng: DROP_LNG,
      claimRadiusMetres: RADIUS_M,
    });

    // Union Square is ~1.1 km from City Hall — well outside 100 m
    const err = await expectHttpsError(
      claimDropHandler(
        makeRequest(
          { dropId, qrCodeSecret: secret, lat: 37.7879, lng: -122.4075 },
          { uid: userUid }
        )
      ),
      "out-of-range"
    );
    expect(err.message).toMatch(/away/i);
    expect(err.message).toMatch(/100m/i);
  });

  test("includes computed distance in the error message", async () => {
    const userUid = await createUser();
    const { dropId, secret } = await createDrop({
      lat: DROP_LAT,
      lng: DROP_LNG,
      claimRadiusMetres: RADIUS_M,
    });

    const err = await expectHttpsError(
      claimDropHandler(
        makeRequest(
          // ~500 m north of the drop
          { dropId, qrCodeSecret: secret, lat: DROP_LAT + 0.005, lng: DROP_LNG },
          { uid: userUid }
        )
      ),
      "out-of-range"
    );
    // Message should contain the computed metres, e.g. "You are 556m away."
    expect(err.message).toMatch(/\d+m away/i);
  });

  test("does not check proximity when lat/lng are not provided", async () => {
    const userUid = await createUser();
    // Tiny radius — would definitely fail a GPS check
    const { dropId, secret } = await createDrop({
      lat: DROP_LAT,
      lng: DROP_LNG,
      claimRadiusMetres: 1,
    });

    // No GPS in the request → proximity gate is skipped entirely
    const result = await claimDropHandler(
      makeRequest({ dropId, qrCodeSecret: secret }, { uid: userUid })
    );
    expect(result.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Atomicity / consistency
// ─────────────────────────────────────────────────────────────────────────────

describe("claimDropHandler — atomicity", () => {
  test("leaves drop, user, and transactions unchanged when claim is rejected", async () => {
    const userUid = await createUser({ walletBalance: 100 });
    const { dropId } = await createDrop();

    await expectHttpsError(
      claimDropHandler(
        makeRequest({ dropId, qrCodeSecret: "wrong" }, { uid: userUid })
      ),
      "permission-denied"
    );

    const [drop, user, txs] = await Promise.all([
      getDrop(dropId),
      getUser(userUid),
      getUserTransactions(userUid),
    ]);

    expect(drop.status).toBe("active");         // unchanged
    expect(user.walletBalance).toBe(100);        // unchanged
    expect(user.claimedDropIds).toHaveLength(0); // unchanged
    expect(txs).toHaveLength(0);                 // no transaction created
  });

  test("two concurrent claims: only one succeeds", async () => {
    const uid1 = await createUser();
    const uid2 = await createUser();
    const { dropId, secret } = await createDrop();

    const [r1, r2] = await Promise.allSettled([
      claimDropHandler(makeRequest({ dropId, qrCodeSecret: secret }, { uid: uid1 })),
      claimDropHandler(makeRequest({ dropId, qrCodeSecret: secret }, { uid: uid2 })),
    ]);

    const succeeded = [r1, r2].filter((r) => r.status === "fulfilled");
    const failed    = [r1, r2].filter((r) => r.status === "rejected");

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);

    // The failed one must be an HttpsError (failed-precondition or already-exists)
    const rejection = failed[0] as PromiseRejectedResult;
    expect(rejection.reason).toBeInstanceOf(HttpsError);

    // The drop ends in state "claimed" exactly once
    const drop = await getDrop(dropId);
    expect(drop.status).toBe("claimed");
  });
});
