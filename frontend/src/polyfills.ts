// Node.js polyfills required by SDK dependencies (circomlibjs, snarkjs, starknet.js)
// Must be imported before any SDK code.
import { Buffer } from "buffer";
import process from "process";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Buffer = Buffer;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).process = process;
