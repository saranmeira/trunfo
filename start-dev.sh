#!/bin/bash
# Development startup script for Trump Card Game

echo "🎮 Starting Trump Card Game Development Environment..."
echo ""

# Function to cleanup processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $(jobs -p) 2>/dev/null
    exit 0
}

# Function to clear ports
clear_ports() {
    echo "🧹 Clearing ports 8080, 4000, 9000, 4400, 4500..."
    
    # Kill processes on required ports
    for port in 8080 4000 9000 4400 4500; do
        if lsof -ti :$port >/dev/null 2>&1; then
            echo "  ⚡ Killing process on port $port"
            lsof -ti :$port | xargs kill -9 2>/dev/null || true
        fi
    done
    
    # Also kill any firebase/vite processes
    pkill -f "firebase|vite" 2>/dev/null || true
    
    echo "✅ All ports cleared"
    echo ""
}

# Set up cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

# Clear ports before starting
clear_ports

# Start Firebase emulators in background
echo "🔥 Starting Firebase Database Emulator..."
firebase emulators:start --only database &
FIREBASE_PID=$!

# Wait for Firebase emulator to be ready
echo "⏳ Waiting for Firebase emulator to start..."
sleep 5

# Check if Firebase emulator UI is running (indicates Firebase is ready)
if ! curl -s http://localhost:4000 > /dev/null 2>&1; then
    echo "❌ Firebase emulator failed to start"
    exit 1
fi

echo "✅ Firebase Database Emulator ready on http://localhost:4000"
echo "✅ Database running on localhost:9000"
echo ""

# Start React development server
echo "⚛️  Starting React Development Server..."
npm run dev &
VITE_PID=$!

echo ""
echo "🎯 Services Started Successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎮 Trump Card Game:     http://localhost:8080"
echo "🔥 Firebase Emulator:   http://localhost:4000"
echo "📊 Database:            localhost:9000"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for processes
wait