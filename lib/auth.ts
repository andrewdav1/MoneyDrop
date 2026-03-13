import {
  signInWithPhoneNumber,
  ConfirmationResult,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth } from "./firebase";

// Stored between the phone and verify screens.
// signInWithPhoneNumber returns a ConfirmationResult whose confirm()
// method handles credential creation — no RecaptchaVerifier needed on native.
let _pendingConfirmation: ConfirmationResult | null = null;

/**
 * Send an SMS verification code to the given phone number.
 * On native (iOS/Android) Firebase uses APNs/Play Integrity — no reCAPTCHA.
 * Returns a verificationId for display purposes only (passed as URL param).
 */
export async function sendSmsCode(phoneNumber: string): Promise<string> {
  _pendingConfirmation = await signInWithPhoneNumber(auth, phoneNumber);
  return _pendingConfirmation.verificationId;
}

/**
 * Confirm the OTP code and sign in.
 */
export async function confirmSmsCode(
  _verificationId: string,
  code: string
): Promise<void> {
  if (!_pendingConfirmation) {
    throw new Error("No pending verification. Please request a new code.");
  }
  await _pendingConfirmation.confirm(code);
  _pendingConfirmation = null;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}
