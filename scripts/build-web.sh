#!/bin/bash
# Production Web Build Automation Script

PROJECT_DIR="/data/data/com.termux/files/home/project/DeepaBMS"
WEB_DIST_DIR="$PROJECT_DIR/apps/web/dist"

echo "Launching production Web build compilation..."
cd "$PROJECT_DIR" || exit 1

# 1. Install dependencies
echo "Installing dependencies..."
npm install

# 2. Run TypeScript checks
echo "Running type safety checks..."
node node_modules/typescript/bin/tsc --noEmit
if [ $? -ne 0 ]; then
  echo "TypeScript verification failed! Aborting Web build."
  exit 1
fi

# 3. Export static web production bundle
echo "Compiling web bundle via Expo..."
npx expo export --platform web

# 4. Relocate build assets to centralized web app delivery folder
mkdir -p "$WEB_DIST_DIR"
cp -R dist/* "$WEB_DIST_DIR/"
echo "Web build completed successfully. Assets located at $WEB_DIST_DIR."
