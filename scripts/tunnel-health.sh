#!/usr/bin/env bash
# ============================================================
# tunnel-health.sh — 检查 dev tunnel 健康
# 用法: bash scripts/tunnel-health.sh
# 输出: 0 健康 / 1 异常
# ============================================================
set -e

URL_FILE=".tunnel-url"
WARN_FILE=".tunnel-warn-flag"

# 1) 服务是否在跑
if ! systemctl is-active --quiet cloudflared-quick; then
    echo "❌ cloudflared-quick.service 不在运行"
    exit 1
fi

# 2) 有没有 URL
if [ ! -s "$URL_FILE" ]; then
    echo "❌ $URL_FILE 为空, 等 URL 抓取中..."
    exit 1
fi

url=$(cat "$URL_FILE" | tr -d '[:space:]')

# 3) HTTP 健康检查
http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -L "$url/" || echo "000")
if [ "$http_code" != "200" ]; then
    echo "❌ tunnel URL 无响应: $url → HTTP $http_code"
    exit 1
fi

# 4) 检测 URL 是否变化 (如果变了, 提醒一次)
prev_url=""
if [ -f "$WARN_FILE" ]; then
    prev_url=$(cat "$WARN_FILE")
fi
if [ "$prev_url" != "$url" ] && [ -n "$prev_url" ]; then
    echo "⚠️  tunnel URL 已变化!"
    echo "   旧: $prev_url"
    echo "   新: $url"
    echo "   书签需要更新!"
fi
echo "$url" > "$WARN_FILE"

echo "✅ tunnel 健康: $url → HTTP $http_code"
exit 0