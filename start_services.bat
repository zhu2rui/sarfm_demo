@echo off

REM 启动后端服务
echo Starting backend service...
start "Backend Server" /d "c:\Users\zA\OneDrive\lyf\sarfm_demo\backend" python app.py

REM 等待后端服务启动
timeout /t 3 /nobreak >nul

REM 启动前端服务
echo Starting frontend service...
start "Frontend Server" /d "c:\Users\zA\OneDrive\lyf\sarfm_demo\frontend" npm run dev

echo Services started successfully!
echo Frontend: http://localhost:3000
echo Backend: http://localhost:5000
echo.
echo Press any key to exit...
pause >nul
