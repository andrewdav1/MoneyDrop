import {
  PhoneAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth } from "./firebase";

const FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "";

// sessionInfo returned by the REST sendVerificationCode call.
// Stored here so confirmSmsCode can build a PhoneAuthProvider credential.
let _sessionInfo: string | null = null;

/**
 * Send an SMS verification code via the Firebase Auth REST API.
 * Returns the sessionInfo token (also stored internally for confirmSmsCode).
 *
 * Note: Firebase may require a test phone number (set in the Firebase Console
 * under Authentication → Phone) during development since the REST endpoint
 * does not use a native app verifier. For production, configure Firebase
 * App Check or use test numbers.
 */
export async function sendSmsCode(phoneNumber: string): Promise<string> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message ?? "Failed to send verification code.");
  }

  _sessionInfo = data.sessionInfo as string;
  return _sessionInfo;
}

/**
 * Verify the OTP and sign in.
 * Builds a PhoneAuthProvider credential from the stored sessionInfo + code,
 * then exchanges it via the Firebase JS SDK (no reCAPTCHA required here).
 */
export async function confirmSmsCode(
  _ignored: string,
  code: string
): Promise<void> {
  if (!_sessionInfo) {
    throw new Error("No pending verification. Please request a new code.");
  }
  const credential = PhoneAuthProvider.credential(_sessionInfo, code);
  await signInWithCredential(auth, credential);
  _sessionInfo = null;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}
