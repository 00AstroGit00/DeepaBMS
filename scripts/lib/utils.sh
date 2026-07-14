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

# Load PostgreSQL connection configuration from environment with sane defaults.
# All values are overridable via environment variables (useful in CI / prod).
load_db_config() {
    export PGHOST="${PGHOST:-${DB_HOST:-localhost}}"
    export PGPORT="${PGPORT:-${DB_PORT:-5432}}"
    export PGUSER="${PGUSER:-${DB_USER:-postgres}}"
    export PGDATABASE="${PGDATABASE:-${DB_NAME:-deepabms}}"
    export PGPASSWORD="${PGPASSWORD:-${DB_PASSWORD:-}}"
    export PGSSLMODE="${PGSSLMODE:-${DB_SSLMODE:-prefer}}"
}

# Load backup / DR configuration from environment with sane defaults.
load_backup_config() {
    export BACKUP_ROOT="${BACKUP_ROOT:-$PROJECT_DIR/backups}"
    export S3_BUCKET="${S3_BUCKET:-${BACKUP_S3_BUCKET:-}}"
    export S3_PREFIX="${S3_PREFIX:-deepabms}"
    export GPG_RECIPIENT="${GPG_RECIPIENT:-${BACKUP_GPG_RECIPIENT:-}}"
    export WAL_ARCHIVE_DIR="${WAL_ARCHIVE_DIR:-$BACKUP_ROOT/wal}"
    export RETENTION_DAYS="${RETENTION_DAYS:-30}"
    export SYSLOG_FACILITY="${SYSLOG_FACILITY:-local0}"
}

# Emit a structured syslog line (best-effort) in addition to stdout logging.
syslog_event() {
    local level="$1"; shift
    local msg="$*"
    logger -t "deepabms" -p "${SYSLOG_FACILITY:-local0}.${level}" "$msg" 2>/dev/null || true
}

# Compute SHA256 checksum of a file, portable across platforms.
sha256_of() {
    sha256sum "$1" 2>/dev/null | awk '{print $1}' \
        || shasum -a 256 "$1" 2>/dev/null | awk '{print $1}'
}

# Verify a dependency or exit with a clear message.
require() {
    verify_dependency "$1"
}
