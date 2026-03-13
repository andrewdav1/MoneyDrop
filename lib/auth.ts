import {
  PhoneAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
  RecaptchaVerifier,
} from "firebase/auth";
import { auth } from "./firebase";

/**
 * Send an SMS verification code to the given phone number.
 * Returns a verificationId that must be passed to `confirmSmsCode`.
 *
 * NOTE: `RecaptchaVerifier` requires a DOM element — use the invisible
 * variant on web, or Firebase's react-native-firebase SDK for native
 * builds. This helper is wired for web / Expo Go.
 */
export async function sendSmsCode(
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier
): Promise<string> {
  const provider = new PhoneAuthProvider(auth);
  const verificationId = await provider.verifyPhoneNumber(
    phoneNumber,
    recaptchaVerifier
  );
  return verificationId;
}

/**
 * Exchange verificationId + OTP code for a Firebase credential and sign in.
 */
export async function confirmSmsCode(
  verificationId: string,
  code: string
): Promise<void> {
  const credential = PhoneAuthProvider.credential(verificationId, code);
  await signInWithCredential(auth, credential);
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}
