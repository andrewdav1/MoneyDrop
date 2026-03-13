import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// ---------------------------------------------------------------------------
// Firebase config
// ---------------------------------------------------------------------------
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "demo-key",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "demo-moneydrop.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-moneydrop",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "demo-moneydrop.appspot.com",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "000000000000",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "1:000000000000:web:demo",
};

// Guard against hot-reload double-init
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// ---------------------------------------------------------------------------
// Emulator connections
//
// Set EXPO_PUBLIC_USE_EMULATOR=true in .env.emulator (or .env.local).
// Set EXPO_PUBLIC_EMULATOR_HOST to your machine's LAN IP when testing on a
// physical device (e.g. 192.168.1.10). Defaults to 127.0.0.1 for simulators.
//
// connectXxxEmulator throws if called a second time (hot-reload), so we
// track whether we've already wired up this SDK instance.
// ---------------------------------------------------------------------------
declare global {
  // eslint-disable-next-line no-var
  var __emulatorsConnected: boolean | undefined;
}

const USE_EMULATOR = process.env.EXPO_PUBLIC_USE_EMULATOR === "true";

if (USE_EMULATOR && !global.__emulatorsConnected) {
  const host = process.env.EXPO_PUBLIC_EMULATOR_HOST ?? "127.0.0.1";

  console.info(`[Firebase] Connecting to emulators on ${host}`);

  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: false });
  connectFirestoreEmulator(db, host, 8080);
  connectFunctionsEmulator(functions, host, 5001);
  connectStorageEmulator(storage, host, 9199);

  global.__emulatorsConnected = true;
}

export default app;
