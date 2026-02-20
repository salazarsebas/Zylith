#!/usr/bin/env bash
# =============================================================================
# Zylith — Run ASP Server
# =============================================================================
# Starts the Anonymous Service Provider server
#
# Usage:
#   bash scripts/run-asp.sh
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR/asp"

echo "🚀 Starting Zylith ASP Server..."
echo ""
echo "Server will run on: http://127.0.0.1:3000"
echo ""
echo "Press Ctrl+C to stop"
echo ""

cargo run --bin zylith-asp
