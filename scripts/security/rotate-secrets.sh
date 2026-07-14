#!/data/data/com.termux/files/usr/bin/env bash
# DeepaBMS — Secret rotation
# Generates a new 32-byte hex JWT_SECRET, rotates the DB password (via Vault
# if available, else updates .env.production), restarts the service, and
# notifies via webhook. Use with care — requires a maintenance window.

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")/../lib" && pwd)/utils.sh"

ENV_FILE="${1:-${PROJECT_DIR}/.env.production}"

if [ ! -f "${ENV_FILE}" ]; then
  log_error "Env file not found: ${ENV_FILE}"
  exit 1
fi

log_warn "Rotating secrets in ${ENV_FILE}. Ensure a maintenance window is active."

# ── New JWT secret (32 bytes hex) ───────────────────────────────────────
NEW_JWT="$(openssl rand -hex 32)"
if [ -z "${NEW_JWT}" ]; then
  log_error "Failed to generate JWT secret."
  exit 1
fi
log_info "Generated new JWT_SECRET (32 bytes hex)."

# ── New DB password ──────────────────────────────────────────────────────
NEW_DB_PASS="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
log_info "Generated new database password."

# ── Apply to env file ─────────────────────────────────────────────────────
if command -v vault &>/dev/null && [ -n "${VAULT_ADDR:-}" ]; then
  log_info "Vault detected — writing new DB credential to Vault (dynamic)."
  vault kv put secret/deepabms/prod \
    jwt_secret="${NEW_JWT}" \
    db_password="${NEW_DB_PASS}" || log_warn "Vault write failed."
else
  # Update local .env.production atomically (backup first).
  cp "${ENV_FILE}" "${ENV_FILE}.bak.$(date +%s)"
  sed -i \
    -e "s|^JWT_SECRET=.*|JWT_SECRET=${NEW_JWT}|" \
    -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${NEW_DB_PASS}|" \
    -e "s|^DATABASE_URL=.*|DATABASE_URL=postgres://${POSTGRES_USER:-deepa_admin}:${NEW_DB_PASS}@${POSTGRES_HOST:-postgres}:${POSTGRES_PORT:-5432}/${POSTGRES_DB:-deepa_bms}|" \
    "${ENV_FILE}"
  # Re-apply DB password for the substitution above (POSTGRES_USER may be empty).
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${NEW_DB_PASS}|" "${ENV_FILE}"
  log_info "Updated ${ENV_FILE} (backup created)."
fi

# ── Restart dependent services ───────────────────────────────────────────
if command -v docker &>/dev/null && [ -f "${PROJECT_DIR}/docker-compose.prod.yml" ]; then
  log_info "Restarting backend + postgres via docker compose..."
  (cd "${PROJECT_DIR}" && docker compose -f docker-compose.prod.yml \
    restart backend postgres) || log_warn "Restart failed — restart manually."
elif command -v kubectl &>/dev/null && [ -n "${KUBE_NAMESPACE:-}" ]; then
  log_info "Rolling restart of backend deployment..."
  kubectl rollout restart deployment/deepabms-backend -n "${KUBE_NAMESPACE}" \
    || log_warn "kubectl restart failed — restart manually."
else
  log_warn "No container runtime detected — restart the backend service manually."
fi

# ── Notify ────────────────────────────────────────────────────────────────
if [ -n "${ALERT_WEBHOOK_URL:-}" ]; then
  curl -sS -X POST "${ALERT_WEBHOOK_URL}" \
    -H 'Content-Type: application/json' \
    -d '{"text":"DeepaBMS: secrets rotated successfully. Old tokens invalidated."}' \
    || log_warn "Notification webhook failed."
  log_info "Notification sent."
fi

log_info "Secret rotation complete. Validate /health and re-authenticate clients."
