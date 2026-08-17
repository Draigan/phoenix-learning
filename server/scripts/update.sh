#!/usr/bin/env bash
# Update PocketBase to the latest release.
# Usage: sudo bash update.sh
set -euo pipefail

PB_DIR="/opt/pocketbase"
PB_BIN="$PB_DIR/pocketbase"

echo "Fetching latest PocketBase version..."
PB_VERSION=$(curl -fsSL https://api.github.com/repos/pocketbase/pocketbase/releases/latest \
  | grep '"tag_name"' | sed 's/.*"v\([^"]*\)".*/\1/')

CURRENT=$("$PB_BIN" --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || echo "unknown")
if [ "$CURRENT" = "$PB_VERSION" ]; then
  echo "Already on v$PB_VERSION, nothing to do."
  exit 0
fi

echo "Updating v$CURRENT → v$PB_VERSION"
systemctl stop phoenix-learning

TMP=$(mktemp -d)
curl -fsSL \
  "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" \
  -o "$TMP/pb.zip"
unzip -o "$TMP/pb.zip" pocketbase -d "$TMP"
mv "$TMP/pocketbase" "$PB_BIN"
chmod +x "$PB_BIN"
chown pocketbase:pocketbase "$PB_BIN"
rm -rf "$TMP"

systemctl start phoenix-learning
echo "Updated to v$PB_VERSION"
