import rnAuth, {
  FirebaseAuthTypes,
} from "@react-native-firebase/auth";
import { signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "./firebase";

// ConfirmationResult from @react-native-firebase/auth — stored between screens.
// Uses APNs (iOS) / Play Integrity (Android) to verify the device; no
// RecaptchaVerifier or WebView required.
let _pendingConfirmation: FirebaseAuthTypes.ConfirmationResult | null = null;

/**
 * Send an SMS verification code to the given phone number.
 * Uses @react-native-firebase/auth which handles native verification
 * (APNs silent push on iOS, SafetyNet on Android) automatically.
 */
export async function sendSmsCode(phoneNumber: string): Promise<string> {
  _pendingConfirmation = await rnAuth().signInWithPhoneNumber(phoneNumber);
  return _pendingConfirmation.verificationId ?? "";
}

/**
 * Confirm the OTP code and sign in via @react-native-firebase/auth.
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
