#!/bin/bash
# Production Windows Desktop Packaging Automation Script

PROJECT_DIR="/data/data/com.termux/files/home/project/DeepaBMS"
WINDOWS_APP_DIR="$PROJECT_DIR/apps/windows"

echo "Launching production Windows native desktop compilation..."

# 1. Compile web assets first
"$PROJECT_DIR/scripts/build-web.sh"
if [ $? -ne 0 ]; then
  echo "Web compilation failed. Aborting desktop build."
  exit 1
fi

# 2. Package desktop installer
echo "Compiling native Windows installer wrapper via Electron Builder..."
cd "$WINDOWS_APP_DIR" || exit 1
npm install
npm run package

echo "Windows desktop packaging completed successfully. Installer outputs are located in $WINDOWS_APP_DIR/dist/."
