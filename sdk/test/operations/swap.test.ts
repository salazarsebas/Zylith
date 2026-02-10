import { describe, it, expect, beforeAll, vi } from "vitest";
import { initPoseidon } from "../../src/crypto/poseidon.js";
import { NoteManager } from "../../src/storage/note-manager.js";
import { swap } from "../../src/operations/swap.js";
import type { AspClient } from "../../src/asp/client.js";

describe("swap operation", () => {
  beforeAll(async () => {
    await initPoseidon();
  });

  it("calls asp.swap, marks input spent, adds output + change notes", async () => {
    const noteManager = new NoteManager("test");
    const inputNote = noteManager.addNote({
      secret: "111",
      nullifier: "222",
      amount: 1000n,
      token: "0xa",
      leafIndex: 0,
    });

    const mockAsp = {
      swap: vi.fn().mockResolvedValue({
        status: "ok",
        tx_hash: "0xswap",
        new_commitment: "0xnew",
        change_commitment: "0xchange",
      }),
    } as unknown as AspClient;

    const result = await swap(
      {
        poolKey: { token0: "0xa", token1: "0xb", fee: 3000, tickSpacing: 60 },
        inputNoteCommitment: inputNote.commitment,
        tokenIn: "0xa",
        tokenOut: "0xb",
        amountIn: 600n,
        amountOutMin: 500n,
        expectedAmountOut: 550n,
        sqrtPriceLimit: 0n,
      },
      mockAsp,
      noteManager,
    );

    expect(result.txHash).toBe("0xswap");

    // Input note should be spent
    expect(noteManager.getAllNotes()[0].spent).toBe(true);

    // Should have output note (550 tokenOut) + change note (400 tokenIn)
    const unspent = noteManager.getUnspentNotes();
    expect(unspent).toHaveLength(2);

    expect(noteManager.getBalance("0xb")).toBe(550n);
    expect(noteManager.getBalance("0xa")).toBe(400n); // 1000 - 600 = 400 change
  });

  it("no change note if exact amount", async () => {
    const noteManager = new NoteManager("test");
    const inputNote = noteManager.addNote({
      secret: "111",
      nullifier: "222",
      amount: 500n,
      token: "0xa",
      leafIndex: 0,
    });

    const mockAsp = {
      swap: vi.fn().mockResolvedValue({
        status: "ok",
        tx_hash: "0xswap",
        new_commitment: "0xnew",
        change_commitment: "0xchange",
      }),
    } as unknown as AspClient;

    await swap(
      {
        poolKey: { token0: "0xa", token1: "0xb", fee: 3000, tickSpacing: 60 },
        inputNoteCommitment: inputNote.commitment,
        tokenIn: "0xa",
        tokenOut: "0xb",
        amountIn: 500n, // exact match
        amountOutMin: 400n,
        expectedAmountOut: 450n,
        sqrtPriceLimit: 0n,
      },
      mockAsp,
      noteManager,
    );

    // Only output note, no change (amount = 500 - 500 = 0)
    const unspent = noteManager.getUnspentNotes();
    expect(unspent).toHaveLength(1);
    expect(noteManager.getBalance("0xa")).toBe(0n);
    expect(noteManager.getBalance("0xb")).toBe(450n);
  });
});
