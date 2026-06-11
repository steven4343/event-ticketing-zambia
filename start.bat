@echo off
cd /d "%~dp0"

echo Starting EventHub Zambia...

:: Start backend
echo [1/2] Starting backend on port 5000...
start "Backend" cmd /c "cd backend && node server.js"

:: Wait a moment for DB connection
timeout /t 3 /nobreak >nul

:: Start frontend
echo [2/2] Starting frontend on port 3000...
start "Frontend" cmd /c "cd frontend && npm run dev"

echo.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Close the terminal windows to stop both servers.
