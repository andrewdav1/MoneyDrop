/**
 * Runs before any module is loaded (Jest setupFiles).
 * Must point the Admin SDK at the emulators before firebase-admin is imported.
 */

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.FUNCTIONS_EMULATOR = "true";
process.env.GCLOUD_PROJECT = "demo-moneydrop";

// Initialise the Admin SDK here so every test file shares a single app instance.
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({ projectId: "demo-moneydrop" });
}
