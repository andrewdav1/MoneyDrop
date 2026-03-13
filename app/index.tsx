import { Redirect } from "expo-router";

// The root layout handles auth-based redirects.
// This file just provides a default target.
export default function Index() {
  return <Redirect href="/(tabs)/home" />;
}
