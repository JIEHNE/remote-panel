# remote-claude

基于浏览器的远程 Claude Code 操控面板，通过手机或电脑浏览器访问本地 Claude Code CLI，支持多设备实时同步。

## 前置条件

- [Node.js](https://nodejs.org/) 18+
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code/overview)
- [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)（可选，用于外网访问）

## 快速开始

```bash
git clone https://github.com/JIEHNE/remote-claude.git
cd remote-claude
npm install
node server.js
```

启动后控制台会输出一个随机密码，浏览器打开 `http://localhost:3000` 输入密码即可使用。

## 外网访问（手机流量）

```bash
cloudflared tunnel --url http://localhost:3000
```

会输出一个 `https://xxxx.trycloudflare.com` 地址，手机浏览器打开即可。

## 架构

```
浏览器 ←WebSocket→ Node.js :3000 ←PTY→ Claude Code CLI
```

多设备连接共享同一个 Claude Code 进程，消息实时同步。
