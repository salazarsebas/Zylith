import { useEffect } from "react";
import { useStarknetWallet } from "@/providers/StarknetProvider";
import { useSdkStore } from "@/stores/sdkStore";
import { CreatePasswordModal } from "@/components/features/shared/CreatePasswordModal";
import { UnlockModal } from "@/components/features/shared/UnlockModal";

/**
 * Manages SDK initialization lifecycle.
 * Shows password modal when wallet is connected but SDK is not initialized.
 */
export function SdkInitializer() {
  const { isConnected: isAuthenticated } = useStarknetWallet();
  const {
    isInitialized,
    isInitializing,
    initError,
    hasExistingNotes,
    checkExistingNotes,
    autoInitialize,
    initialize,
  } = useSdkStore();

  useEffect(() => {
    if (isAuthenticated && !isInitialized && !isInitializing) {
      // Try to auto-initialize with saved password
      autoInitialize().then((success) => {
        if (!success) {
          // No saved password, check if notes exist to show appropriate modal
          checkExistingNotes();
        }
      });
    }
  }, [isAuthenticated, isInitialized, isInitializing, autoInitialize, checkExistingNotes]);

  // Don't show modals if not connected or already initialized
  if (!isAuthenticated || isInitialized) return null;

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
