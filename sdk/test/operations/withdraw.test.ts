import { describe, it, expect, beforeAll, vi } from "vitest";
import { initPoseidon } from "../../src/crypto/poseidon.js";
import { NoteManager } from "../../src/storage/note-manager.js";
import { withdraw } from "../../src/operations/withdraw.js";
import type { AspClient } from "../../src/asp/client.js";

describe("withdraw operation", () => {
  beforeAll(async () => {
    await initPoseidon();
  });

  it("calls asp.withdraw and marks note as spent", async () => {
    const noteManager = new NoteManager("test");
    const note = noteManager.addNote({
      secret: "111",
      nullifier: "222",
      amount: 1000n,
      token: "999",
      leafIndex: 5,
    });

    const mockAsp = {
      withdraw: vi.fn().mockResolvedValue({
        status: "ok",
        tx_hash: "0xwith",
        nullifier_hash: "0xnull",
      }),
    } as unknown as AspClient;

    const result = await withdraw(
      { noteCommitment: note.commitment },
      mockAsp,
      noteManager,
    );

    expect(mockAsp.withdraw).toHaveBeenCalledOnce();
    expect(result.txHash).toBe("0xwith");
    expect(result.nullifierHash).toBe("0xnull");

    // Note should be marked as spent
    expect(noteManager.getAllNotes()[0].spent).toBe(true);
    expect(noteManager.getBalance("999")).toBe(0n);
  });

  it("throws if note not found", async () => {
    const noteManager = new NoteManager("test");
    const mockAsp = { withdraw: vi.fn() } as unknown as AspClient;

    await expect(
      withdraw({ noteCommitment: "nonexistent" }, mockAsp, noteManager),
    ).rejects.toThrow("Note not found");
  });

  it("throws if note has no leaf index", async () => {
    const noteManager = new NoteManager("test");
    const note = noteManager.addNote({
      secret: "111",
      nullifier: "222",
      amount: 1000n,
      token: "999",
      // No leafIndex
    });

    const mockAsp = { withdraw: vi.fn() } as unknown as AspClient;

    await expect(
      withdraw({ noteCommitment: note.commitment }, mockAsp, noteManager),
    ).rejects.toThrow("no leaf index");
  });
});
