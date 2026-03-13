/**
 * Expo config plugin — injects `use_modular_headers!` into the iOS Podfile.
 *
 * Required for @react-native-firebase: FirebaseAuth and related pods depend on
 * modules (FirebaseAuthInterop, GoogleUtilities, RecaptchaInterop, etc.) that
 * are only exported when modular headers are enabled. Using `use_frameworks!`
 * globally breaks React Native's own pods, so we use the lighter-weight
 * `use_modular_headers!` instead.
 */
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );

      let contents = fs.readFileSync(podfilePath, "utf8");

      if (!contents.includes("use_modular_headers!")) {
        // Insert after the `platform :ios` line
        contents = contents.replace(
          /^(platform :ios,.+)$/m,
          "$1\nuse_modular_headers!"
        );
        fs.writeFileSync(podfilePath, contents);
      }

      return config;
    },
  ]);
};
