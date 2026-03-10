import { describe, it, expect, beforeAll, vi } from "vitest";
import { initPoseidon } from "../../src/crypto/poseidon.js";
import { NoteManager } from "../../src/storage/note-manager.js";
import { deposit } from "../../src/operations/deposit.js";
import type { AspClient } from "../../src/asp/client.js";

describe("deposit operation", () => {
  beforeAll(async () => {
    await initPoseidon();
  });

  it("calls asp.deposit with hex commitment and stores note", async () => {
    const noteManager = new NoteManager("test");

    const mockAsp = {
      deposit: vi.fn().mockResolvedValue({
        status: "ok",
        leaf_index: 3,
        calldata: ["0x1", "0x2"],
        root: "0xroot",
      }),
    } as unknown as AspClient;

    const result = await deposit(
      {
        secret: "111",
        nullifier: "222",
        amount: 1000n,
        token: "999",
      },
      mockAsp,
      noteManager,
    );

    // Verify ASP was called
    expect(mockAsp.deposit).toHaveBeenCalledOnce();
    const callArg = (mockAsp.deposit as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArg.commitment).toMatch(/^0x/);

    // Verify result
    expect(result.leafIndex).toBe(3);
    expect(result.commitment).toBeTruthy();
    expect(result.root).toBe("0xroot");
    expect(result.calldata).toEqual(["0x1", "0x2"]);

    // Verify note was stored
    const notes = noteManager.getAllNotes();
    expect(notes).toHaveLength(1);
    expect(notes[0].secret).toBe("111");
    expect(notes[0].nullifier).toBe("222");
    expect(notes[0].amount).toBe("1000");
    expect(notes[0].leafIndex).toBe(3);
    expect(notes[0].spent).toBe(false);
  });
});
