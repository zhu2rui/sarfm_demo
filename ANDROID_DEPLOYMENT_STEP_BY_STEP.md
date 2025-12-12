# 方案1：使用 Termux 直接运行 Python 代码 - 详细分步指南

## 步骤1：在安卓手机上安装 Termux

1. 打开 F-Droid 应用商店（推荐）或 Google Play 商店
2. 搜索 "Termux"
3. 下载并安装 Termux 应用
4. 打开 Termux 应用，等待初始化完成

**注意**：
- 如果从 Google Play 安装，可能需要更新 Termux
- 首次打开可能需要一些时间初始化
- 确保手机有足够的存储空间

## 步骤2：初始化 Termux 环境

打开 Termux 应用，执行以下命令：

```bash
# 更新系统包
pkg update && pkg upgrade -y

# 安装必要的依赖
pkg install python git nodejs openssh -y

# 安装 pip（Python 包管理器）
pkg install python-pip -y

# 升级 pip 到最新版本
pip install --upgrade pip
```

**预期输出**：
- 系统包更新完成
- 依赖安装完成
- pip 升级完成

**常见问题及解决方案**：
- 如果遇到网络问题，可以尝试更换网络或使用国内镜像源
- 如果安装失败，可以尝试再次运行命令

## 步骤3：克隆项目代码

在 Termux 中执行以下命令：

```bash
# 创建工作目录
mkdir -p ~/projects

# 进入工作目录
cd ~/projects

# 克隆项目代码（替换为你的项目仓库地址）
git clone https://github.com/yourusername/sarfm_demo.git
```

**如果没有 Git 仓库**，可以使用以下方法将代码复制到手机：

1. 将项目代码压缩为 ZIP 文件
2. 使用 USB 数据线将 ZIP 文件复制到手机的 Download 文件夹
3. 在 Termux 中执行以下命令：
   ```bash
   # 授予 Termux 访问外部存储的权限
   termux-setup-storage
   
   # 进入工作目录
   cd ~/projects
   
   # 解压 ZIP 文件
   unzip /sdcard/Download/sarfm_demo.zip
   ```

**预期输出**：
- 项目代码克隆或解压完成
- 可以看到 sarfm_demo 目录

## 步骤4：配置后端环境

在 Termux 中执行以下命令：

```bash
# 进入后端目录
cd ~/projects/sarfm_demo/backend

# 安装 Python 依赖
pip install -r requirements.txt

# 创建必要的目录
mkdir -p frontend_dist instance
```

**预期输出**：
- Python 依赖安装完成
- frontend_dist 和 instance 目录创建成功

**常见问题及解决方案**：
- 如果依赖安装失败，可以尝试使用国内镜像源：
  ```bash
  pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
  ```
- 如果遇到权限问题，可以尝试使用 `--user` 参数：
  ```bash
  pip install --user -r requirements.txt
  ```

## 步骤5：构建前端项目

在 Termux 中执行以下命令：

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

**预期输出**：
- Node.js 依赖安装完成
- 前端项目构建成功
- 构建文件复制到后端目录

**常见问题及解决方案**：
- 如果 npm install 失败，可以尝试使用国内镜像源：
  ```bash
  npm config set registry https://registry.npmmirror.com
  npm install
  ```
- 如果构建失败，可以检查 Node.js 版本是否兼容
- 如果遇到内存不足问题，可以尝试关闭其他应用

## 步骤6：启动后端服务

在 Termux 中执行以下命令：

```bash
# 进入后端目录
cd ~/projects/sarfm_demo/backend

# 启动 Flask 应用
python main.py
```

**预期输出**：
```
=== 实验室多端Web库存管理系统 ===
系统正在启动...
数据库文件路径: /data/data/com.termux/files/home/projects/sarfm_demo/backend/instance/inventory.db
访问地址: http://localhost:5000
按 Ctrl+C 停止服务

系统已启动，正在监听请求...
```

**注意**：
- 不要关闭 Termux 应用，否则服务会停止
- 如果需要在后台运行服务，可以使用 `nohup` 命令：
  ```bash
  nohup python main.py > server.log 2>&1 &
  ```

## 步骤7：在浏览器中访问应用

1. **本地访问**：
   - 打开安卓手机上的浏览器（如 Chrome、Firefox 等）
   - 在地址栏输入：`http://localhost:5000`
   - 按回车键访问

2. **在同一局域网内的其他设备上访问**：
   - 查看安卓设备的 IP 地址：
     - 在 Termux 中按 `Ctrl+Z` 暂停服务
     - 执行 `ifconfig` 命令
     - 找到类似于 `wlan0` 的网卡，查看 `inet` 地址（如：192.168.1.100）
     - 执行 `fg` 恢复服务
   - 在其他设备的浏览器中输入：`http://<安卓设备IP>:5000`
   - 按回车键访问

**预期结果**：
- 浏览器中显示登录页面
- 可以使用默认用户名和密码登录（admin/admin123, leader/leader123, member/member123）

## 步骤8：使用应用

1. 在登录页面输入用户名和密码
2. 点击 "登录" 按钮
3. 如果是首次登录，会提示重置密码
4. 登录成功后，可以使用库存管理系统的各种功能

## 步骤9：停止服务

1. 在 Termux 中按 `Ctrl+C` 停止服务
2. 可以看到 "KeyboardInterrupt" 或 "Stopping server..." 等提示
3. 服务已停止

## 常见问题及解决方案

### 问题1：Termux 无法访问外部存储
**解决方案**：
```bash
termux-setup-storage
```
然后在弹出的权限请求对话框中点击 "允许"

### 问题2：端口被占用
**解决方案**：
```bash
# 查看占用 5000 端口的进程
lsof -i :5000

# 或者使用 netstat
netstat -tuln | grep 5000

# 杀死占用端口的进程
kill <进程ID>
```

### 问题3：Python 依赖安装失败
**解决方案**：
```bash
# 升级 pip
pip install --upgrade pip

# 使用国内镜像源
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

### 问题4：Node.js 依赖安装失败
**解决方案**：
```bash
# 清除 npm 缓存
npm cache clean --force

# 使用国内镜像源
npm config set registry https://registry.npmmirror.com

# 重新安装依赖
npm install
```

### 问题5：无法访问应用
**解决方案**：
- 检查服务是否正在运行
- 检查 IP 地址是否正确
- 检查防火墙设置
- 确保设备在同一局域网内

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

## 其他有用的命令

- **查看当前目录**：`pwd`
- **列出目录内容**：`ls -la`
- **切换目录**：`cd <目录路径>`
- **创建目录**：`mkdir <目录名>`
- **删除目录**：`rm -rf <目录名>`
- **复制文件**：`cp <源文件> <目标文件>`
- **移动文件**：`mv <源文件> <目标文件>`
- **查看文件内容**：`cat <文件名>`
- **编辑文件**：`nano <文件名>`（编辑完成后按 `Ctrl+X`，然后按 `Y`，最后按 `Enter` 保存）

---

**恭喜！您已经成功在安卓手机上部署了库存管理系统！**

如果您在部署过程中遇到任何问题，可以参考上述常见问题及解决方案，或者联系项目维护人员寻求帮助。