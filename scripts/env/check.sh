#!/data/data/com.termux/files/usr/bin/bash
# Validate Termux dependencies (Node, npm, EAS, memory)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/utils.sh"

log_info "Starting environment validation..."

# Check essential commands
verify_dependency "node"
verify_dependency "npm"

# Check Node version
NODE_VERSION=$(node -v)
log_info "Node.js version: $NODE_VERSION"

# Check npm version
NPM_VERSION=$(npm -v)
log_info "npm version: $NPM_VERSION"

# Check EAS CLI
if command -v eas &>/dev/null; then
    EAS_VERSION=$(eas --version 2>&1)
    log_info "Expo EAS CLI version: $EAS_VERSION"
else
    log_warn "Expo EAS CLI ('eas') is not installed. Cloud builds for Android might not work."
fi

# Check git
if command -v git &>/dev/null; then
    GIT_VERSION=$(git --version)
    log_info "Git version: $GIT_VERSION"
else
    log_warn "Git is not installed."
fi

# Check available memory
log_info "Verifying system memory details..."
if command -v free &>/dev/null; then
    free -m
    FREE_MEM=$(free -m | awk '/^Mem:/{print $4}')
    log_info "Available free memory: ${FREE_MEM}MB"
    if [ "$FREE_MEM" -lt 500 ]; then
        log_warn "Free memory is under 500MB. Consider closing background apps to prevent the Android Phantom Processes Killer from terminating Metro bundler tasks."
    else
        log_info "System memory looks sufficient."
    fi
else
    log_warn "'free' command not available. Could not check free memory details."
fi

log_info "Environment validation completed."
