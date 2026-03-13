import { useEffect, useState } from "react";
import { WalletTransaction } from "@/types";
import { getTransactions } from "@/lib/firestore";
import { useAuthStore } from "@/store/authStore";

export function useWallet() {
  const appUser = useAuthStore((s) => s.appUser);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!appUser?.uid) return;
    setIsLoading(true);
    getTransactions(appUser.uid)
      .then(setTransactions)
      .finally(() => setIsLoading(false));
  }, [appUser?.uid]);

  return {
    balanceCents: appUser?.walletBalance ?? 0,
    transactions,
    isLoading,
  };
}
