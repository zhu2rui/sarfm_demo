# 安卓手机部署指南

## 方案一：使用 Termux 直接运行 Python 代码

### 1. 在安卓手机上安装 Termux

1. 打开 F-Droid 或 Google Play 商店
2. 搜索 "Termux" 并下载安装
3. 打开 Termux 应用，等待初始化完成

### 2. 初始化 Termux 环境

打开 Termux 应用，执行以下命令：

```bash
# 更新系统包
pkg update && pkg upgrade -y

# 安装必要的依赖
pkg install python git nodejs openssh -y
```

### 3. 克隆项目代码

在 Termux 中执行以下命令：

```bash
# 创建工作目录
mkdir -p ~/projects

# 进入工作目录
cd ~/projects

# 克隆项目代码（如果没有 Git 仓库，可以使用 USB 传输或其他方式将代码复制到手机）
git clone https://github.com/yourusername/sarfm_demo.git

# 或者，如果是本地代码，可以使用以下命令将代码复制到 Termux 中
# 使用 adb 命令从电脑传输文件到手机：
# adb push /path/to/sarfm_demo /sdcard/
# 然后在 Termux 中执行：
# cp -r /sdcard/sarfm_demo ~/projects/
```

### 4. 配置后端环境

```bash
# 进入后端目录
cd ~/projects/sarfm_demo/backend

# 安装 Python 依赖
pip install -r requirements.txt

# 创建必要的目录
mkdir -p frontend_dist instance
```

### 5. 构建前端项目

```bash
# 进入前端目录
cd ~/projects/sarfm_demo/frontend

# 安装 Node.js 依赖
npm install

# 构建前端项目
npm run build

# 将构建后的文件复制到后端目录
cp -r dist/* ../backend/frontend_dist/
```

### 6. 启动后端服务

```bash
# 进入后端目录
cd ~/projects/sarfm_demo/backend

# 启动 Flask 应用
python main.py
```

### 7. 在浏览器中访问应用

1. 查看安卓设备的 IP 地址：
   - 在 Termux 中执行：`ifconfig`
   - 找到类似于 `wlan0` 的网卡，查看 `inet` 地址（如：192.168.1.100）

2. 在安卓设备的浏览器中访问：
   ```
   http://localhost:5000
   ```

3. 或者在同一局域网内的其他设备上访问：
   ```
   http://<安卓设备IP>:5000
   ```

### 8. 后台运行服务（可选）

如果需要在后台运行服务，可以使用 `nohup` 命令：

```bash
# 在后端目录中执行
nohup python main.py > server.log 2>&1 &

# 查看服务是否在运行
ps aux | grep python

# 停止服务
kill <进程ID>
```

## 方案二：使用 PyInstaller 构建独立可执行文件

### 1. 在 Windows 机器上构建后端应用

```bash
# 进入后端目录
cd sarfm_demo/backend

# 执行构建脚本
python build_and_copy.py
```

构建完成后，可执行文件位于 `dist/InventoryManagementSystem/InventoryManagementSystem.exe`

### 2. 将构建后的文件复制到安卓设备

- 使用 USB 数据线将 `dist/InventoryManagementSystem` 目录复制到安卓设备的 Download 文件夹
- 或者使用云存储服务（如 Google Drive、Dropbox）传输文件

### 3. 在安卓设备上安装 Wine

```bash
# 安装 Wine
pkg install wine -y
```

### 4. 使用 Wine 运行可执行文件

```bash
# 进入应用目录
cd ~/Downloads/InventoryManagementSystem

# 运行可执行文件
wine InventoryManagementSystem.exe
```

### 5. 在浏览器中访问应用

同方案一的步骤 7

## 方案三：使用 Nginx + Gunicorn 部署

### 1. 安装必要的依赖

```bash
# 安装 Nginx
pkg install nginx -y

# 安装 Gunicorn
pip install gunicorn
```

### 2. 配置 Nginx

```bash
# 创建 Nginx 配置文件
nano ~/nginx.conf
```

将以下内容粘贴到配置文件中：

```nginx
worker_processes  1;
events {
    worker_connections  1024;
}
http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile        on;
    keepalive_timeout  65;
    server {
        listen       80;
        server_name  localhost;
        location / {
            proxy_pass http://127.0.0.1:5000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
        error_page   500 502 503 504  /50x.html;
        location = /50x.html {
            root   html;
        }
    }
}
```

保存并退出编辑器（按 `Ctrl+X`，然后按 `Y`，最后按 `Enter`）

### 3. 启动 Nginx

```bash
# 启动 Nginx
nginx -c ~/nginx.conf

# 停止 Nginx（如果需要）
nginx -s stop -c ~/nginx.conf
```

### 4. 使用 Gunicorn 启动 Flask 应用

```bash
# 进入后端目录
cd ~/projects/sarfm_demo/backend

# 启动 Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app

# 或者后台运行
nohup gunicorn -w 4 -b 0.0.0.0:5000 app:app > gunicorn.log 2>&1 &
```

### 5. 在浏览器中访问应用

同方案一的步骤 7

## 常见问题及解决方案

### 1. Termux 无法访问外部存储

```bash
# 授予 Termux 访问外部存储的权限
termux-setup-storage
```

然后在弹出的权限请求对话框中点击 "允许"

### 2. 端口被占用

```bash
# 查看占用 5000 端口的进程
lsof -i :5000

# 或者使用 netstat
netstat -tuln | grep 5000

# 杀死占用端口的进程
kill <进程ID>
```

### 3. Python 依赖安装失败

```bash
# 升级 pip
pip install --upgrade pip

# 使用国内镜像源安装依赖
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### 4. Node.js 依赖安装失败

```bash
# 清除 npm 缓存
npm cache clean --force

# 使用国内镜像源
npm config set registry https://registry.npmmirror.com

# 重新安装依赖
npm install
```

## 访问说明

- **本地访问**：在安卓设备上的浏览器中输入 `http://localhost:5000`
- **局域网访问**：在同一网络的其他设备上输入 `http://<安卓设备IP>:5000`
- **外部访问**：需要配置端口映射或使用内网穿透工具（如 frp、ngrok 等）

## 注意事项

1. **性能优化**：
   - 安卓设备的性能有限，建议减少并发连接数
   - 可以考虑使用轻量级的 Web 服务器，如 uWSGI 或 Tornado

2. **数据安全**：
   - SQLite 数据库文件位于 `backend/instance/inventory.db`，建议定期备份
   - 生产环境建议使用 HTTPS 加密传输数据

3. **权限管理**：
   - 确保应用程序有足够的权限访问文件系统
   - 定期更新依赖库，修复安全漏洞

4. **电池消耗**：
   - 长时间运行后台服务会消耗较多电池
   - 建议在不使用时关闭服务，或使用电源管理应用优化

## 更新项目代码

```bash
# 进入项目目录
cd ~/projects/sarfm_demo

# 拉取最新代码
git pull

# 重新安装依赖和构建项目
cd backend
pip install -r requirements.txt

cd ../frontend
npm install
npm run build
cp -r dist/* ../backend/frontend_dist/

# 重启服务
# 如果是前台运行，按 Ctrl+C 停止，然后重新启动
# 如果是后台运行，先杀死进程，然后重新启动
```

## 联系方式

如果在部署过程中遇到问题，可以通过以下方式寻求帮助：
- 查看项目的 README.md 文件
- 查阅相关技术文档
- 联系项目维护人员

---

**部署完成后，您可以在浏览器中访问应用，开始使用库存管理系统！**