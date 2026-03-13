/**
 * Expo config plugin — injects `$RNFirebaseAsStaticFramework = true` into the
 * iOS Podfile.
 *
 * When `use_frameworks! :linkage => :static` is active (via expo-build-properties),
 * React Native Firebase pods must be told not to re-link Firebase as a static
 * framework a second time. Setting this flag before the first `target` block is
 * the approach recommended by the rnfirebase.io docs.
 *
 * Without it the build fails with:
 *   'FirebaseAuth/FirebaseAuth-Swift.h' file not found
 */
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withRNFirebaseStaticFramework(config) {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );

      let contents = fs.readFileSync(podfilePath, "utf8");

      if (!contents.includes("$RNFirebaseAsStaticFramework")) {
        // Insert before the first `target '...' do` line
        contents = contents.replace(
          /^(target ['"].+['"] do)/m,
          "$RNFirebaseAsStaticFramework = true\n\n$1"
        );
        fs.writeFileSync(podfilePath, contents);
      }

      return config;
    },
  ]);
};
