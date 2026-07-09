#!/data/data/com.termux/files/usr/bin/bash
# Production Windows Desktop Packaging Automation Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/utils.sh"

WINDOWS_APP_DIR="$PROJECT_DIR/apps/windows"

log_info "Launching production Windows native desktop compilation..."

# 1. Compile web assets first
"$SCRIPT_DIR/web.sh"
if [ $? -ne 0 ]; then
  log_error "Web compilation failed. Aborting desktop build."
  exit 1
fi

# 2. Package desktop installer
log_info "Compiling native Windows installer wrapper via Electron Builder..."
cd "$WINDOWS_APP_DIR"
npm install
npm run package

log_info "Windows desktop packaging completed successfully. Installer outputs are located in $WINDOWS_APP_DIR/dist/."
