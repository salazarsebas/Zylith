import { useSdkStore } from "@/stores/sdkStore";

/**
 * Returns the initialized ZylithClient or throws if not initialized.
 * Use this in components that require SDK access.
 */
export function useZylithClient() {
  const client = useSdkStore((s) => s.client);
  const isInitialized = useSdkStore((s) => s.isInitialized);
  return { client, isInitialized };
}
