# 使用 Trae 将项目上传到 GitHub

## 前提条件

1. 已创建 `.gitignore` 文件（已完成）
2. 在 GitHub 上已创建一个新的仓库（空仓库）
3. 已配置 GitHub 认证（SSH 密钥或用户名密码）

## 步骤1：打开 Trae IDE 并加载项目

1. 打开 Trae IDE
2. 点击 "Open Project" 或 "Load Project"
3. 选择项目根目录 `c:\Users\zA\OneDrive\lyf\sarfm_demo`
4. 等待项目加载完成

## 步骤2：初始化 Git 仓库

### 方法1：使用 Trae 界面

1. 在 Trae 左侧边栏找到 "Source Control" 或 "Git" 面板
2. 点击 "Initialize Repository" 按钮
3. 选择项目根目录作为 Git 仓库位置
4. 点击 "Initialize" 确认

### 方法2：使用 Trae 终端

1. 在 Trae 中打开终端（Terminal）
2. 确保当前目录是项目根目录
3. 执行命令：
   ```bash
   git init
   ```

## 步骤3：添加文件到暂存区

### 方法1：使用 Trae 界面

1. 在 "Source Control" 面板中，您会看到所有未跟踪的文件
2. 点击 "+" 按钮或 "Stage All Changes" 按钮，将所有文件添加到暂存区
   - 注意：`.gitignore` 文件会自动排除不需要的文件

### 方法2：使用 Trae 终端

```bash
# 添加所有文件到暂存区
git add .

# 或只添加特定文件
git add backend/ frontend/ README.md *.md
```

## 步骤4：提交更改

### 方法1：使用 Trae 界面

1. 在 "Source Control" 面板中，找到 "Message" 输入框
2. 输入提交信息，例如：`Initial commit - 添加项目基本结构和文档`
3. 点击 "Commit" 按钮

### 方法2：使用 Trae 终端

```bash
git commit -m "Initial commit - 添加项目基本结构和文档"
```

## 步骤5：连接到 GitHub 仓库

### 方法1：使用 Trae 界面

1. 在 "Source Control" 面板中，点击 "Publish to GitHub" 或 "Push to Remote"
2. 选择 "GitHub" 作为远程仓库类型
3. 输入 GitHub 仓库 URL（例如：`git@github.com:yourusername/your-repo-name.git` 或 `https://github.com/yourusername/your-repo-name.git`）
4. 设置远程仓库名称为 "origin"
5. 点击 "Add Remote" 或 "Connect"

### 方法2：使用 Trae 终端

```bash
# 添加远程仓库
# 使用 SSH URL（推荐）
git remote add origin git@github.com:yourusername/your-repo-name.git

# 或使用 HTTPS URL
git remote add origin https://github.com/yourusername/your-repo-name.git
```

## 步骤6：推送代码到 GitHub

### 方法1：使用 Trae 界面

1. 在 "Source Control" 面板中，点击 "Push" 按钮
2. 选择要推送的分支（默认是 "master" 或 "main"）
3. 等待推送完成

### 方法2：使用 Trae 终端

```bash
# 推送代码到 GitHub
# 如果是 master 分支
git push -u origin master

# 如果是 main 分支（GitHub 默认分支）
git push -u origin main
```

## 步骤7：验证上传成功

### 方法1：使用 GitHub 网站

1. 打开 GitHub 仓库页面
2. 检查是否看到您的项目文件和提交记录

### 方法2：使用 Trae 终端

```bash
# 查看远程仓库信息
git remote -v

# 查看分支状态
git branch -v

# 查看提交记录
git log --oneline
```

## 常见问题及解决方案

### 问题1：推送时提示认证失败

**解决方案**：
- 确保 GitHub 认证已正确配置
- 如果使用 HTTPS URL，检查用户名和密码是否正确
- 如果使用 SSH URL，检查 SSH 密钥是否已添加到 GitHub 账户

### 问题2：推送时提示 "fatal: remote origin already exists"

**解决方案**：
- 检查远程仓库是否已存在
- 如果需要更改远程仓库 URL，使用：
  ```bash
  git remote set-url origin <新的仓库URL>
  ```

### 问题3：某些文件没有被添加到暂存区

**解决方案**：
- 检查 `.gitignore` 文件，确保没有误排除需要上传的文件
- 检查文件是否已被添加到 Git 跟踪：
  ```bash
  git status
  ```

## 后续操作

1. **定期提交更改**：开发过程中定期提交更改
2. **创建分支**：为新功能创建单独的分支
3. **拉取更新**：定期从 GitHub 拉取最新代码
4. **创建 PR**：使用 GitHub Pull Request 进行代码审查

## 注意事项

1. 确保只上传功能文件，`.gitignore` 已配置好，会自动排除不需要的文件
2. 提交信息要清晰、简洁，描述更改的内容
3. 首次推送时使用 `-u` 参数设置上游分支，后续推送可以简化为 `git push`
4. 定期备份代码，确保 GitHub 上的代码是最新的

---

**祝您使用 Trae 上传项目顺利！**