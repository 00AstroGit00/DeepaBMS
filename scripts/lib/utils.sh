#!/data/data/com.termux/files/usr/bin/bash
# DeepaBMS Shared Shell Scripting Utility Library

set -euo pipefail

# Output Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

# Logger functions
log_info() {
    echo -e "${GREEN}[INFO] $(date +'%Y-%m-%d %H:%M:%S'): $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}[WARN] $(date +'%Y-%m-%d %H:%M:%S'): $1${NC}"
}

log_error() {
    echo -e "${RED}[ERROR] $(date +'%Y-%m-%d %H:%M:%S'): $1${NC}" >&2
}

# Resolve canonical paths dynamically
UTILS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PROJECT_DIR="$(cd "$UTILS_DIR/../.." && pwd)"

# Verify dependency is available
verify_dependency() {
    if ! command -v "$1" &>/dev/null; then
        log_error "Dependency '$1' is required but not installed."
        exit 1
    fi
}
