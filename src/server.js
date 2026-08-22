'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const sync = require('../scripts/sync');

const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');
const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

function send(res, status, body, type) {
  res.writeHead(status, { 'Content-Type': type || 'text/plain; charset=utf-8' });
  res.end(body);
}

function serveFile(res, filePath) {
  fs.readFile(filePath, function (err, data) {
    if (err) { send(res, 404, 'Not Found'); return; }
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, data, MIME[ext] || 'application/octet-stream');
  });
}

const server = http.createServer(async function (req, res) {
  const url = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);

  // 1) URL 传参采集：?repo=owner/name
  //    支持多种形式：?repo=a/b&repo=c/d   或   ?repo=a/b,c/d
  const repoParams = url.searchParams.getAll('repo');
  const extra = [];
  repoParams.forEach(function (p) {
    String(p).split(',').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (s) { extra.push(s); });
  });
  if (extra.length) {
    try {
      console.log('▶ 收到采集请求: ' + extra.join(', '));
      await sync.addReposAndSync(extra);
      res.writeHead(302, { 'Location': '/' });
      res.end();
    } catch (e) {
      send(res, 500, '采集失败: ' + e.message);
    }
    return;
  }

  // 2) 常规路由
  let pn = pathname === '/' ? '/index.html' : pathname;
  if (pn === '/api/data') {
    serveFile(res, path.join(PUBLIC_DIR, 'data.json'));
    return;
  }

  // API: 触发同步（页面 "Sync Now" 按钮）
  if (pn === '/api/sync' && req.method === 'POST') {
    const { spawn } = require('child_process');
    const child = spawn(process.execPath, [path.join(__dirname, '..', 'scripts', 'sync.js')], { stdio: 'inherit' });
    child.on('exit', function (code) {
      send(res, 200, JSON.stringify({ ok: true, code: code }));
    });
    return;
  }

  // 防目录穿越
  const safePath = path.normalize(pn).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);
  if (!filePath.startsWith(PUBLIC_DIR)) { send(res, 403, 'Forbidden'); return; }

  fs.stat(filePath, function (err, stat) {
    if (err) { send(res, 404, 'Not Found'); return; }
    if (stat.isFile()) { serveFile(res, filePath); return; }
    // 目录请求（如 /about/ 或 /about）→ 尝试 index.html
    if (stat.isDirectory()) {
      const idx = path.join(filePath, 'index.html');
      fs.stat(idx, function (e2, s2) {
        if (e2 || !s2.isFile()) { send(res, 404, 'Not Found'); return; }
        serveFile(res, idx);
      });
      return;
    }
    send(res, 404, 'Not Found');
  });
});

server.listen(PORT, function () {
  console.log('▶ Dev server running: http://localhost:' + PORT + '/');
  console.log('▶ 采集用法: http://localhost:' + PORT + '/?repo=owner/name');
});
