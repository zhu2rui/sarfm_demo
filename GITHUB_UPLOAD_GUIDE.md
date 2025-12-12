# GitHub 上传指南

## 项目文件分类

在上传项目到 GitHub 之前，需要了解哪些文件应该上传，哪些文件不应该上传。以下是项目文件的分类：

### 1. 应该上传的文件

#### 后端文件

- **源代码文件**：
  - `backend/app.py`：主应用文件
  - `backend/main.py`：应用入口
  - `backend/*.py`：其他 Python 模块
  - `backend/requirements.txt`：Python 依赖列表
  - `backend/InventoryManagementSystem.spec`：PyInstaller 打包配置

#### 前端文件

- **源代码文件**：
  - `frontend/src/`：前端源代码目录
  - `frontend/index.html`：入口 HTML 文件
  - `frontend/package.json`：Node.js 依赖配置
  - `frontend/vite.config.js`：Vite 配置文件

#### 文档文件

- `README.md`：项目说明文档
- `ANDROID_DEPLOYMENT_GUIDE.md`：安卓部署指南
- `ANDROID_DEPLOYMENT_STEP_BY_STEP.md`：详细分步部署指南
- `SSH_CONNECT_TERMUX.md`：SSH 连接指南
- `TERMUX_NODEJS_ERROR_FIX.md`：Termux Node.js 错误修复指南
- `TERMUX_CHINA_MIRRORS.md`：Termux 大陆镜像源配置指南

#### 测试文件

- `frontend/tests/`：前端测试文件目录

### 2. 不应该上传的文件

#### 生成文件

- `backend/dist/`：PyInstaller 构建后的文件目录
- `backend/frontend_dist/`：前端构建后的文件目录
- `frontend/dist/`：前端构建后的文件目录

#### 虚拟环境和依赖

- `backend/venv/`：Python 虚拟环境
- `frontend/node_modules/`：Node.js 依赖目录

#### 数据库文件

- `backend/instance/inventory.db`：SQLite 数据库文件
- `frontend/instance/inventory.db`：SQLite 数据库文件

#### 临时文件和日志

- `*.log`：日志文件
- `*.bak`：备份文件
- `pyinstaller_*.txt`：PyInstaller 输出日志
- `test-results/`：测试结果目录
- `playwright-report/`：Playwright 测试报告

#### IDE 和编辑器配置文件

- `.vscode/`：VS Code 配置目录
- `.idea/`：JetBrains IDE 配置目录
- `*.swp`：Vim 交换文件

## 配置 .gitignore 文件

建议创建一个 `.gitignore` 文件，用于指定不需要上传到 GitHub 的文件和目录。以下是推荐的 `.gitignore` 内容：

```gitignore
# 虚拟环境
venv/
node_modules/

# 生成文件
dist/
frontend_dist/
build/

# 数据库文件
instance/inventory.db

# 日志文件
*.log
pyinstaller_*.txt

# 临时文件
*.bak
.DS_Store
*.tmp

# 测试相关
playwright-report/
test-results/

# IDE 配置
.vscode/
.idea/
*.swp

# 操作系统文件
Thumbs.db

# 打包配置相关
*.pkg
*.exe
*.toc
*.pyz
*.zip

# 环境变量文件
.env
.env.local
.env.*.local
```

## 创建 .gitignore 文件的步骤

1. 在项目根目录创建 `.gitignore` 文件：

```bash
# 在项目根目录执行
touch .gitignore
```

2. 编辑 `.gitignore` 文件，添加上述内容：

```bash
nano .gitignore
```

## 上传到 GitHub 的步骤

### 步骤1：初始化 Git 仓库

在项目根目录执行：

```bash
git init
```

### 步骤2：添加文件到暂存区

```bash
# 添加所有文件（除了 .gitignore 中指定的文件）
git add .

# 或者只添加特定文件
git add backend/ frontend/ README.md ANDROID_DEPLOYMENT_*.md SSH_CONNECT_TERMUX.md TERMUX_*.md
```

### 步骤3：提交更改

```bash
git commit -m "Initial commit"
```

### 步骤4：连接到 GitHub 仓库

1. 在 GitHub 上创建一个新的仓库
2. 复制仓库的 SSH 或 HTTPS URL
3. 在本地仓库中添加远程仓库：

```bash
# 使用 SSH URL
git remote add origin git@github.com:yourusername/your-repo-name.git

# 或者使用 HTTPS URL
git remote add origin https://github.com/yourusername/your-repo-name.git
```

### 步骤5：推送到 GitHub

```bash
git push -u origin master
# 或者使用 main 分支（GitHub 默认分支名称）
git push -u origin main
```

## 注意事项

1. **定期更新 .gitignore**：如果项目中添加了新的生成文件或临时文件，记得更新 `.gitignore`
2. **不要上传敏感信息**：确保不要上传包含密码、API 密钥等敏感信息的文件
3. **使用合适的分支策略**：建议使用分支进行开发，主分支保持稳定
4. **编写清晰的提交信息**：提交信息应该简洁明了，描述更改的内容
5. **定期推送到 GitHub**：定期推送可以避免数据丢失，同时方便团队协作

## 后续维护

1. **定期更新依赖**：使用 `pip list --outdated` 和 `npm outdated` 检查过时的依赖
2. **修复安全漏洞**：定期检查依赖的安全漏洞，使用 `pip-audit` 或 `npm audit`
3. **更新文档**：项目有新功能或更改时，记得更新相关文档
4. **添加 CI/CD 配置**：可以添加 GitHub Actions 配置，实现自动构建、测试和部署

---

**祝您上传顺利！**