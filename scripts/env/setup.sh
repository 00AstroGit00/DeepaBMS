#!/data/data/com.termux/files/usr/bin/bash
# Install packages & patch Termux shebangs

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/utils.sh"

log_info "Initializing Termux setup/bootstrap..."

# 1. Update/Install system dependencies via Termux pkg manager
log_info "Checking and installing required Termux packages..."
REQUIRED_PKGS=("build-essential" "python" "git" "nodejs")
MISSING_PKGS=()

for pkg in "${REQUIRED_PKGS[@]}"; do
    if ! dpkg -s "$pkg" &>/dev/null; then
        MISSING_PKGS+=("$pkg")
    fi
done

if [ ${#MISSING_PKGS[@]} -gt 0 ]; then
    log_info "Installing missing system packages: ${MISSING_PKGS[*]}"
    pkg update -y
    pkg install -y "${MISSING_PKGS[@]}"
else
    log_info "All required Termux system packages are already installed."
fi

# 2. Install project Node dependencies
log_info "Installing npm dependencies in project root..."
cd "$PROJECT_DIR"
npm install

# 3. Patch Shebangs for scripts folder
log_info "Optimizing shebangs for Termux environment..."
if command -v termux-fix-shebang &>/dev/null; then
    # Fix shebangs on all scripts in scripts/ directory
    find "$PROJECT_DIR/scripts" -type f -name "*.sh" -exec termux-fix-shebang {} +
    log_info "Successfully patched shebangs."
else
    log_warn "termux-fix-shebang utility not found. Shebang paths will not be verified automatically."
fi

log_info "Setup completed successfully."
