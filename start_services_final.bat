@echo off
chcp 65001 >nul
echo ================================================================================
echo                           实验室多端Web库存管理系统启动脚本
 echo ================================================================================

echo. 
echo [1/2] 正在启动后端服务...
REM 启动后端Flask服务，监听5000端口，支持局域网访问
start "后端服务 (5000端口)" /d "c:\Users\zA\OneDrive\lyf\sarfm_demo\backend" python app.py

REM 等待后端服务完全启动
echo 等待后端服务启动中...
timeout /t 3 /nobreak >nul

echo [2/2] 正在启动前端服务...
REM 启动前端Vite服务，监听3000端口，支持局域网访问
start "前端服务 (3000端口)" /d "c:\Users\zA\OneDrive\lyf\sarfm_demo\frontend" npm run dev

REM 等待前端服务完全启动
echo 等待前端服务启动中...
timeout /t 3 /nobreak >nul

echo. 
echo ================================================================================
echo 服务启动完成！可以通过以下地址访问：
echo. 
echo 【本地访问】
echo 前端应用：http://localhost:3000
echo 后端API：http://localhost:5000
echo. 
echo 【局域网访问】
echo 前端应用：http://192.168.31.188:3000
echo 后端API：http://192.168.31.188:5000
echo. 
echo 【服务状态】
echo ✓ 后端服务已在 5000 端口开放，支持局域网访问
echo ✓ 前端服务已在 3000 端口开放，支持局域网访问
echo ✓ 前后端已配置代理，前端可自动访问后端API
echo. 
echo 默认管理员账号：
echo 用户名：admin
echo 密码：admin123
echo ================================================================================
echo. 
echo 按任意键关闭此窗口...
pause >nul
