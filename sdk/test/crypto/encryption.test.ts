import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "../../src/crypto/encryption.js";

describe("encryption", () => {
  const password = "test-password-123";

  it("encrypts and decrypts a string", async () => {
    const original = "Hello, Zylith!";
    const encrypted = await encrypt(original, password);
    const decrypted = await decrypt(encrypted, password);
    expect(decrypted).toBe(original);
  });

  it("encrypts and decrypts JSON", async () => {
    const data = { notes: [{ amount: "100", token: "0x123" }] };
    const json = JSON.stringify(data);
    const encrypted = await encrypt(json, password);
    const decrypted = await decrypt(encrypted, password);
    expect(JSON.parse(decrypted)).toEqual(data);
  });

  it("encrypted data has ciphertext, iv, salt", async () => {
    const encrypted = await encrypt("test", password);
    expect(encrypted).toHaveProperty("ciphertext");
    expect(encrypted).toHaveProperty("iv");
    expect(encrypted).toHaveProperty("salt");
    expect(typeof encrypted.ciphertext).toBe("string");
    expect(typeof encrypted.iv).toBe("string");
    expect(typeof encrypted.salt).toBe("string");
  });

  it("same plaintext produces different ciphertext (random IV/salt)", async () => {
    const a = await encrypt("same", password);
    const b = await encrypt("same", password);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it("wrong password fails to decrypt", async () => {
    const encrypted = await encrypt("secret", password);
    await expect(decrypt(encrypted, "wrong-password")).rejects.toThrow();
  });

  it("handles empty string", async () => {
    const encrypted = await encrypt("", password);
    const decrypted = await decrypt(encrypted, password);
    expect(decrypted).toBe("");
  });

  it("handles large data", async () => {
    const large = "x".repeat(100_000);
    const encrypted = await encrypt(large, password);
    const decrypted = await decrypt(encrypted, password);
    expect(decrypted).toBe(large);
  });
});
