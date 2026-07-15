@echo off
REM Start Locations Map Development Servers (Frontend + Backend)

echo.
echo ===================================
echo 🚀 Starting Locations Map App
echo ===================================
echo.

REM Start backend server in a new window
echo Starting backend server on port 3000...
start "Backend Server" cmd /k "cd server && npm start"

REM Wait a moment for backend to start
timeout /t 2 /nobreak

REM Start frontend in a new window
echo Starting React frontend on port 5173...
start "Frontend Server" cmd /k "npm run dev"

echo.
echo ✅ Both servers are starting!
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3000
echo.
echo Both windows will stay open. Close them to stop the servers.
echo.
