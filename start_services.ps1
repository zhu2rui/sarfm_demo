# 启动后端服务
Write-Host "Starting backend service..."
Start-Process -FilePath "python" -ArgumentList "app.py" -WorkingDirectory "c:\Users\zA\OneDrive\lyf\sarfm_demo\backend" -WindowStyle Normal

# 等待后端服务启动
Start-Sleep -Seconds 3

# 启动前端服务
Write-Host "Starting frontend service..."
Start-Process -FilePath "npm" -ArgumentList "run dev" -WorkingDirectory "c:\Users\zA\OneDrive\lyf\sarfm_demo\frontend" -WindowStyle Normal

Write-Host "Services started successfully!"
Write-Host "Frontend: http://localhost:3000"
Write-Host "Backend: http://localhost:5000"
