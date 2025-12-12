# Termux 中国大陆镜像源配置指南

## 推荐的大陆镜像源

以下是适合中国大陆用户的Termux镜像源，网络畅通且更新及时：

### 1. 清华大学镜像源

```
deb https://mirrors.tuna.tsinghua.edu.cn/termux/apt/termux-main/ stable main
```

### 2. 中国科学技术大学镜像源

```
deb https://mirrors.ustc.edu.cn/termux/apt/termux-main/ stable main
```

### 3. 上海交通大学镜像源

```
deb https://mirrors.sjtug.sjtu.edu.cn/termux/apt/termux-main/ stable main
```

### 4. 北京外国语大学镜像源

```
deb https://mirrors.bfsu.edu.cn/termux/apt/termux-main/ stable main
```

### 5. 阿里云镜像源

```
deb https://mirrors.aliyun.com/termux/termux-packages-24/ stable main
```

## 配置步骤

### 步骤1：备份当前镜像源配置

```bash
# 备份当前镜像源配置文件
cp $PREFIX/etc/apt/sources.list $PREFIX/etc/apt/sources.list.bak
```

### 步骤2：修改镜像源配置文件

#### 方法1：使用 nano 编辑器修改

```bash
# 编辑镜像源配置文件
nano $PREFIX/etc/apt/sources.list
```

将当前内容替换为推荐的镜像源，例如使用清华大学镜像源：

```
deb https://mirrors.tuna.tsinghua.edu.cn/termux/apt/termux-main/ stable main
```

保存文件：
- 按 `Ctrl+O` 保存
- 按 `Enter` 确认文件名
- 按 `Ctrl+X` 退出编辑器

#### 方法2：使用 echo 命令直接替换

```bash
# 使用清华大学镜像源
echo "deb https://mirrors.tuna.tsinghua.edu.cn/termux/apt/termux-main/ stable main" > $PREFIX/etc/apt/sources.list
```

### 步骤3：更新包列表

```bash
# 更新包列表
pkg update
```

### 步骤4：修复之前的 Node.js 错误

现在使用新的镜像源修复之前的 Node.js 错误：

```bash
# 修复依赖关系
pkg fix -y

# 强制配置所有未完成配置的包
dpkg --configure -a

# 清理包缓存
apt clean
apt autoclean

# 更新并升级所有包
pkg update && pkg upgrade -y

# 重新安装 Node.js
pkg remove nodejs -y
pkg install nodejs -y
```

### 步骤5：验证修复

```bash
# 检查 Node.js 版本
node --version

# 检查 npm 版本
npm --version

# 安装 python-pip
pkg install python-pip -y
```

## 结合 Node.js 错误修复的完整解决方案

如果您之前遇到了 Node.js 错误，可以按照以下完整步骤修复：

```bash
# 1. 备份当前镜像源配置
cp $PREFIX/etc/apt/sources.list $PREFIX/etc/apt/sources.list.bak

# 2. 使用清华大学镜像源
echo "deb https://mirrors.tuna.tsinghua.edu.cn/termux/apt/termux-main/ stable main" > $PREFIX/etc/apt/sources.list

# 3. 更新包列表
pkg update

# 4. 修复依赖关系
pkg fix -y

# 5. 强制配置所有包
dpkg --configure -a

# 6. 清理包缓存
apt clean
apt autoclean

# 7. 升级所有包
pkg upgrade -y

# 8. 卸载并重新安装 Node.js
pkg remove nodejs -y
pkg install nodejs -y

# 9. 验证修复
node --version
npm --version
pkg install python-pip -y
```

## 如何选择最合适的镜像源

1. **网络环境**：根据您的网络提供商选择最合适的镜像源
2. **更新速度**：清华大学和中国科学技术大学的镜像源更新速度较快
3. **稳定性**：所有推荐的镜像源都比较稳定，可以根据实际使用情况选择

## 常见问题及解决方案

### 问题1：修改镜像源后仍然无法更新

**解决方案**：
- 检查网络连接
- 尝试使用其他镜像源
- 重启 Termux 应用

### 问题2：某些包无法安装

**解决方案**：
- 尝试更新包列表：`pkg update`
- 尝试修复依赖：`pkg fix -y`
- 尝试使用其他镜像源

### 问题3：镜像源配置文件权限错误

**解决方案**：
- 检查文件权限：`ls -la $PREFIX/etc/apt/sources.list`
- 修复文件权限：`chmod 644 $PREFIX/etc/apt/sources.list`

## 恢复默认镜像源

如果您想恢复到默认镜像源，可以使用之前的备份：

```bash
# 恢复备份的镜像源配置
cp $PREFIX/etc/apt/sources.list.bak $PREFIX/etc/apt/sources.list

# 更新包列表
pkg update
```

或者直接使用官方镜像源：

```bash
echo "deb https://packages.termux.dev/apt/termux-main/ stable main" > $PREFIX/etc/apt/sources.list
pkg update
```

## 后续操作

配置好大陆镜像源后，您可以继续按照 `ANDROID_DEPLOYMENT_STEP_BY_STEP.md` 文件中的步骤完成项目部署。

---

**祝您配置顺利！**