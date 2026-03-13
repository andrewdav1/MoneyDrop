import { useEffect, useState } from "react";
import { Drop } from "@/types";
import { subscribeToActiveDrop } from "@/lib/firestore";

export function useActiveDrop() {
  const [drop, setDrop] = useState<Drop | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToActiveDrop((d) => {
      setDrop(d);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  /** Ms remaining until drop becomes active, or 0 if already active. */
  const msUntilDrop =
    drop?.status === "scheduled"
      ? Math.max(0, drop.scheduledAt.valueOf() - Date.now())
      : 0;

  return { drop, isLoading, msUntilDrop };
}
