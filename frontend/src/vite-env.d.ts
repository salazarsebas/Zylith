/// <reference types="vite/client" />

declare module "process";

interface ImportMetaEnv {
  readonly VITE_STARKNET_RPC_URL: string;
  readonly VITE_ASP_URL: string;
  readonly VITE_CHAIN_ID: string;
  readonly VITE_CAVOS_APP_ID: string;
  readonly VITE_STARKNET_NETWORK: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
