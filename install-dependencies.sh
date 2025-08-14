#!/bin/bash

echo "🔧 Installing AGI Engine dependencies..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 14 ]; then
    echo "❌ Node.js version 14 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Remove node_modules and package-lock.json if they exist
if [ -d "node_modules" ]; then
    echo "🧹 Cleaning existing node_modules..."
    rm -rf node_modules
fi

if [ -f "package-lock.json" ]; then
    echo "🧹 Removing package-lock.json..."
    rm package-lock.json
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check for any missing dependencies
echo "🔍 Checking for missing dependencies..."
npm ls --depth=0

echo "✅ Installation complete!"
echo ""
echo "To run the application:"
echo "  npm run dev"
echo ""
echo "To test the installation:"
echo "  node tests/test-brain.js"

# Optional: install GUI deps for headful Puppeteer on headless servers (e.g., RunPod)
if [ "${INSTALL_GUI_DEPS}" = "true" ]; then
  echo "🖥️  Installing GUI dependencies (Xvfb, x11vnc, fluxbox, noVNC) ..."
  if command -v apt-get >/dev/null 2>&1; then
    set -e
    sudo apt-get update -y
    sudo apt-get install -y xvfb x11vnc fluxbox novnc websockify || sudo apt-get install -y xvfb x11vnc fluxbox
    echo "✅ GUI packages installed."
    echo "You can run with: HEADLESS=false node tests/test-runpod.js"
    echo "Optional VNC: DISPLAY=:99 fluxbox &; x11vnc -display :99 -forever -nopw -shared -rfbport 5900 &; websockify --web=/usr/share/novnc/ 6080 localhost:5900 &"
  else
    echo "ℹ️ apt-get not found. Skipping GUI dependencies installation."
  fi
fi
