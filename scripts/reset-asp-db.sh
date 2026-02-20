#!/bin/bash
# Reset ASP database to clean state
# This will delete all commitments and start fresh

set -e

DB_PATH="asp/zylith_asp.db"

if [ ! -f "$DB_PATH" ]; then
  echo "Error: Database not found at $DB_PATH"
  exit 1
fi

echo "⚠️  WARNING: This will DELETE all data from ASP database!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
echo

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo "Aborted."
  exit 1
fi

# Backup the database
cp "$DB_PATH" "$DB_PATH.backup.$(date +%s)"
echo "✅ Backup created"

# Delete all commitments, roots, and nullifiers
sqlite3 "$DB_PATH" <<EOF
DELETE FROM commitments;
DELETE FROM merkle_roots;
DELETE FROM nullifiers;
DELETE FROM sync_state;
VACUUM;
EOF

echo "✅ ASP database reset complete!"
echo ""
echo "Now restart the ASP server:"
echo "  cd asp && cargo run --release"
