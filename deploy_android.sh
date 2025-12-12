#!/bin/bash

# 安卓部署脚本
# 用于在 Termux 环境中快速部署项目

echo "========================================"
echo "  实验室库存管理系统 - 安卓部署脚本  "
echo "========================================"
echo ""

# 检查是否在 Termux 环境中运行
if [[ ! -d "$HOME/.termux" ]]; then
    echo "错误：此脚本只能在 Termux 环境中运行！"
    echo "请先在安卓设备上安装 Termux，然后再运行此脚本。"
    exit 1
fi

echo "1. 更新系统包..."
pkg update -y
pkg upgrade -y

echo ""
echo "2. 安装必要的依赖..."
pkg install python git nodejs openssh -y

# 安装 Python 虚拟环境（可选，但推荐）
pkg install python-pip -y
pip install --upgrade pip

# 创建项目目录
echo ""
echo "3. 创建项目目录..."
mkdir -p ~/projects

# 检查项目是否已经存在
if [[ -d "$HOME/projects/sarfm_demo" ]]; then
    echo "   项目目录已存在，将更新代码..."
    cd ~/projects/sarfm_demo
    git pull
else
    echo "   克隆项目代码..."
    cd ~/projects
    git clone https://github.com/yourusername/sarfm_demo.git
fi

# 进入项目目录
cd ~/projects/sarfm_demo

echo ""
echo "4. 配置后端环境..."
cd backend

# 安装 Python 依赖
pip install -r requirements.txt

# 创建必要的目录
mkdir -p frontend_dist instance

echo ""
echo "5. 构建前端项目..."
cd ../frontend

# 安装 Node.js 依赖
npm install

# 构建前端项目
npm run build

# 将构建后的文件复制到后端目录
cp -r dist/* ../backend/frontend_dist/

echo ""
echo "========================================"
echo "  部署完成！  "
echo "========================================"
echo ""
echo "接下来，您可以使用以下命令启动服务："
echo "  cd ~/projects/sarfm_demo/backend"
echo "  python main.py"
echo ""
echo "服务启动后，您可以在浏览器中访问："
echo "  http://localhost:5000"
echo ""
echo "或者在同一局域网内的其他设备上访问："
echo "  http://<安卓设备IP>:5000"
echo ""
echo "要查看安卓设备的 IP 地址，请在 Termux 中执行："
echo "  ifconfig"
echo ""
echo "========================================"
echo "  祝您使用愉快！  "
echo "========================================"