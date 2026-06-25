# 部署文档 (Deployment Guide)

> v0.6.1 — 2026-06-25

## 三档部署模式 (DEPLOY_MODE)

| 模式 | 硬件 | 场景 | 关键参数 |
|---|---|---|---|
| `dev` | 任意 | 本地开发 | NODE_ENV=development, hot reload |
| `prod-16g` | 4c16g | 标准生产 | PM2 cluster=2, heap 2G, WAL |
| `prod-4g` | 2c4g | 降级部署 | PM2 fork, heap 1.5G, sharp=1, swap 2GB 必备 |

## 系统依赖

```bash
# Ubuntu 24.04 LTS
sudo apt update && sudo apt install -y \
    nodejs-22 nginx certbot python3-certbot-nginx \
    sqlite3 build-essential python3

# 国内镜像加速 (可选)
npm config set registry https://registry.npmmirror.com/
```

## 一键部署 (生产机)

```bash
# 1. 拉代码
git clone https://github.com/blackclaw0318/obsidian-journal.git /opt/obsidian-journal
cd /opt/obsidian-journal

# 2. 装依赖
npm ci --omit=dev

# 3. 写 .env (生产)
cat > .env <<EOF
DATABASE_URL="file:./data/prod.db"
NEXTAUTH_SECRET="$(openssl rand -hex 32)"
NEXTAUTH_URL="https://obsidian.example.com"
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_PASSWORD_HASH="$(htpasswd -nbBC 12 admin yourpassword | cut -d: -f2)"
DEPLOY_MODE="prod-16g"   # 或 prod-4g
SHARP_CONCURRENCY=2
NODE_MAX_OLD_SPACE_MB=4096
EOF

# 4. 初始化数据库
npm run db:seed

# 5. PM2 启动
sudo npm install -g pm2
pm2 start npm --name "obsidian" -- run start
pm2 save
pm2 startup systemd
```

## 2c4g 降级部署 (prod-4g)

硬件预算紧张(2 核 / 4GB RAM)时的最低部署要求:

```bash
# 1. 必备: 2GB swap (无 swap 时 OOM 风险)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 2. .env 配置
cat > .env <<EOF
DEPLOY_MODE="prod-4g"
SHARP_CONCURRENCY=1                # sharp 单线程 (避免 OOM)
NODE_MAX_OLD_SPACE_MB=1536         # 1.5GB heap
EOF

# 3. PM2 fork 模式 (不用 cluster)
pm2 delete obsidian
pm2 start npm --name "obsidian" --interpreter none -- \
    node --max-old-space-size=1536 ./node_modules/.bin/next start -p 3000
pm2 save
```

### 2c4g 性能预期 (黑压测待做)

| 指标 | 预期值 |
|---|---|
| 首页 TTFB | < 200ms |
| 首页完整加载 | < 1s |
| 并发 (Cloudflare Tunnel 后) | ~50 req/s |
| 内存峰值 | ~1.4GB (含 swap 缓冲) |
| CPU 稳态 | < 60% (2 核均值) |

## nginx 反向代理 (可选)

```nginx
server {
    listen 80;
    server_name obsidian.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo certbot --nginx -d obsidian.example.com
```

## Cloudflare Tunnel (公网暴露)

```bash
# 1. 安装 cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cloudflared.deb
sudo dpkg -i /tmp/cloudflared.deb

# 2. 临时隧道 (试用)
cloudflared tunnel --url http://localhost:3000
# 输出: https://xxxx.trycloudflare.com

# 3. 长期隧道 (需注册子域)
cloudflared tunnel login               # 浏览器登录
cloudflared tunnel create obsidian     # 建隧道
cloudflared tunnel route dns obsidian obsidian.example.com
cloudflared tunnel run obsidian        # 跑隧道
```

## SQLite 运维

```bash
# 备份
sqlite3 /opt/obsidian-journal/data/prod.db ".backup '/backup/obsidian-$(date +%F).db'"

# 还原
sqlite3 /opt/obsidian-journal/data/prod.db ".restore '/backup/obsidian-2026-06-25.db'"

# WAL checkpoint (低峰期)
sqlite3 /opt/obsidian-journal/data/prod.db "PRAGMA wal_checkpoint(TRUNCATE);"

# 重建 FTS5 索引 (Phase 2 启用后)
sqlite3 /opt/obsidian-journal/data/prod.db "INSERT INTO posts_fts(posts_fts) VALUES('rebuild');"
```

### 7 PRAGMA 配置 (v0.4 §13.4)

```sql
PRAGMA journal_mode = WAL;              -- WAL 模式 (并发读 + 单写)
PRAGMA synchronous = NORMAL;           -- NORMAL (无 fsync 阻塞, 配合 WAL 安全)
PRAGMA busy_timeout = 5000;            -- 5s 锁等待
PRAGMA cache_size = -64000;            -- 64MB 缓存
PRAGMA temp_store = MEMORY;            -- temp 表走内存
PRAGMA mmap_size = 268435456;          -- 256MB mmap
PRAGMA foreign_keys = ON;              -- FK 约束
```

## 监控

```bash
# 看实时 QPS / 内存 / CPU
pm2 monit

# 健康检查端点 (待实现)
curl http://localhost:3000/api/health
# 返回: {"status":"ok","db":"ok","uptime":12345}

# 日志
pm2 logs obsidian --lines 100

# 慢查询 (SQLite)
sqlite3 /opt/obsidian-journal/data/prod.db ".timer on" "SELECT count(*) FROM posts;"
```

## 升级流程

```bash
# 1. 备份
./scripts/backup.sh

# 2. 拉新代码
cd /opt/obsidian-journal
git pull origin main

# 3. 装新依赖
npm ci --omit=dev

# 4. 数据库迁移 (Phase 2+ 有 schema 变更时)
npm run db:migrate

# 5. 重启
pm2 restart obsidian

# 6. 健康检查
curl http://localhost:3000/api/health
```

## 故障排查

| 症状 | 可能原因 | 解决 |
|---|---|---|
| 启动报 "Cannot find module 'better-sqlite3'" | node:sqlite 是内置模块, 误装了 better-sqlite3 | `npm uninstall better-sqlite3` |
| 数据库 locked | WAL 文件残留 | 删除 `*.db-wal` `*.db-shm` 后重启 |
| 502 Bad Gateway | Next.js 未起 | `pm2 logs obsidian` 看启动错误 |
| 慢 | FTS5 未建索引 | `npm run db:reindex` |
| OOM (prod-4g) | sharp 并发高 | `SHARP_CONCURRENCY=1` |
| GitHub push 超时 | lavm 出方向策略 | 重试, 或 ssh 推, 或代理 (ghfast.top) |

## 待办

- [ ] 健康检查端点 `/api/health`
- [ ] 自动备份 cron (每天 03:00)
- [ ] 2c4g 真机压测 (k6 报告)
- [ ] Dockerfile + docker-compose
- [ ] systemd unit 替代 PM2 (更原生)
