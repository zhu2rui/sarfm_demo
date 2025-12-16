# 在Termux Proot Debian容器中部署实验室多端Web库存管理系统

## 前提条件

1. 已安装Termux应用（可从F-Droid或Google Play下载）
2. 已在Termux中安装proot-distro工具

## 部署步骤

### 1. 在Termux中安装Proot Debian容器

```bash
# 更新Termux包
pkg update && pkg upgrade -y

# 安装proot-distro工具
pkg install proot-distro -y

# 安装Debian容器
proot-distro install debian
```

### 2. 启动并进入Proot Debian容器

```bash
# 启动并进入Debian容器
proot-distro login debian
```

### 3. 更新系统并安装必要依赖

在Proot Debian容器中执行以下命令：

```bash
# 更新系统包
apt update && apt upgrade -y

# 安装必要的系统依赖
apt install -y git python3 python3-pip python3-venv nodejs npm nginx curl

# 验证安装
python3 --version
pip3 --version
node --version
npm --version
```

### 4. 克隆或复制项目到容器中

#### 方法1：通过git克隆（推荐）

```bash
# 克隆项目到当前目录
git clone https://github.com/yourusername/lab-inventory-system.git
cd lab-inventory-system
```

#### 方法2：从本地复制（如果项目已在本地）

在Termux中使用`scp`或其他方式将项目文件复制到容器中。

### 5. 部署后端服务

```bash
# 进入后端目录
cd backend

# 创建虚拟环境
python3 -m venv venv

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 退出虚拟环境
deactivate
```

#### 配置后端服务为系统服务（可选，推荐）

创建systemd服务文件，以便在系统启动时自动运行后端服务：

```bash
# 创建服务文件
nano /etc/systemd/system/lab-inventory-backend.service
```

在文件中添加以下内容（根据实际路径调整）：

```ini
[Unit]
Description=Lab Inventory System Backend
After=network.target

[Service]
User=root
WorkingDirectory=/root/lab-inventory-system/backend
ExecStart=/root/lab-inventory-system/backend/venv/bin/python app.py
Restart=always

[Install]
WantedBy=multi-user.target
```

启动并启用服务：

```bash
systemctl daemon-reload
systemctl start lab-inventory-backend
systemctl enable lab-inventory-backend

# 检查服务状态
systemctl status lab-inventory-backend
```

### 6. 部署前端服务

```bash
# 进入前端目录
cd ../frontend

# 安装依赖
npm install

# 构建生产版本
npm run build

# 构建完成后，静态文件将生成在 dist 目录中
```

### 7. 配置Nginx代理

```bash
# 创建Nginx配置文件
nano /etc/nginx/sites-available/lab-inventory
```

在文件中添加以下内容（根据实际路径调整）：

```nginx
server {
    listen 80;
    server_name localhost;

    # 前端静态文件
    location / {
        root /root/lab-inventory-system/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 后端API代理
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用配置并重启Nginx：

```bash
# 启用配置
ln -s /etc/nginx/sites-available/lab-inventory /etc/nginx/sites-enabled/

# 移除默认的Nginx配置（如果存在）
rm -f /etc/nginx/sites-enabled/default

# 测试Nginx配置
nginx -t

# 重启Nginx
systemctl restart nginx
systemctl enable nginx

# 检查Nginx状态
systemctl status nginx
```

### 8. 访问系统

现在，你可以通过以下方式访问系统：

- Web界面：http://localhost
- 后端API：http://localhost/api

### 9. 初始登录

使用系统提供的初始账户登录：
- 用户名：admin
- 密码：admin123

## 常见问题及解决方案

### 1. 后端服务无法启动

- 检查端口是否被占用：`lsof -i :5000`
- 查看服务日志：`journalctl -u lab-inventory-backend -f`
- 确保所有依赖已正确安装：`pip install -r requirements.txt`

### 2. 前端页面无法访问

- 检查Nginx配置是否正确：`nginx -t`
- 查看Nginx日志：`tail -f /var/log/nginx/error.log`
- 确保前端构建成功：`npm run build`

### 3. 数据库问题

- 检查数据库文件是否存在：`ls -la instance/inventory.db`
- 确保数据库目录可写：`chmod 777 instance/`

### 4. 权限问题

- 确保服务运行用户对项目目录有读写权限
- 检查文件和目录权限：`chmod -R 755 /path/to/project`

### 5. 端口访问问题

- 检查防火墙设置（如果有）：`ufw status`
- 确保端口已开放：`ufw allow 80` 和 `ufw allow 5000`

## 维护与更新

### 更新项目

```bash
# 进入项目目录
cd /root/lab-inventory-system

# 拉取最新代码
git pull

# 更新后端依赖
cd backend
source venv/bin/activate
pip install -r requirements.txt
deactivate

# 重启后端服务
systemctl restart lab-inventory-backend

# 更新前端
cd ../frontend
npm install
npm run build

# 重启Nginx
systemctl restart nginx
```

### 数据库备份

```bash
# 备份数据库
cp instance/inventory.db inventory.db.backup.$(date +%Y%m%d)

# 恢复数据库
cp inventory.db.backup.YYYYMMDD instance/inventory.db
```

## 技术支持

如有问题，请联系系统管理员或查看项目文档。

## 额外提示

1. 建议在生产环境中修改初始管理员密码
2. 建议在生产环境中配置强JWT密钥
3. 生产环境中建议使用更安全的数据库（如MySQL、PostgreSQL）
4. 可以使用PM2或其他进程管理工具来管理Node.js应用（如果需要）
5. 可以配置HTTPS来提高安全性（使用Let's Encrypt等工具）

## Termux特定说明

1. 在Termux中，Proot容器默认以root用户运行
2. Termux中的Proot容器不支持所有系统调用，某些功能可能受限
3. 建议在Termux中使用固定端口映射，以便外部设备可以访问
4. 如果需要从外部访问，可以使用ngrok或其他端口转发工具

## 启动和停止服务

### 启动服务

```bash
# 启动后端服务
systemctl start lab-inventory-backend

# 启动Nginx
systemctl start nginx
```

### 停止服务

```bash
# 停止后端服务
systemctl stop lab-inventory-backend

# 停止Nginx
systemctl stop nginx
```

### 重启服务

```bash
# 重启后端服务
systemctl restart lab-inventory-backend

# 重启Nginx
systemctl restart nginx
```

## 查看日志

### 后端服务日志

```bash
journalctl -u lab-inventory-backend -f
```

### Nginx日志

```bash
# 访问日志
tail -f /var/log/nginx/access.log

# 错误日志
tail -f /var/log/nginx/error.log
```

## 卸载应用

```bash
# 停止服务
systemctl stop lab-inventory-backend
systemctl stop nginx

# 禁用服务
systemctl disable lab-inventory-backend
systemctl disable nginx

# 删除服务文件
rm -f /etc/systemd/system/lab-inventory-backend.service
rm -f /etc/nginx/sites-enabled/lab-inventory

# 删除项目文件
rm -rf /root/lab-inventory-system

# 重新加载systemd
systemctl daemon-reload
```

---

以上是在Termux Proot Debian容器中部署实验室多端Web库存管理系统的详细步骤。如果在部署过程中遇到问题，请参考常见问题及解决方案，或联系技术支持。