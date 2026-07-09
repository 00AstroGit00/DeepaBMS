#!/data/data/com.termux/files/usr/bin/bash
# Purge Metro cache, node_modules cache, Jest cache, and npm cache

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/utils.sh"

log_info "Starting cache cleanup..."

cd "$PROJECT_DIR"

# 1. Clean Metro bundler cache
log_info "Cleaning Metro bundler cache files..."
if [ -n "${TMPDIR:-}" ]; then
    rm -rf "$TMPDIR"/metro-* 2>/dev/null || true
fi
rm -rf .expo 2>/dev/null || true
log_info "Metro cache files cleaned."

# 2. Clean Node modules cache
log_info "Cleaning node_modules/.cache..."
rm -rf node_modules/.cache 2>/dev/null || true

# 3. Clean Jest cache
log_info "Cleaning Jest cache..."
JEST_BIN="$PROJECT_DIR/node_modules/jest/bin/jest.js"
if [ -f "$JEST_BIN" ]; then
    node "$JEST_BIN" --clearCache
else
    npx jest --clearCache
fi

# 4. Clean npm cache
log_info "Cleaning npm package cache..."
npm cache clean --force

log_info "Cache cleanup completed successfully."
