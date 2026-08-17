#!/usr/bin/env bash
# Run once on a fresh VPS to install PocketBase.
# Usage: sudo bash install.sh
set -euo pipefail

PB_DIR="/opt/pocketbase"
PB_DATA="$PB_DIR/data"
PB_BIN="$PB_DIR/pocketbase"
SERVICE_SRC="$(dirname "$0")/../phoenix-learning.service"
NGINX_SRC="$(dirname "$0")/../nginx.conf"

# ── Resolve the latest PocketBase release ─────────────────────────────────────
echo "Fetching latest PocketBase version..."
PB_VERSION=$(curl -fsSL https://api.github.com/repos/pocketbase/pocketbase/releases/latest \
  | grep '"tag_name"' | sed 's/.*"v\([^"]*\)".*/\1/')
echo "Installing PocketBase v$PB_VERSION"

# ── Create dedicated user ──────────────────────────────────────────────────────
if ! id -u pocketbase &>/dev/null; then
  useradd --system --no-create-home --shell /usr/sbin/nologin pocketbase
fi

# ── Download and install binary ────────────────────────────────────────────────
mkdir -p "$PB_DIR" "$PB_DATA"
TMP=$(mktemp -d)
curl -fsSL \
  "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" \
  -o "$TMP/pb.zip"
unzip -o "$TMP/pb.zip" pocketbase -d "$TMP"
mv "$TMP/pocketbase" "$PB_BIN"
chmod +x "$PB_BIN"
rm -rf "$TMP"

chown -R pocketbase:pocketbase "$PB_DIR"

# ── Systemd service ────────────────────────────────────────────────────────────
cp "$SERVICE_SRC" /etc/systemd/system/phoenix-learning.service
systemctl daemon-reload
systemctl enable phoenix-learning
systemctl restart phoenix-learning
echo "PocketBase service started on 127.0.0.1:8090"

# ── Nginx ──────────────────────────────────────────────────────────────────────
cp "$NGINX_SRC" /etc/nginx/sites-available/phoenix-learning
ln -sf /etc/nginx/sites-available/phoenix-learning /etc/nginx/sites-enabled/phoenix-learning
nginx -t && systemctl reload nginx
echo ""
echo "Done. To access the admin panel, SSH tunnel and open http://localhost:8090/_/"
echo "  ssh -L 8090:127.0.0.1:8090 user@your-server"
