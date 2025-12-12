# 如何使用 SSH 连接 Termux

## 简介

使用 SSH 连接 Termux 可以让您从电脑上方便地操作手机上的 Termux 环境，无需在手机上输入复杂命令。本指南将详细说明如何在 Termux 中安装和配置 SSH 服务器，以及如何从不同操作系统的电脑上连接。

## 步骤1：在 Termux 中安装 SSH 服务器

打开 Termux 应用，执行以下命令安装 SSH 服务器：

```bash
# 更新系统包
pkg update && pkg upgrade -y

# 安装 SSH 服务器 (openssh)
pkg install openssh -y
```

**预期输出**：
```
...
Installing openssh (9.6p1-0)...
...
```

## 步骤2：设置 SSH 访问密码

为了能够通过 SSH 连接 Termux，您需要为 Termux 用户设置一个密码：

```bash
# 设置密码
passwd
```

执行命令后，系统会提示您输入新密码并确认：

```
New password:
Retype new password:
New password was successfully set.
```

**注意**：
- 输入密码时不会显示任何字符，这是正常现象
- 请设置一个强密码，包含大小写字母、数字和特殊字符
- 请记住这个密码，连接 SSH 时需要使用

## 步骤3：启动 SSH 服务器

执行以下命令启动 SSH 服务器：

```bash
# 启动 SSH 服务器
sshd
```

**注意**：
- 第一次启动 SSH 服务器时，系统会生成 SSH 密钥，可能需要一些时间
- 命令执行后没有输出，这是正常现象
- SSH 服务器默认监听 8022 端口（不是标准的 22 端口）

## 步骤4：获取 Termux 的 IP 地址

您需要知道 Termux 的 IP 地址才能从电脑上连接。执行以下命令获取 IP 地址：

```bash
# 查看 IP 地址
ifconfig
```

在输出中找到类似于 `wlan0` 的网卡，查看 `inet` 地址（如：192.168.1.100）：

```
wlan0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.1.100  netmask 255.255.255.0  broadcast 192.168.1.255
        ...
```

## 步骤5：从电脑上连接 Termux

根据您的电脑操作系统，选择相应的连接方法：

### 方法1：使用 Windows 系统连接

#### 选项1：使用 PowerShell 或 Command Prompt

1. 打开 PowerShell 或 Command Prompt
2. 执行以下命令连接 Termux：
   ```bash
   ssh -p 8022 u0_a123@192.168.1.100
   ```
   其中：
   - `-p 8022`：指定 SSH 端口为 8022
   - `u0_a123`：Termux 用户名，您可以通过执行 `whoami` 命令查看
   - `192.168.1.100`：您的安卓设备的 IP 地址

#### 选项2：使用 PuTTY

1. 下载并安装 PuTTY（https://www.putty.org/）
2. 打开 PuTTY
3. 在 "Session" 选项卡中：
   - "Host Name (or IP address)"：输入您的安卓设备的 IP 地址
   - "Port"：输入 8022
   - "Connection type"：选择 "SSH"
4. 点击 "Open" 按钮
5. 在弹出的终端窗口中，输入 Termux 用户名和密码

### 方法2：使用 macOS 或 Linux 系统连接

1. 打开终端
2. 执行以下命令连接 Termux：
   ```bash
   ssh -p 8022 u0_a123@192.168.1.100
   ```
   其中：
   - `-p 8022`：指定 SSH 端口为 8022
   - `u0_a123`：Termux 用户名，您可以通过执行 `whoami` 命令查看
   - `192.168.1.100`：您的安卓设备的 IP 地址

## 步骤6：确认连接成功

连接成功后，您将看到 Termux 的命令提示符，类似于：

```
Welcome to Termux!

Community Forum: https://termux.dev/community
Gitter Chat:     https://gitter.im/termux/termux
IRC Channel:     #termux on libera.chat

Working with Termux: https://termux.dev/docs/introduction
Termux Wiki:         https://wiki.termux.com/

u0_a123@localhost:~$ 
```

现在您可以在电脑上执行 Termux 命令了！

## 步骤7：断开 SSH 连接

要断开 SSH 连接，您可以：
- 执行 `exit` 命令
- 按 `Ctrl+D` 组合键
- 关闭终端窗口

## 步骤8：停止 SSH 服务器

如果您不再需要 SSH 服务，可以执行以下命令停止 SSH 服务器：

```bash
# 查找 SSH 服务器进程
ps aux | grep sshd

# 杀死 SSH 服务器进程
kill <进程ID>
```

或者，您可以重启 Termux 应用，SSH 服务器会自动停止。

## 高级配置

