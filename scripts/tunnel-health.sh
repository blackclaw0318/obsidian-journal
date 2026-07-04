#!/usr/bin/env bash
# ============================================================
# tunnel-health.sh — 检查 dev tunnel + dev server 健康 + 自愈
# v0.35 (2026-07-04 增强: 加 dev server 检测, 2026-07-04 21:17 事故)
#
# 用法: bash scripts/tunnel-health.sh
# 输出: 0 健康 / 1 异常 (但已自愈)
#
# 行为:
# - dev server 死 → 启 obsidian-dev.service (新增)
# - HTTP 健康 (200) → 成功, 退出 0
# - HTTP 不健康 → 触发 cloudflared-quick.service 重启, 退出 1
# - 10 分钟 cooldown 防重启风暴
# - 重启后等 15s 让新 URL 落盘
# ============================================================
set +e

URL_FILE=".tunnel-url"
WARN_FILE=".tunnel-warn-flag"
COOLDOWN_FILE="/tmp/obsidian-tunnel-restart-cooldown"
DEV_COOLDOWN_FILE="/tmp/obsidian-dev-restart-cooldown"
COOLDOWN_SEC=600  # 10 分钟内不重复 restart
DEV_COOLDOWN_SEC=120  # dev server 重启 cooldown 2 分钟 (避免 dev 启动慢时风暴)

cd "$(dirname "$0")/.."

# 0) v0.35 新增: dev server 健康检测 (localhost:3000)
# 本事故根因: dev server 被 pkill 后没人重启, tunnel 不健康但 monitor 只看 quick tunnel
if ! systemctl is-active --quiet obsidian-dev; then
    if [ -f "$DEV_COOLDOWN_FILE" ]; then
        last=$(cat "$DEV_COOLDOWN_FILE")
        now=$(date +%s)
        diff=$((now - last))
        if [ $diff -lt $DEV_COOLDOWN_SEC ]; then
            echo "❌ obsidian-dev 不在运行, cooldown (${diff}s/${DEV_COOLDOWN_SEC}s), 跳过"
        else
            echo "❌ obsidian-dev 不在运行, 触发 restart (cooldown 已过)"
            systemctl start obsidian-dev.service
            echo "$(date +%s)" > "$DEV_COOLDOWN_FILE"
            sleep 10
        fi
    else
        echo "❌ obsidian-dev 不在运行, 首次触发 restart"
        systemctl start obsidian-dev.service
        echo "$(date +%s)" > "$DEV_COOLDOWN_FILE"
        sleep 10
    fi
fi

# 验证 dev server HTTP 健康 (不走 tunnel, 直接打 localhost:3000)
local_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 "http://localhost:3000/" 2>/dev/null || echo "000")
if [ "$local_code" != "200" ]; then
    echo "❌ localhost:3000 不健康: HTTP $local_code"
    # 重点: dev server 不响应 → 隧道也不会健康, 优先救 dev server
    if [ -f "$DEV_COOLDOWN_FILE" ]; then
        last=$(cat "$DEV_COOLDOWN_FILE")
        now=$(date +%s)
        diff=$((now - last))
        if [ $diff -lt $DEV_COOLDOWN_SEC ]; then
            echo "⏸ dev cooldown 激活, 跳过"
            exit 1
        fi
    fi
    systemctl restart obsidian-dev.service
    echo "$(date +%s)" > "$DEV_COOLDOWN_FILE"
    sleep 12
    echo "⏳ dev server 重启后再次检测..."
    local_code2=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 "http://localhost:3000/" 2>/dev/null || echo "000")
    if [ "$local_code2" != "200" ]; then
        echo "❌ dev server 重启后仍不健康: HTTP $local_code2"
        exit 1
    fi
    echo "✅ dev server 已恢复: HTTP 200"
fi

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
