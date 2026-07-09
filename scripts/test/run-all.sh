#!/data/data/com.termux/files/usr/bin/bash
# Unified Test and Validation Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/utils.sh"

LOG_DIR="$PROJECT_DIR/tests/reports"
mkdir -p "$LOG_DIR"

log_info "Launching verification checks and test runner..."

# 1. Type Safety Check
log_info "Step 1: Compiling code verification check..."
TSC_BIN="$PROJECT_DIR/node_modules/typescript/bin/tsc"
if [ ! -f "$TSC_BIN" ]; then
    TSC_BIN="npx tsc"
else
    TSC_BIN="node $TSC_BIN"
fi

if $TSC_BIN --noEmit > "$LOG_DIR/tsc_report.txt" 2>&1; then
    log_info "✓ TypeScript compiled successfully. No errors detected."
    echo "TypeScript PASS" > "$LOG_DIR/status_tsc.txt"
    TSC_STATUS=0
else
    log_error "✗ TypeScript compilation failed. Review logs at $LOG_DIR/tsc_report.txt"
    echo "TypeScript FAIL" > "$LOG_DIR/status_tsc.txt"
    TSC_STATUS=1
fi

# 2. Jest Test Suite
log_info "Step 2: Running automated Jest test suite..."
JEST_BIN="$PROJECT_DIR/node_modules/jest/bin/jest.js"
if [ ! -f "$JEST_BIN" ]; then
    JEST_BIN="npx jest"
else
    JEST_BIN="node $JEST_BIN"
fi

if $JEST_BIN --json --outputFile="$LOG_DIR/jest_report.json" > "$LOG_DIR/jest_stdout.txt" 2>&1; then
    log_info "✓ All Jest tests passed successfully."
    echo "Jest PASS" > "$LOG_DIR/status_jest.txt"
    JEST_STATUS=0
else
    log_error "✗ Jest test suite encountered failures. Review logs at $LOG_DIR/jest_stdout.txt"
    echo "Jest FAIL" > "$LOG_DIR/status_jest.txt"
    JEST_STATUS=1
fi

# 3. Overall status check
log_info "Test execution complete. Reports saved under $LOG_DIR."
if [ $TSC_STATUS -eq 0 ] && [ $JEST_STATUS -eq 0 ]; then
    log_info "✓ All checks passed!"
    exit 0
else
    log_error "✗ Some checks failed. Please check reports under $LOG_DIR."
    exit 1
fi
