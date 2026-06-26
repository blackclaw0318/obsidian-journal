#!/usr/bin/env bash
# ============================================================
# tunnel-url.sh — 打印当前 dev tunnel URL
# 老板从任何设备访问都看这个 URL, 不要相信聊天记录里的旧 URL
# 优先级: 1) systemd wrapper 写的 .tunnel-url  2) 解析最新日志
# ============================================================
set -e

URL_FILE=".tunnel-url"
LOG="/var/log/cloudflared-quick.log"

# 1) 优先读 wrapper 写的固定文件
if [ -f "$URL_FILE" ] && [ -s "$URL_FILE" ]; then
    url=$(cat "$URL_FILE" | tr -d '[:space:]')
    if [ -n "$url" ]; then
        echo "🌐 当前 dev tunnel URL: $url"
        exit 0
    fi
fi

# 2) 兜底: 从日志抓最新 URL
if [ -f "$LOG" ]; then
    url=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" | tail -1)
    if [ -n "$url" ]; then
        echo "🌐 当前 dev tunnel URL (从日志): $url"
        echo "$url" > "$URL_FILE"
        exit 0
    fi
fi

# 3) 都没有 → 提示服务挂了
echo "❌ 没找到 tunnel URL, cloudflared-quick 服务可能挂了"
echo "   重启: sudo systemctl restart cloudflared-quick"
echo "   状态: systemctl status cloudflared-quick"
exit 1