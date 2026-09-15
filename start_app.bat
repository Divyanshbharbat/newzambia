@echo off
:: Navigate to project root
cd /d "d:\zambianew\Zambia_Project"

:: Start Backend
echo Starting Backend...
cd backend
start /min "Backend Server" cmd /c "npm start"
cd ..

:: Start Frontend
echo Starting Frontend...
cd frontend
start /min "Frontend Server" cmd /c "npm run dev"
cd ..

echo System is starting up... Both servers running in background.
timeout /t 5
