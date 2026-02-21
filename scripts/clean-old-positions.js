/**
 * Clean old positions that were created before the migration.
 * These positions have invalid roots and cannot be burned.
 */

const STORAGE_KEY = "zylith_notes";

// The 3 position commitments to remove
const OLD_COMMITMENTS = [
  "5252198908740424864772021411528141252083556759186091457369513492426966111503",
  "17581418587652343055209263297319709171945857580030423451726609638352528599861",
  "18855883435653230176323995225940266493273876723912069767075944899109611174305",
];

async function cleanOldPositions() {
  // Get encrypted notes from localStorage
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    console.log("No notes found in localStorage");
    return;
  }

  console.log("Found encrypted notes in localStorage");
  console.log("⚠️  You'll need to unlock your vault to decrypt and clean the positions");
  console.log("");
  console.log("Run this in browser console after unlocking vault:");
  console.log("");
  console.log(`
// 1. Get the SDK client
const client = window.__ZYLITH_CLIENT__;
if (!client) {
  console.error("Client not initialized. Unlock vault first!");
} else {
  // 2. Get note manager
  const noteManager = client.getNoteManager();

  // 3. Get current positions
  const positions = noteManager.getAllPositions();
  console.log("Current positions:", positions.length);

  // 4. Filter out old positions
  const oldCommitments = [
    "${OLD_COMMITMENTS[0]}",
    "${OLD_COMMITMENTS[1]}",
    "${OLD_COMMITMENTS[2]}",
  ];

  const filtered = positions.filter(p => !oldCommitments.includes(p.commitment));
  console.log("Positions after cleanup:", filtered.length);
  console.log("Removed:", positions.length - filtered.length, "old positions");

  // 5. Update database
  noteManager.db.positions = filtered;

  // 6. Save
  await client.saveNotes();
  console.log("✅ Cleaned and saved!");

  // 7. Refresh UI
  window.location.reload();
}
  `.trim());
}

cleanOldPositions();
