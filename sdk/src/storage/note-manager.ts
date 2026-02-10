/**
 * Encrypted note management.
 * Stores notes (secrets, nullifiers, commitments) with AES-GCM encryption.
 * Supports localStorage (browser) and in-memory (Node.js) persistence.
 */
import { encrypt, decrypt } from "../crypto/encryption.js";
import { computeCommitment, computePositionCommitment } from "../crypto/commitment.js";
import { u256Split } from "../utils/conversions.js";
import type { Note, PositionNote, NoteDatabase } from "./types.js";

const STORAGE_KEY = "zylith_notes";

export class NoteManager {
  private password: string;
  private db: NoteDatabase;

  constructor(password: string) {
    this.password = password;
    this.db = { notes: [], positions: [], version: 1 };
  }

  /** Create and store a new note. Computes commitment automatically. */
  addNote(params: {
    secret: string;
    nullifier: string;
    amount: bigint;
    token: string;
    leafIndex?: number;
  }): Note {
    const { low, high } = u256Split(params.amount);
    const { commitment, nullifierHash } = computeCommitment(
      params.secret,
      params.nullifier,
      low.toString(),
      high.toString(),
      params.token,
    );

    const note: Note = {
      secret: params.secret,
      nullifier: params.nullifier,
      amount: params.amount.toString(),
      token: params.token,
      leafIndex: params.leafIndex,
      commitment,
      nullifierHash,
      spent: false,
    };

    this.db.notes.push(note);
    return note;
  }

  /** Create and store a new position note. */
  addPositionNote(params: {
    secret: string;
    nullifier: string;
    tickLower: number;
    tickUpper: number;
    liquidity: bigint;
    leafIndex?: number;
  }): PositionNote {
    const { commitment, nullifierHash } = computePositionCommitment(
      params.secret,
      params.nullifier,
      params.tickLower,
      params.tickUpper,
      params.liquidity.toString(),
    );

    const position: PositionNote = {
      secret: params.secret,
      nullifier: params.nullifier,
      tickLower: params.tickLower,
      tickUpper: params.tickUpper,
      liquidity: params.liquidity.toString(),
      leafIndex: params.leafIndex,
      commitment,
      nullifierHash,
      spent: false,
    };

    this.db.positions.push(position);
    return position;
  }

  /** Update a note's leaf index after on-chain deposit */
  setLeafIndex(commitment: string, leafIndex: number): void {
    const note = this.db.notes.find((n) => n.commitment === commitment);
    if (note) note.leafIndex = leafIndex;
    const pos = this.db.positions.find((p) => p.commitment === commitment);
    if (pos) pos.leafIndex = leafIndex;
  }

  /** Mark a note as spent by its nullifier hash */
  markSpent(nullifierHash: string): void {
    const note = this.db.notes.find((n) => n.nullifierHash === nullifierHash);
    if (note) note.spent = true;
    const pos = this.db.positions.find(
      (p) => p.nullifierHash === nullifierHash,
    );
    if (pos) pos.spent = true;
  }

  /** Get all unspent notes, optionally filtered by token */
  getUnspentNotes(token?: string): Note[] {
    let notes = this.db.notes.filter((n) => !n.spent);
    if (token) notes = notes.filter((n) => n.token === token);
    return notes;
  }

  /** Get all unspent position notes */
  getUnspentPositions(): PositionNote[] {
    return this.db.positions.filter((p) => !p.spent);
  }

  /** Get total balance for a token (sum of unspent notes) */
  getBalance(token: string): bigint {
    return this.getUnspentNotes(token).reduce(
      (sum, n) => sum + BigInt(n.amount),
      0n,
    );
  }

  /** Encrypt and save to localStorage (browser) */
  async save(): Promise<void> {
    const json = JSON.stringify(this.db);
    const encrypted = await encrypt(json, this.password);
    if (typeof globalThis.localStorage !== "undefined") {
      globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted));
    }
  }

  /** Load from localStorage, decrypt, and return a new NoteManager */
  static async load(password: string): Promise<NoteManager> {
    const manager = new NoteManager(password);
    if (typeof globalThis.localStorage !== "undefined") {
      const stored = globalThis.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const encrypted = JSON.parse(stored);
        const json = await decrypt(encrypted, password);
        manager.db = JSON.parse(json);
      }
    }
    return manager;
  }

  /** Export the database as an encrypted string (for backup) */
  async exportEncrypted(): Promise<string> {
    const json = JSON.stringify(this.db);
    const encrypted = await encrypt(json, this.password);
    return JSON.stringify(encrypted);
  }

  /** Import from an encrypted backup string */
  static async importEncrypted(
    data: string,
    password: string,
  ): Promise<NoteManager> {
    const manager = new NoteManager(password);
    const encrypted = JSON.parse(data);
    const json = await decrypt(encrypted, password);
    manager.db = JSON.parse(json);
    return manager;
  }

  /** Get all notes (for debugging) */
  getAllNotes(): Note[] {
    return [...this.db.notes];
  }

  /** Get all positions (for debugging) */
  getAllPositions(): PositionNote[] {
    return [...this.db.positions];
  }
}
