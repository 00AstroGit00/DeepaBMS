#!/data/data/com.termux/files/usr/bin/bash
# Production Web Build Automation Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/utils.sh"

WEB_DIST_DIR="$PROJECT_DIR/apps/web/dist"

log_info "Launching production Web build compilation..."
cd "$PROJECT_DIR"

# 1. Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    log_info "node_modules not found. Installing dependencies..."
    npm install
fi

# 2. Run TypeScript checks
log_info "Running type safety checks..."
if [ -f "node_modules/typescript/bin/tsc" ]; then
    node node_modules/typescript/bin/tsc --noEmit
else
    npx tsc --noEmit
fi

# 3. Export static web production bundle
log_info "Compiling web bundle via Expo..."
npx expo export --platform web

# 4. Relocate build assets to centralized web app delivery folder
log_info "Relocating build assets to $WEB_DIST_DIR..."
mkdir -p "$WEB_DIST_DIR"
# Clean target folder first to avoid mixing stale builds
rm -rf "${WEB_DIST_DIR:?}"/*
cp -R dist/* "$WEB_DIST_DIR/"

log_info "Web build completed successfully. Assets located at $WEB_DIST_DIR."
