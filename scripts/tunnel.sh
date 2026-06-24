#!/usr/bin/env bash
# ============================================================
# Cloudflare Tunnel 一键拉起 (P1.7 演示通道)
# ============================================================
set -e

PORT="${PORT:-3000}"
LOG_FILE="logs/tunnel.log"

mkdir -p logs

if ! command -v cloudflared &> /dev/null; then
  echo "❌ cloudflared 未安装, 请先运行 scripts/setup-cloudflared.sh"
  exit 1
fi

echo "🚀 启动 Cloudflare Tunnel (端口 $PORT)..."
echo "📝 日志: $LOG_FILE"
echo ""
echo "老板浏览器直接访问下方 URL 看真实产品:"
echo ""

# 提取 URL 并写 .env (供其他脚本读)
cloudflared tunnel --url "http://localhost:$PORT" 2>&1 | tee "$LOG_FILE" | grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" | head -1 > .tunnel-url.tmp
TUNNEL_URL=$(cat .tunnel-url.tmp)
rm -f .tunnel-url.tmp

if [ -n "$TUNNEL_URL" ]; then
  echo ""
  echo "✅ Tunnel URL: $TUNNEL_URL"
  # 写入 .env.public (gitignored, 老板收藏用)
  echo "DEV_TUNNEL_URL=$TUNNEL_URL" > .env.public
  echo "💾 已写入 .env.public"
fi