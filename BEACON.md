# 防机器人 Beacon 系统

## 解决的问题

Censys、Shodan 等自动扫描器会对公网 IP 发起 HTTP 请求，触发飞书访客通知，造成大量误报。

## 方案原理

**只有真人浏览器才执行 JavaScript。**

扫描器只发 HTTP GET 拿 HTML，不执行 JS → 不触发通知。
真人用浏览器打开页面 → JS 自动调用 `/api/beacon` → 写入日志 → 触发飞书通知。

## 文件说明

### `visitor-notify.sh`
部署路径：`/home/ubuntu/nail/visitor-notify.sh`

- 监听 `/tmp/visitor-beacon.log`（不再监听 nginx access log）
- 每条记录格式：`IP|PAGE|UA|TIME`
- 同一 IP+页面 5 分钟内只推一次（文件去重）
- 调用 ip-api.com 查询归属地和 ISP
- 推送飞书 webhook

启动方式：
```bash
touch /tmp/visitor-beacon.log
setsid bash /home/ubuntu/nail/visitor-notify.sh >> /tmp/visitor-notify.log 2>&1 &
```

### `user-client/server.js`
新增 `/api/beacon` 接口（POST）：
- 从 `X-Real-IP` / `X-Forwarded-For` 获取真实 IP
- 将访问记录 append 到 `/tmp/visitor-beacon.log`
- 返回 `{"ok": true}`

### `user-client/index.html` / `admin-ops/index.html`
页面加载时执行：
```js
fetch('/api/beacon', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ page: location.pathname }),
  keepalive: true
});
```

## nginx 配置要点

`/api/beacon` 需要单独代理到 3001 端口，并透传真实 IP：

```nginx
location = /api/beacon {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

## 部署检查

```bash
# 确认接口正常
curl -X POST http://localhost:3001/api/beacon \
  -H 'Content-Type: application/json' \
  -d '{"page":"/test"}'
# 期望返回：{"ok":true}

# 确认日志写入
tail -f /tmp/visitor-beacon.log

# 确认脚本在跑
ps aux | grep visitor-notify | grep -v grep
```
