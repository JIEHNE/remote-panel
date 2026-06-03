# 远程面板

基于浏览器的共享远程终端面板，手机 + 电脑同时访问同一个会话，实时同步。主要用途：远程操控 Claude Code CLI。

## 前置条件

| 工具 | 用途 | 安装方式 |
|------|------|----------|
| Node.js 18+ | 运行服务 | [nodejs.org](https://nodejs.org/) 下载安装 |
| Claude Code CLI | AI 对话核心 | 终端执行 `npm install -g @anthropic-ai/claude-code`，然后运行一次 `claude` 按提示配置 API Key |
| cloudflared | 手机外网访问 | [下载](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-run/)，仅局域网使用则不需要 |

## 使用步骤

```bash
git clone https://github.com/JIEHNE/remote-claude.git   # 下载项目
cd remote-claude                                        # 进入项目文件夹
npm install                                             # 安装依赖
node server.js                                          # 启动服务
```

启动后会打印一个随机密码，记下来。

**电脑**浏览器打开 `http://localhost:3000`，输入密码即可使用。

**手机（同一 WiFi）**浏览器打开 `http://你电脑的IP:3000`。

**手机（外面流量）**另开一个终端，进入项目文件夹后执行：

```bash
cloudflared tunnel --url http://localhost:3000
```

会输出一个 `https://xxxx.trycloudflare.com` 地址，手机浏览器打开即可。

## 多设备同步

电脑和手机同时登录后，看到的是同一个终端画面。任一设备输入，其他设备实时显示。

## 架构

```
浏览器 ←WebSocket→ Node.js :3000 ←PTY→ Claude Code CLI
```
