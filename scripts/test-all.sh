#!/bin/bash
# Unified Test and Validation Script

PROJECT_DIR="/data/data/com.termux/files/home/project/DeepaBMS"
LOG_DIR="$PROJECT_DIR/tests/reports"

mkdir -p "$LOG_DIR"
echo "Launching verification checks and test runner..."

# 1. Type Safety Check
echo "Step 1: Compiling code verification check..."
node "$PROJECT_DIR/node_modules/typescript/bin/tsc" --noEmit > "$LOG_DIR/tsc_report.txt" 2>&1
if [ $? -eq 0 ]; then
  echo "✓ TypeScript compiled successfully. No errors detected."
  echo "TypeScript PASS" > "$LOG_DIR/status_tsc.txt"
else
  echo "✗ TypeScript compilation failed. Review logs at $LOG_DIR/tsc_report.txt"
  echo "TypeScript FAIL" > "$LOG_DIR/status_tsc.txt"
fi

# 2. Jest Test Suite
echo "Step 2: Running automated Jest test suite..."
node "$PROJECT_DIR/node_modules/jest/bin/jest.js" --json --outputFile="$LOG_DIR/jest_report.json" > "$LOG_DIR/jest_stdout.txt" 2>&1
if [ $? -eq 0 ]; then
  echo "✓ All Jest tests passed successfully."
  echo "Jest PASS" > "$LOG_DIR/status_jest.txt"
else
  echo "✗ Jest test suite encountered failures. Review logs at $LOG_DIR/jest_stdout.txt"
  echo "Jest FAIL" > "$LOG_DIR/status_jest.txt"
fi

echo "Test execution complete. Reports saved under $LOG_DIR."
