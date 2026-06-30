#!/usr/bin/env bash
# ============================================================
# deploy.sh — 一键部署 (Phase 3.10, v0.17)
# 整合: git pull → npm ci → build → restart → healthcheck
# 用法: sudo bash scripts/deploy.sh
# ============================================================
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "🚀 Obsidian Journal Deploy"
echo "时间: $(date '+%F %T')"
echo "路径: $ROOT"
echo ""

# 1. 检查 git status
echo "--- 1. Git 状态 ---"
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ 工作树有未提交改动, 请先 commit 或 stash"
  git status --short
  exit 1
fi
current=$(git rev-parse --short HEAD)
echo "当前 commit: $current"

# 2. 拉新代码
echo ""
echo "--- 2. 拉新代码 ---"
git pull origin main
new=$(git rev-parse --short HEAD)
echo "$current → $new"
[ "$current" = "$new" ] && echo "无新提交" || echo "✅ 拉到 $new"

# 3. 装依赖
echo ""
echo "--- 3. npm ci ---"
if [ -f package-lock.json ]; then
  npm ci --omit=dev 2>&1 | tail -3
else
  npm install --omit=dev 2>&1 | tail -3
fi

# 4. 跑测试 (optional, 跳过用 SKIP_TESTS=1)
echo ""
echo "--- 4. verify:fast ---"
if [ "${SKIP_TESTS:-0}" = "1" ]; then
  echo "跳过 (SKIP_TESTS=1)"
else
  export PATH="./node_modules/.bin:$PATH"
  npm run typecheck 2>&1 | tail -3
  npm run lint 2>&1 | tail -3
  npm run test:unit 2>&1 | tail -3
fi

# 5. 重启 next server
echo ""
echo "--- 5. 重启 dev server ---"
if pgrep -f "next-server" > /dev/null; then
  pid=$(pgrep -f "next-server" | head -1)
  kill "$pid"
  sleep 2
  echo "✅ 已停 next-server (pid=$pid)"
fi

# 后台启动 (生产用 PM2 / systemd, dev 用 next dev)
if [ "${DEPLOY_MODE:-dev}" = "dev" ]; then
  nohup npm run dev > /tmp/next-dev.log 2>&1 &
  echo "✅ next dev 后台启动 (pid=$!, log=/tmp/next-dev.log)"
else
  # 生产模式 (需要先 build)
  npm run build 2>&1 | tail -5
  nohup npm start > /tmp/next-prod.log 2>&1 &
  echo "✅ next start 后台启动 (pid=$!, log=/tmp/next-prod.log)"
fi

# 6. 等启动
echo ""
echo "--- 6. 等启动 (15s) ---"
sleep 15

# 7. 健康检查
echo ""
echo "--- 7. 健康检查 ---"
bash scripts/healthcheck.sh || true

echo ""
echo "✅ 部署完成"
echo "📦 备份建议: bash scripts/backup.sh"
echo "🏥 健康检查: bash scripts/healthcheck.sh"