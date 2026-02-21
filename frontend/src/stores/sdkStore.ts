import { create } from "zustand";
import { ZylithClient, SEPOLIA_ADDRESSES } from "@zylith/sdk";
import type { Note, PositionNote } from "@zylith/sdk";
import { env } from "@/config/env";

const NOTES_STORAGE_KEY = "zylith_notes";
const PASSWORD_STORAGE_KEY = "zylith_password";

interface SdkState {
  client: ZylithClient | null;
  isInitialized: boolean;
  isInitializing: boolean;
  initError: string | null;
  hasExistingNotes: boolean;

  // Derived from NoteManager
  balances: Record<string, bigint>;
  unspentNotes: Note[];
  unspentPositions: PositionNote[];

  // Actions
  checkExistingNotes: () => void;
  autoInitialize: () => Promise<boolean>;
  initialize: (password: string) => Promise<void>;
  refreshBalances: () => void;
  lock: () => void;
  resetVault: () => void;
}

export const useSdkStore = create<SdkState>((set, get) => ({
  client: null,
  isInitialized: false,
  isInitializing: false,
  initError: null,
  hasExistingNotes: false,
  balances: {},
  unspentNotes: [],
  unspentPositions: [],

  checkExistingNotes: () => {
    const exists = localStorage.getItem(NOTES_STORAGE_KEY) !== null;
    set({ hasExistingNotes: exists });
  },

  autoInitialize: async () => {
    const savedPassword = localStorage.getItem(PASSWORD_STORAGE_KEY);
    if (!savedPassword) return false;

    try {
      await get().initialize(savedPassword);
      return true;
    } catch {
      // Password might be wrong, clear it
      localStorage.removeItem(PASSWORD_STORAGE_KEY);
      return false;
    }
  },

  initialize: async (password: string) => {
    set({ isInitializing: true, initError: null });
    try {
      const client = new ZylithClient({
        starknetRpcUrl: env.starknetRpcUrl,
        contracts: SEPOLIA_ADDRESSES,
        mode: "asp",
        aspUrl: env.aspUrl,
        password,
      });
      await client.init();

      // Save password to localStorage so we don't ask again
      localStorage.setItem(PASSWORD_STORAGE_KEY, password);

      set({
        client,
        isInitialized: true,
        isInitializing: false,
        hasExistingNotes: true,
      });
      get().refreshBalances();
    } catch (err) {
      set({
        isInitializing: false,
        initError: err instanceof Error ? err.message : "Initialization failed",
      });
    }
  },

  refreshBalances: () => {
    const { client } = get();
    if (!client) return;

    const noteManager = client.getNoteManager();
    const notes = noteManager.getUnspentNotes();
    const positions = noteManager.getUnspentPositions();

    // Compute balances per token
    const balances: Record<string, bigint> = {};
    for (const note of notes) {
      const token = note.token;
      const amount = BigInt(note.amount);
      balances[token] = (balances[token] ?? 0n) + amount;
    }

    set({ balances, unspentNotes: notes, unspentPositions: positions });
  },

  lock: () => {
    // Clear password when user locks/disconnects
    localStorage.removeItem(PASSWORD_STORAGE_KEY);
    set({
      client: null,
      isInitialized: false,
      isInitializing: false,
      initError: null,
      balances: {},
      unspentNotes: [],
      unspentPositions: [],
    });
  },

  resetVault: () => {
    // Complete vault reset - deletes all encrypted notes
    localStorage.removeItem(NOTES_STORAGE_KEY);
    localStorage.removeItem(PASSWORD_STORAGE_KEY);
    set({
      client: null,
      isInitialized: false,
      isInitializing: false,
      initError: null,
      hasExistingNotes: false,
      balances: {},
      unspentNotes: [],
      unspentPositions: [],
    });
    window.location.reload();
  },
}));
