#!/bin/bash
# Migrate old position commitments into ASP Merkle tree

set -e

DB_PATH="asp/zylith_asp.db"

if [ ! -f "$DB_PATH" ]; then
  echo "Error: Database not found at $DB_PATH"
  exit 1
fi

echo "Migrating 3 position commitments..."

# Get current leaf count
LEAF_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM commitments;")
echo "Current leaf count: $LEAF_COUNT"

# Insert the 3 position commitments
sqlite3 "$DB_PATH" <<EOF
INSERT OR IGNORE INTO commitments (leaf_index, commitment, deposit_tx) VALUES
  ($LEAF_COUNT, '5252198908740424864772021411528141252083556759186091457369513492426966111503', NULL),
  ($((LEAF_COUNT + 1)), '17581418587652343055209263297319709171945857580030423451726609638352528599861', NULL),
  ($((LEAF_COUNT + 2)), '18855883435653230176323995225940266493273876723912069767075944899109611174305', NULL);
EOF

echo "✅ Inserted 3 position commitments"
echo "New leaf count: $((LEAF_COUNT + 3))"
echo ""
echo "⚠️  IMPORTANT: You must restart the ASP server and rebuild the Merkle tree!"
echo "Run: cd asp && cargo run --release"
