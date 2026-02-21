import { type ReactNode } from "react";
import { useStarknetWallet } from "@/providers/StarknetProvider";
import { Navigate } from "react-router";

/**
 * Redirects to landing page if wallet is not connected.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { isConnected } = useStarknetWallet();

  if (!isConnected) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
