#!/data/data/com.termux/files/usr/bin/env bash
# =============================================================================
# DeepaBMS — Production Docker Deploy
# =============================================================================
# Builds and deploys the full production stack via Docker Compose.
# Usage:
#   ./scripts/deploy/docker-deploy.sh                    # default deploy
#   ./scripts/deploy/docker-deploy.sh --profile monitoring # with monitoring
#   ./scripts/deploy/docker-deploy.sh --no-cache           # force rebuild
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*" >&2; }
info() { echo -e "${CYAN}[i]${NC} $*"; }

# ── Defaults ─────────────────────────────────────────────────────────────────
COMPOSE_FILE="docker-compose.prod.yml"
COMPOSE_FLAGS=()
PROFILES=()
NO_CACHE=false

# ── Parse Arguments ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile)
      PROFILES+=("$2")
      shift 2
      ;;
    --no-cache)
      NO_CACHE=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [--profile monitoring] [--no-cache]"
      exit 0
      ;;
    *)
      err "Unknown argument: $1"
      exit 1
      ;;
  esac
done

if [[ ${#PROFILES[@]} -gt 0 ]]; then
  for p in "${PROFILES[@]}"; do
    COMPOSE_FLAGS+=("--profile" "$p")
  done
fi

if [[ "$NO_CACHE" == true ]]; then
  COMPOSE_FLAGS+=("--no-cache")
fi

# ── Pre-flight Checks ────────────────────────────────────────────────────────
info "Checking prerequisites..."

if ! command -v docker &>/dev/null; then
  err "Docker is not installed. Install it first: https://docs.docker.com/get-docker/"
  exit 1
fi

if ! docker compose version &>/dev/null; then
  err "Docker Compose v2 is required. Run: docker compose version"
  exit 1
fi

log "Docker: $(docker --version)"
log "Compose: $(docker compose version)"

# ── Load Environment ─────────────────────────────────────────────────────────
ENV_FILE="$PROJECT_DIR/.env.production"
if [[ ! -f "$ENV_FILE" ]]; then
  err ".env.production not found at $ENV_FILE"
  info "Copy .env.production.example to .env.production and fill in values:"
  info "  cp .env.production.example .env.production"
  exit 1
fi

# Compose variable substitution (${VAR:?...}) reads from the env scope, not from
# service `env_file`. Pass .env.production via --env-file so interpolation works.
COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

log "Loaded environment from .env.production"

# ── Pull Latest Images ───────────────────────────────────────────────────────
info "Pulling latest images..."
"${COMPOSE[@]}" "${COMPOSE_FLAGS[@]}" pull --quiet
log "Images up to date"

# ── Build and Deploy ─────────────────────────────────────────────────────────
info "Building and starting services..."

BUILD_ARGS=""
if [[ "$NO_CACHE" == true ]]; then
  BUILD_ARGS="--no-cache"
fi

"${COMPOSE[@]}" "${COMPOSE_FLAGS[@]}" up -d --build --wait $BUILD_ARGS
log "Stack deployed"

# ── Health Check Loop ────────────────────────────────────────────────────────
info "Waiting for all services to be healthy..."
TIMEOUT=120
ELAPSED=0
ALL_HEALTHY=false

while [[ $ELAPSED -lt $TIMEOUT ]]; do
  HEALTHY=$(docker compose -f "$COMPOSE_FILE" "${COMPOSE_FLAGS[@]}" ps --format json 2>/dev/null \
    | grep -c '"Health":"healthy"' || true)
  TOTAL=$(docker compose -f "$COMPOSE_FILE" "${COMPOSE_FLAGS[@]}" ps --format json 2>/dev/null \
    | grep -c '"State":"running"' || true)

  if [[ "$HEALTHY" -ge "$TOTAL" && "$TOTAL" -gt 0 ]]; then
    ALL_HEALTHY=true
    break
  fi

  printf "  Services healthy: %d/%d\r" "$HEALTHY" "$TOTAL"
  sleep 5
  ELAPSED=$((ELAPSED + 5))
done

echo ""

if [[ "$ALL_HEALTHY" == true ]]; then
  log "All services healthy"
else
  warn "Health check timed out after ${TIMEOUT}s — check logs:"
  info "  docker compose -f $COMPOSE_FILE logs --tail=50"
fi

# ── Deployment Summary ───────────────────────────────────────────────────────
echo ""
echo "============================================"
echo "  DeepaBMS — Deployment Summary"
echo "============================================"
echo "  Date:       $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "  Compose:    $COMPOSE_FILE"
echo "  Profiles:   ${PROFILES[*]:-(none)}"
echo "  Services:"

"${COMPOSE[@]}" "${COMPOSE_FLAGS[@]}" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "  Logs:       docker compose -f $COMPOSE_FILE logs -f"
echo "  Stop:       docker compose -f $COMPOSE_FILE down"
echo "============================================"
