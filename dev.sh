#!/bin/bash

echo "🚀 Starting Shaya SMS Tool Development Environment..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local not found. Convex will create it automatically."
fi

echo "🔥 Starting both frontend and backend servers..."
echo "📱 Frontend will be available at: http://localhost:3000"
echo "🔧 Backend URL will be shown in the terminal"
echo ""

# Start both servers
npm run dev 