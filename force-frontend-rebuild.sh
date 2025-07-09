#!/bin/bash

# Force Frontend Rebuild with Correct API URLs
# Run this as your deployment user (NOT root)

set -e

echo "🔧 FORCE FRONTEND API URL FIX"
echo "============================="

PROJECT_DIR="/home/deployuser/Malikli-son---Preview"
FRONTEND_DIR="$PROJECT_DIR/frontend"

if [[ $EUID -eq 0 ]]; then
   echo "❌ Do NOT run this script as root!"
   echo "   Run as deployment user: ./force-frontend-rebuild.sh"
   exit 1
fi

cd "$FRONTEND_DIR"
echo "📁 Working directory: $(pwd)"

echo ""
echo "🛑 Step 1: Stop Frontend Process"
echo "==============================="

# Kill any existing Next.js processes
pkill -f "next" || true
pkill -f "node.*3000" || true
PIDS=$(lsof -ti:3000 2>/dev/null || true)
if [[ -n "$PIDS" ]]; then
    echo "🛑 Killing processes on port 3000: $PIDS"
    echo $PIDS | xargs kill -9
fi
sleep 3

echo ""
echo "📝 Step 2: Fix Environment Variables"
echo "==================================="

# Create correct environment files
cat > .env.production << 'EOF'
NEXT_PUBLIC_API_URL=https://malikli1992.com/api/v1
NEXT_PUBLIC_SITE_URL=https://malikli1992.com
NODE_ENV=production
EOF

cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://malikli1992.com/api/v1
NEXT_PUBLIC_SITE_URL=https://malikli1992.com
EOF

cat > .env << 'EOF'
NEXT_PUBLIC_API_URL=https://malikli1992.com/api/v1
NEXT_PUBLIC_SITE_URL=https://malikli1992.com
NODE_ENV=production
EOF

echo "✅ Environment files created:"
echo "📄 .env.production:"
cat .env.production
echo ""

echo ""
echo "🧹 Step 3: Deep Clean Build"
echo "=========================="

# Remove all build artifacts and caches
rm -rf .next
rm -rf out
rm -rf node_modules/.cache
rm -rf .swc
rm -rf node_modules

# Clean npm cache
npm cache clean --force

echo "✅ Build artifacts cleaned"

echo ""
echo "📦 Step 4: Fresh Dependency Install"
echo "=================================="

npm install

echo ""
echo "🏗️  Step 5: Build with Explicit Environment"
echo "==========================================="

# Set environment variables explicitly during build
export NODE_ENV=production
export NEXT_PUBLIC_API_URL=https://malikli1992.com/api/v1
export NEXT_PUBLIC_SITE_URL=https://malikli1992.com

echo "🔍 Environment variables for build:"
echo "NODE_ENV=$NODE_ENV"
echo "NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL"
echo "NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL"

# Build the application
npm run build

if [[ $? -ne 0 ]]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build completed successfully"

echo ""
echo "🚀 Step 6: Start Frontend with Environment"
echo "========================================="

# Start with explicit environment variables
NODE_ENV=production NEXT_PUBLIC_API_URL=https://malikli1992.com/api/v1 nohup npm run start > frontend.log 2>&1 &
FRONTEND_PID=$!

echo "Frontend started with PID: $FRONTEND_PID"

# Wait and check
sleep 10

if ps -p $FRONTEND_PID > /dev/null; then
    echo "✅ Frontend process is running"
    
    # Test if responding
    if curl -s http://127.0.0.1:3000 > /dev/null; then
        echo "✅ Frontend is responding on port 3000"
    else
        echo "⚠️  Frontend not responding yet, checking logs..."
        tail -10 frontend.log
    fi
else
    echo "❌ Frontend process died, checking logs..."
    tail -20 frontend.log
    exit 1
fi

echo ""
echo "🧪 Step 7: Verify API URLs in Build"
echo "=================================="

# Check if the built files contain the correct API URL
if grep -r "localhost:8000" .next/ 2>/dev/null; then
    echo "❌ Found localhost:8000 in built files!"
    echo "This means the environment variables didn't take effect during build"
else
    echo "✅ No localhost:8000 found in built files"
fi

if grep -r "malikli1992.com/api/v1" .next/ 2>/dev/null | head -3; then
    echo "✅ Found production API URLs in built files"
else
    echo "⚠️  Could not verify production API URLs in built files"
fi

echo ""
echo "🎉 FRONTEND API URL FIX COMPLETE!"  
echo "================================"
echo ""
echo "✅ Frontend rebuilt with production API URLs"
echo "✅ Frontend started with explicit environment variables"
echo ""
echo "🔗 Test your site:"
echo "   https://malikli1992.com"
echo ""
echo "🧪 Open browser console and check for API calls:"
echo "   ✅ Should see: https://malikli1992.com/api/v1/..."
echo "   ❌ Should NOT see: http://localhost:8000/api/v1/..."
echo ""
echo "📄 Frontend log: $FRONTEND_DIR/frontend.log"
echo ""
echo "🔧 If still seeing localhost:8000, the issue is in the code itself"
echo "   Check browser Network tab to see actual API calls"
