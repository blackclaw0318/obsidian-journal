#!/usr/bin/env bash
# ============================================================
# tunnel-health.sh — 检查 dev tunnel 健康 + 自愈
# v0.12.1 (2026-06-30 根除)
#
# 用法: bash scripts/tunnel-health.sh
# 输出: 0 健康 / 1 异常 (但已自愈)
#
# 行为:
# - HTTP 健康 (200) → 成功, 退出 0
# - HTTP 不健康 → 触发 cloudflared-quick.service 重启, 退出 1
# - 10 分钟 cooldown 防重启风暴
# - 重启后等 15s 让新 URL 落盘
# ============================================================
set +e

URL_FILE=".tunnel-url"
WARN_FILE=".tunnel-warn-flag"
COOLDOWN_FILE="/tmp/obsidian-tunnel-restart-cooldown"
COOLDOWN_SEC=600  # 10 分钟内不重复 restart

cd "$(dirname "$0")/.."

# 1) 服务是否在跑
if ! systemctl is-active --quiet cloudflared-quick; then
    echo "❌ cloudflared-quick.service 不在运行, 触发 restart"
    systemctl restart cloudflared-quick.service
    echo "$(date +%s)" > "$COOLDOWN_FILE"
    exit 1
fi

# 2) 有没有 URL
if [ ! -s "$URL_FILE" ]; then
    echo "❌ $URL_FILE 为空, 触发 restart"
    systemctl restart cloudflared-quick.service
    echo "$(date +%s)" > "$COOLDOWN_FILE"
    exit 1
fi

url=$(cat "$URL_FILE" | tr -d '[:space:]')

# 3) HTTP 健康检查
http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -L "$url/" 2>/dev/null || echo "000")
if [ "$http_code" != "200" ]; then
    echo "❌ tunnel URL 无响应: $url → HTTP $http_code"
    # cooldown 检查
    if [ -f "$COOLDOWN_FILE" ]; then
        last=$(cat "$COOLDOWN_FILE")
        now=$(date +%s)
        diff=$((now - last))
        if [ $diff -lt $COOLDOWN_SEC ]; then
            echo "⏸ cooldown 激活 (上次 restart ${diff}s 前), 跳过"
            exit 1
        fi
    fi
    echo "🔄 触发 cloudflared-quick restart..."
    systemctl restart cloudflared-quick.service
    echo "$(date +%s)" > "$COOLDOWN_FILE"
    echo "⏳ 等 15s 让新 URL 落盘..."
    sleep 15
    if [ -s "$URL_FILE" ]; then
        new_url=$(cat "$URL_FILE" | tr -d '[:space:]')
        echo "✅ 新 URL: $new_url"
    fi
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
