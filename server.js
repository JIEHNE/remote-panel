const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const pty = require('node-pty');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const AUTH_FILE = path.join(__dirname, '.auth.json');
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// ========== 速率限制 ==========
const attempts = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of attempts) {
    if (now > data.lockedUntil && now - data.lastAttempt > 3600000) {
      attempts.delete(ip);
    }
  }
}, 60000);

function checkRateLimit(ip) {
  const now = Date.now();
  const record = attempts.get(ip);
  if (!record) return true;
  if (record.lockedUntil > now) return false;
  return true;
}

function recordFailedAttempt(ip) {
  const now = Date.now();
  const record = attempts.get(ip) || { count: 0, lastAttempt: 0, lockedUntil: 0 };
  record.count++;
  record.lastAttempt = now;
  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MINUTES * 60000;
  }
  attempts.set(ip, record);
}

function resetAttempts(ip) {
  attempts.delete(ip);
}

// ========== 密码管理 ==========
function getOrCreatePassword() {
  if (fs.existsSync(AUTH_FILE)) {
    return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
  }
  const password = crypto.randomBytes(12).toString('hex');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  fs.writeFileSync(AUTH_FILE, JSON.stringify({ salt, hash }));
  console.log(`\n========================================`);
  console.log(`  初始密码: ${password}`);
  console.log(`  请妥善保管！`);
  console.log(`========================================\n`);
  return { salt, hash };
}

function verifyPassword(input, auth) {
  const hash = crypto.scryptSync(input, auth.salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(auth.hash));
}

// ========== 会话管理 ==========
const sessions = new Map(); // token -> { createdAt }
const SESSION_TIMEOUT = 24 * 3600000; // 24 小时

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { createdAt: Date.now() });
  return token;
}

function validateSession(token) {
  if (!token) return false;
  const session = sessions.get(token);
  if (!session) return false;
  if (Date.now() - session.createdAt > SESSION_TIMEOUT) {
    sessions.delete(token);
    return false;
  }
  return true;
}

// 清理过期会话
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of sessions) {
    if (now - data.createdAt > SESSION_TIMEOUT) sessions.delete(token);
  }
}, 3600000);

// ========== Express ==========
const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const auth = getOrCreatePassword();

app.post('/api/login', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  if (!checkRateLimit(ip)) {
    const record = attempts.get(ip);
    const minutes = Math.ceil((record.lockedUntil - Date.now()) / 60000);
    return res.status(429).json({ error: `尝试次数过多，请 ${minutes} 分钟后重试` });
  }

  const { password } = req.body;
  if (!password || !verifyPassword(password, auth)) {
    recordFailedAttempt(ip);
    const record = attempts.get(ip);
    const remaining = MAX_ATTEMPTS - record.count;
    return res.status(401).json({
      error: remaining > 0
        ? `密码错误，还剩 ${remaining} 次尝试机会`
        : `已锁定 ${LOCKOUT_MINUTES} 分钟`
    });
  }

  resetAttempts(ip);
  const token = createSession();
  res.json({ token });
});

// ========== WebSocket ==========
const wss = new WebSocketServer({ server, path: '/ws' });

let ptyProcess = null;
const clients = new Set();

function spawnClaude() {
  if (ptyProcess) {
    try { ptyProcess.kill(); } catch (e) { /* 忽略 */ }
  }

  const cwd = process.cwd();
  ptyProcess = pty.spawn('cmd.exe', [], {
    name: 'xterm-color',
    cols: 100,
    rows: 35,
    cwd,
    env: { ...process.env, TERM: 'xterm-256color' }
  });

  console.log('Claude Code 进程已启动');

  ptyProcess.onData((data) => {
    for (const ws of clients) {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'output', data }));
      }
    }
  });

  ptyProcess.onExit(({ exitCode }) => {
    console.log(`Claude Code 进程退出，退出码: ${exitCode}`);
    for (const ws of clients) {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'exit', code: exitCode }));
      }
    }
    ptyProcess = null;
  });
}

wss.on('connection', (ws, req) => {
  // 验证 token
  const url = new URL(req.url, 'http://localhost');
  const token = url.searchParams.get('token');
  if (!validateSession(token)) {
    ws.send(JSON.stringify({ type: 'auth_error', message: '未授权，请重新登录' }));
    ws.close();
    return;
  }

  clients.add(ws);
  console.log(`客户端已连接 (当前 ${clients.size} 个)`);

  // 确保 Claude Code 在运行
  if (!ptyProcess) {
    spawnClaude();
  }

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }

    if (msg.type === 'input' && ptyProcess) {
      ptyProcess.write(msg.data);
    } else if (msg.type === 'restart') {
      spawnClaude();
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`客户端已断开 (当前 ${clients.size} 个)`);
  });

  ws.on('error', () => {
    clients.delete(ws);
  });
});

server.listen(PORT, () => {
  console.log(`\n远程 Claude Code 服务已启动:`);
  console.log(`  本地地址: http://localhost:${PORT}`);
  console.log(`  同 WiFi 手机访问: http://<你的电脑IP>:${PORT}\n`);
});