### 配置 SSH 密钥认证（可选）

使用 SSH 密钥认证可以让您无需输入密码即可连接 Termux，更加安全和方便。

#### 步骤1：在电脑上生成 SSH 密钥对

- **Windows**：使用 PuTTYgen 生成密钥对
- **macOS/Linux**：执行以下命令生成密钥对：
  ```bash
  ssh-keygen -t rsa -b 4096
  ```

#### 步骤2：将公钥复制到 Termux

执行以下命令将公钥复制到 Termux：

```bash
# 在电脑上执行
ssh-copy-id -p 8022 u0_a123@192.168.1.100
```

或者手动复制：

1. 在电脑上查看公钥内容：
   ```bash
   cat ~/.ssh/id_rsa.pub
   ```

2. 在 Termux 中创建 `.ssh` 目录和 `authorized_keys` 文件：
   ```bash
   mkdir -p ~/.ssh
   nano ~/.ssh/authorized_keys
   ```

3. 将电脑上的公钥内容粘贴到 `authorized_keys` 文件中
4. 按 `Ctrl+X`，然后按 `Y`，最后按 `Enter` 保存文件

5. 设置正确的权限：
   ```bash
   chmod 700 ~/.ssh
   chmod 600 ~/.ssh/authorized_keys
   ```

现在您可以无需输入密码即可连接 Termux 了！

### 修改 SSH 服务器端口（可选）

如果您想修改 SSH 服务器的端口，可以编辑 `/data/data/com.termux/files/usr/etc/ssh/sshd_config` 文件：

```bash
# 编辑 SSH 配置文件
nano /data/data/com.termux/files/usr/etc/ssh/sshd_config
```

找到 `Port` 行，修改为您想要的端口，例如：

```
Port 2222
```

保存文件后，重启 SSH 服务器：

```bash
# 停止当前 SSH 服务器
pkill sshd

# 启动 SSH 服务器
sshd
```

### 设置 SSH 服务器开机自启（可选）

要让 SSH 服务器在 Termux 启动时自动运行，您可以将 `sshd` 命令添加到 Termux 的启动脚本中：

```bash
# 编辑启动脚本
nano ~/.bashrc

# 在文件末尾添加以下内容
echo "Starting SSH server..."
sshd
```

保存文件后，下次启动 Termux 时，SSH 服务器会自动启动。

## 常见问题及解决方案

### 问题1：无法连接到 SSH 服务器

**可能原因**：
- SSH 服务器未启动
- 防火墙阻止了连接
- IP 地址不正确
- 端口号不正确

**解决方案**：
- 确保 SSH 服务器已启动：`sshd`
- 检查电脑和手机是否在同一局域网内
- 重新获取 IP 地址：`ifconfig`
- 确保使用正确的端口号（默认 8022）
- 关闭电脑或手机上的防火墙

### 问题2：连接被拒绝

**可能原因**：
- SSH 服务器未启动
- 用户名或密码错误
- 公钥认证失败

**解决方案**：
- 确保 SSH 服务器已启动：`sshd`
- 检查用户名是否正确：`whoami`
- 重置 Termux 密码：`passwd`
- 检查公钥配置是否正确

### 问题3：连接超时

**可能原因**：
- 网络连接问题
- IP 地址不正确
- SSH 服务器未启动

**解决方案**：
- 检查网络连接
- 确保电脑和手机在同一局域网内
- 重新获取 IP 地址：`ifconfig`
- 确保 SSH 服务器已启动：`sshd`

## 有用的 SSH 命令

| 命令 | 说明 |
|------|------|
| `ssh -p 8022 u0_a123@192.168.1.100` | 连接 Termux |
| `ssh -p 8022 u0_a123@192.168.1.100 "ls -la"` | 在 Termux 上执行命令并返回结果 |
| `scp -P 8022 local_file u0_a123@192.168.1.100:~` | 将本地文件复制到 Termux |
| `scp -P 8022 u0_a123@192.168.1.100:remote_file ~` | 将 Termux 上的文件复制到本地 |
| `ssh -p 8022 -X u0_a123@192.168.1.100` | 启用 X11 转发（需要额外配置） |

## 总结

通过本指南，您已经学会了如何：
1. 在 Termux 中安装和配置 SSH 服务器
2. 设置 SSH 访问密码
3. 启动和停止 SSH 服务器
4. 从不同操作系统的电脑上连接 Termux
5. 配置 SSH 密钥认证
6. 修改 SSH 服务器端口
7. 设置 SSH 服务器开机自启
8. 解决常见问题

现在您可以方便地从电脑上操作 Termux 环境了！

---

**祝您使用愉快！**