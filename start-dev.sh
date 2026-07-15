#!/bin/bash

echo "🚀 Starting Locations Map (Frontend + Backend)..."
echo ""

# Start backend server
echo "📦 Starting backend server on port 3000..."
cd server
npm start &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start frontend
echo "⚛️  Starting React frontend on port 5173..."
cd ..
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Both servers are running!"
echo ""
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers..."
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
