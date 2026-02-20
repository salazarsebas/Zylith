/**
 * Reset vault to clean state.
 * This removes all notes and positions from localStorage.
 * You'll need to deposit fresh funds after this.
 */

const STORAGE_KEY = "zylith_notes";
const PASSWORD_KEY = "zylith_password";

console.log("⚠️  WARNING: This will delete ALL notes and positions from your vault!");
console.log("");
console.log("To reset, run this in browser console:");
console.log("");
console.log(`
// Clear vault data
localStorage.removeItem("${STORAGE_KEY}");
localStorage.removeItem("${PASSWORD_KEY}");
console.log("✅ Vault reset complete!");
console.log("Reload the page and create a new vault with a fresh password.");
window.location.reload();
`.trim());
