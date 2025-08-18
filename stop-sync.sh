#!/bin/bash

# Script to stop Mutagen sync and Docker container

echo "🛑 Stopping agi-engine development environment..."

# Stop Mutagen sync
echo "📡 Stopping Mutagen sync..."
mutagen sync terminate agi-engine-sync 2>/dev/null || true

# Wait a moment for sync to stop
sleep 2

# Stop Docker container
echo "🐳 Stopping Docker container..."
docker compose down

echo "✅ Environment stopped!"
echo ""
echo "📋 To restart: ./start-sync.sh"
