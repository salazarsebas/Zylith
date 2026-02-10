import { useEffect } from "react";
import { useAccount } from "@starknet-react/core";
import { useSdkStore } from "@/stores/sdkStore";
import { CreatePasswordModal } from "@/components/features/shared/CreatePasswordModal";
import { UnlockModal } from "@/components/features/shared/UnlockModal";

/**
 * Manages SDK initialization lifecycle.
 * Shows password modal when wallet is connected but SDK is not initialized.
 */
export function SdkInitializer() {
  const { isConnected } = useAccount();
  const {
    isInitialized,
    isInitializing,
    initError,
    hasExistingNotes,
    checkExistingNotes,
    initialize,
  } = useSdkStore();

  useEffect(() => {
    if (isConnected && !isInitialized) {
      checkExistingNotes();
    }
  }, [isConnected, isInitialized, checkExistingNotes]);

  // Don't show modals if not connected or already initialized
  if (!isConnected || isInitialized) return null;

  if (hasExistingNotes) {
    return (
      <UnlockModal
        open
        onSubmit={initialize}
        loading={isInitializing}
        error={initError ? "Incorrect password" : null}
      />
    );
  }

  return (
    <CreatePasswordModal
      open
      onSubmit={initialize}
      loading={isInitializing}
      error={initError}
    />
  );
}
