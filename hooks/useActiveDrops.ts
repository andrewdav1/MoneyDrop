import { useEffect, useState } from "react";
import { Drop } from "@/types";
import { subscribeToActiveDrops } from "@/lib/firestore";

export function useActiveDrops() {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToActiveDrops((d) => {
      setDrops(d);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  return { drops, isLoading };
}
