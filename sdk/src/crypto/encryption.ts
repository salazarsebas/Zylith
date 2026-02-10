/**
 * Note encryption using AES-256-GCM with PBKDF2-derived keys.
 * Uses Web Crypto API (Node.js 18+ / modern browsers).
 */

const PBKDF2_ITERATIONS = 100_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;

export interface EncryptedData {
  ciphertext: string; // base64
  iv: string; // base64
  salt: string; // base64
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Encrypt a string with a password. Returns base64-encoded ciphertext + metadata. */
export async function encrypt(
  data: string,
  password: string,
): Promise<EncryptedData> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(password, salt);

  const encoder = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(data),
  );

  return {
    ciphertext: uint8ToBase64(new Uint8Array(encrypted)),
    iv: uint8ToBase64(iv),
    salt: uint8ToBase64(salt),
  };
}

/** Decrypt encrypted data with a password. Returns the original string. */
export async function decrypt(
  encrypted: EncryptedData,
  password: string,
): Promise<string> {
  const salt = base64ToUint8(encrypted.salt);
  const iv = base64ToUint8(encrypted.iv);
  const ciphertext = base64ToUint8(encrypted.ciphertext);
  const key = await deriveKey(password, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as unknown as Uint8Array<ArrayBuffer> },
    key,
    ciphertext as unknown as ArrayBuffer,
  );

  return new TextDecoder().decode(decrypted);
}

function uint8ToBase64(bytes: Uint8Array): string {
  // Use Buffer in Node.js for reliability
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  return btoa(String.fromCharCode(...bytes));
}

function base64ToUint8(base64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
