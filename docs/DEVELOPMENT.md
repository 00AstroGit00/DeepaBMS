# DeepaBMS Developer Guidelines

This document provides setup instructions, development standards, and code guidelines for developing **DeepaBMS** inside the Termux (Android) environment.

---

## 1. Environment Limitations & Fixes

Android's Termux environment differs significantly from standard Linux distributions. Follow these procedures to prevent path, memory, and compiler failures.

### A. Non-FHS Path Translation (Shebangs)
Termux does not use standard root folders like `/bin` or `/usr/bin`. All binaries reside inside `/data/data/com.termux/files/usr/bin/`.
* **Fixing Shebangs**: Run the utility tool to adjust paths of all shell scripts:
  ```bash
  termux-fix-shebang scripts/**/*.sh
  ```
* **Explicit Runner Invocation**: If sharing scripts between Termux and Standard Linux, invoke scripts with the interpreter directly:
  ```bash
  bash scripts/build/android.sh
  ```

### B. Android Phantom Processes Killer (Android 12+)
Android's battery manager kills heavy background child processes, including Expo Metro bundler threads.
* **Mitigation**:
  - Keep active RAM free. Check memory with `free -m`.
  - Clean local npm cache regularly:
    ```bash
    npm cache clean --force
    ```
  - If Metro crashes consistently, run this ADB command from a connected PC to disable the killer:
    ```bash
    adb shell "settings put global settings_enable_monitor_phantom_procs false"
    ```

---

## 2. Local Development & Metro Bundler

To launch the local development server:

1. **Install Core System Dependencies**:
   ```bash
   pkg update && pkg upgrade -y
   pkg install build-essential python git nodejs -y
   ```
2. **Install Node Packages**:
   ```bash
   npm install
   ```
3. **Launch Metro Bundler**:
   Because Termux does not run a browser, start the Metro bundler with the tunnel flag or QR code display:
   ```bash
   npx expo start --tunnel
   ```
   *Use the Expo Go app on a physical device connected to the same network (or via the tunnel url) to preview.*

---

## 3. Code Quality & Formatting Standards

DeepaBMS uses strict ESLint and Prettier configurations to ensure style consistency.

### A. Code Checking Scripts
* **Lint Code**: `npm run lint` (runs ESLint validation)
* **Auto-Fix Style Issues**: `npm run lint:fix`
* **Format Files**: `npm run format` (runs Prettier)
* **Static Type Check**: `npm run ts:check` (verifies TypeScript compiling)

### B. Prettier Configuration (`.prettierrc`)
Consistent styling formatting is configured in the root `.prettierrc`:
```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "semi": true,
  "tabWidth": 2,
  "printWidth": 80
}
```

### C. ESLint Configuration (`eslint.config.js`)
Configured using modern Flat Config:
```javascript
module.exports = [
  {
    ignores: ["node_modules/", "dist/", "android/", "ios/", ".expo/"]
  },
  ...require('eslint-config-expo'),
  {
    plugins: {
      prettier: require('eslint-plugin-prettier')
    },
    rules: {
      'prettier/prettier': 'error'
    }
  }
];
```

---

## 4. Testing & Validation Guidelines

All code changes must pass the local verification suites before submission.

### A. TypeScript Type Safety
Run the TypeScript compiler without generating output files to check for compilation errors:
```bash
npm run ts:check
```

### B. Jest Test Suite
Automated testing is configured using Jest. Test files must be colocated under `tests/` or use the `.test.tsx` / `.spec.tsx` suffix.
* **Execute Tests**: `npm run test`
* **Directory structure for testing**:
  - `tests/unit/`: Logic, utility functions, and reducer state checks.
  - `tests/components/`: Component rendering tests using `@testing-library/react-native`.

---

## 5. EAS Cloud Build Integration

Since local Android builds (`npx expo run:android`) are not supported natively in Termux, all binaries are built in the Expo Cloud using EAS CLI.

### A. Authentication
Authenticate without opening a web browser:
```bash
eas login --no-browser
eas whoami
```

### B. Building Android Packages
* **Trigger Development/Preview (APK)**:
  ```bash
  eas build --platform android --profile preview --non-interactive
  ```
* **Trigger Production Release (AAB)**:
  ```bash
  eas build --platform android --profile production --non-interactive
  ```

---

## 6. Scripting Guidelines (Strict Mode)

All shell scripts under the `scripts/` directory must adhere to the following template:

```bash
#!/data/data/com.termux/files/usr/bin/bash
# Strict execution mode
set -euo pipefail

# Dynamic root path detection
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source shared logs and helper functions
source "$PROJECT_DIR/scripts/lib/utils.sh"

cleanup() {
    log_info "Performing script cleanup..."
}
trap cleanup EXIT INT TERM

# Script logic starts here
log_info "Running DeepaBMS custom process..."
```
