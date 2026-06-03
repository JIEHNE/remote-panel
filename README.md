# remote-claude

基于浏览器远程操控 Claude Code CLI，手机 + 电脑同时访问同一个会话，消息实时同步。

## 前置条件

| 工具 | 用途 | 安装方式 |
|------|------|----------|
| Node.js 18+ | 运行服务 | [nodejs.org](https://nodejs.org/) 下载安装 |
| Claude Code CLI | AI 对话核心 | 终端执行 `npm install -g @anthropic-ai/claude-code`，然后运行一次 `claude` 按提示配置 API Key |
| cloudflared | **手机外网**访问 | [下载](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-run/)，仅局域网使用则不需要 |

## 使用步骤

```bash
# 1. 克隆项目
git clone https://github.com/JIEHNE/remote-claude.git
cd remote-claude

# 2. 安装依赖
npm install

# 3. 启动服务
node server.js
```

控制台会输出一个随机密码，记下来。

## 打开使用

- **电脑**：浏览器打开 `http://localhost:3000`，输入密码
- **手机（同一 WiFi）**：浏览器打开 `http://你电脑的IP:3000`
- **手机（外面流量）**：另开一个终端运行 `cloudflared tunnel --url http://localhost:3000`，会得到一个 `https://xxxx.trycloudflare.com` 地址，手机浏览器打开即可

## 多设备同步

电脑和手机（或任何设备）同时登录后，看到的是同一个终端画面。任一设备输入，其他设备实时显示。

## 架构

```
浏览器 ←WebSocket→ Node.js :3000 ←PTY→ Claude Code CLI
```
