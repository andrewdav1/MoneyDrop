/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  // Sets emulator env vars + initialises the Admin SDK before any module loads
  setupFiles: ["<rootDir>/src/__tests__/setEnv.ts"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  // Enough for Firestore round-trips via the emulator
  testTimeout: 15_000,
  transformIgnorePatterns: ["/node_modules/"],
  coveragePathIgnorePatterns: ["/node_modules/", "/lib/", "/__tests__/"],
};
