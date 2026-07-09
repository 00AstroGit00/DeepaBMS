#!/data/data/com.termux/files/usr/bin/bash
# EAS Cloud Build Trigger for Android

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/utils.sh"

cleanup() {
    log_info "Cleaning up build session logs..."
}
trap cleanup EXIT INT TERM

log_info "Checking environment constraints..."
verify_dependency "node"

# Check EAS CLI
if ! command -v eas &>/dev/null; then
    log_warn "Expo EAS CLI not found globally. Trying to check local dependency..."
    if [ -f "$PROJECT_DIR/node_modules/.bin/eas" ]; then
        # Export a path or function to use local eas
        eas() {
            "$PROJECT_DIR/node_modules/.bin/eas" "$@"
        }
    else
        log_error "EAS CLI is not installed. Run 'npm install -g eas-cli' or add it to dependencies."
        exit 1
    fi
fi

cd "$PROJECT_DIR"

log_info "Verifying EAS Session..."
if ! eas whoami &>/dev/null; then
    log_error "Not authenticated with EAS. Please run 'eas login' manually first."
    exit 1
fi

PROFILE=${1:-preview}

if [ "$PROFILE" = "all" ] || [ "$PROFILE" = "preview" ]; then
    log_info "Dispatching Android Preview Build (APK)..."
    eas build --platform android --profile preview --non-interactive
fi

if [ "$PROFILE" = "all" ] || [ "$PROFILE" = "production" ]; then
    log_info "Dispatching Android Production Build (AAB)..."
    eas build --platform android --profile production --non-interactive
fi

log_info "Android compilation jobs dispatched successfully. Track progress inside Expo Dashboard."
