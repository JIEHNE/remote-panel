# remote-claude

基于浏览器远程操控 Claude Code CLI，手机 + 电脑同时访问同一个会话，消息实时同步。

## 前置条件

| 工具 | 用途 | 安装方式 |
|------|------|----------|
| Node.js 18+ | 运行服务 | [nodejs.org](https://nodejs.org/) 下载安装 |
| Claude Code CLI | AI 对话核心 | 终端执行 `npm install -g @anthropic-ai/claude-code`，然后运行一次 `claude` 按提示配置 API Key |
| cloudflared | **手机外网**访问 | [下载](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-run/)，仅局域网使用则不需要 |

## 使用步骤

打开终端（Windows 按 `Win+R` 输入 `cmd` 回车），依次执行：

```bash
git clone https://github.com/JIEHNE/remote-claude.git   # 下载项目
cd remote-claude                                        # 进入项目文件夹
npm install                                             # 自动下载依赖包
node server.js                                          # 启动服务器
```

执行最后一条后，控制台会打印一个随机密码，记下来。这个窗口不要关。

## 打开使用

- **电脑**：浏览器打开 `http://localhost:3000`，输入刚才的密码
- **手机（同一 WiFi）**：浏览器打开 `http://你电脑的IP:3000`
- **手机（外面流量）**：另开一个终端窗口，运行：
  ```
  cloudflared tunnel --url http://localhost:3000
  ```
  运行后会显示一个 `https://xxxx.trycloudflare.com` 地址，手机浏览器打开这个地址

## 重启电脑后

打开两个终端窗口，分别运行：

**窗口 1：**
```
cd G:/cc/remote-claude
node server.js
```

**窗口 2（外网访问才需要）：**
```
cloudflared tunnel --url http://localhost:3000
```

窗口 2 输出的是新地址（每次重启都会变），手机用新地址访问。密码不变。

## 多设备同步

电脑和手机（或任何设备）同时登录后，看到的是同一个终端画面。任一设备输入，其他设备实时显示。

## 架构

```
浏览器 ←WebSocket→ Node.js :3000 ←PTY→ Claude Code CLI
```
