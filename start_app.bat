@echo off
echo Starting Frontend and Backend servers...

start "Frontend" cmd /c "cd frontend && npm run dev"
start "Backend" cmd /c "cd backend && call .\venv\Scripts\activate && python manage.py runserver"