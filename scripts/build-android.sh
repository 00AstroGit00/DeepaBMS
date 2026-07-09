#!/bin/bash
# Android Signed Release Build Automation Script (using Expo EAS build cloud service)

PROJECT_DIR="/data/data/com.termux/files/home/project/DeepaBMS"

echo "Checking Expo EAS CLI installation..."
if ! command -v eas &> /dev/null
then
    echo "Expo EAS CLI not found globally. Installing local copy..."
    npm install -g eas-cli
fi

cd "$PROJECT_DIR" || exit 1

# 1. Login verification
echo "Please verify Expo login credentials..."
eas whoami
if [ $? -ne 0 ]; then
  echo "Expo authorization required. Run 'eas login' manually before running this script."
  exit 1
fi

# 2. Build signed APK package for direct preview installation
echo "Compiling signed release APK..."
eas build --platform android --profile preview --non-interactive

# 3. Build signed production AAB package for Google Play Store upload
echo "Compiling production release AAB..."
eas build --platform android --profile production --non-interactive

echo "Android compilation jobs dispatched successfully. Track progress inside Expo Dashboard."
