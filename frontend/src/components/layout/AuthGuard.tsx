import { type ReactNode } from "react";
import { useAccount } from "@starknet-react/core";
import { Navigate } from "react-router";

/**
 * Redirects to landing page if wallet is not connected.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
