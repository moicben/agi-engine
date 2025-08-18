#!/bin/bash

# Script to start Docker container and Mutagen sync for agi-engine project

echo "🚀 Starting agi-engine development environment..."

# Check if Mutagen is installed
if ! command -v mutagen &> /dev/null; then
    echo "❌ Mutagen is not installed. Please install it first:"
    echo "   brew install mutagen-io/mutagen/mutagen"
    exit 1
fi

# Stop any existing sync sessions
echo "🔄 Stopping existing sync sessions..."
mutagen sync terminate agi-engine-sync 2>/dev/null || true

# Start Docker container
echo "🐳 Starting Docker container..."
docker compose up -d

# Wait for container to be ready
echo "⏳ Waiting for container to be ready..."
sleep 10

# Check if container is running
if ! docker ps | grep -q kasm-desktop; then
    echo "❌ Container failed to start. Check logs with: docker compose logs"
    exit 1
fi

# Start Mutagen sync
echo "📡 Starting Mutagen sync..."
mutagen sync create \
    --name=agi-engine-sync \
    --label=project=agi-engine \
    --sync-mode=two-way-resolved \
    --ignore-vcs \
    --ignore="kasm-data/" \
    --ignore="kasm-home/" \
    --ignore="kasm-home/project/" \
    --ignore=".git/" \
    --ignore="*.log" \
    --ignore="*.tmp" \
    --ignore="dist/" \
    --ignore="build/" \
    --ignore=".next/" \
    --ignore="*.zip" \
    --ignore="*.tar.gz" \
    --ignore="*.iso" \
    --ignore="*.img" \
    . \
    docker://kasm-desktop/home/kasm-user/project

# Wait for sync to establish
echo "⏳ Waiting for sync to establish..."
sleep 5

# Show sync status
echo "📊 Sync status:"
mutagen sync list

echo "✅ Setup complete!"
echo "🌐 Access your desktop at: https://localhost:6901"
echo "🔑 Password: secret"
echo "📁 Your project is synced to: /home/kasm-user/project"
echo ""
echo "📋 Useful commands:"
echo "   mutagen sync list          # Show sync status"
echo "   mutagen sync flush         # Force sync"
echo "   mutagen sync terminate     # Stop sync"
echo "   docker compose down        # Stop container"
