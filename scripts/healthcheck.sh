#!/usr/bin/env bash
# ============================================================
# healthcheck.sh — 全栈健康检查 (Phase 3.10, v0.17)
# 检查: HTTP/3000 + dev server 进程 + cloudflared tunnel + 域名可达 + DB + 磁盘 + swap
# 用法: bash scripts/healthcheck.sh
# 输出: 0 健康 / 1 异常 (详细打印)
# ============================================================
set +e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# 颜色 (no TTY 时关闭)
if [ -t 1 ]; then
  G="\033[0;32m"; R="\033[0;31m"; Y="\033[0;33m"; N="\033[0m"
else
  G=""; R=""; Y=""; N=""
fi

pass=0
fail=0
warn=0
report() {
  local kind="$1"; shift
  local label="$1"; shift
  case "$kind" in
    pass) echo -e "${G}✓${N} $label"; pass=$((pass+1)) ;;
    fail) echo -e "${R}✗${N} $label"; fail=$((fail+1)) ;;
    warn) echo -e "${Y}⚠${N} $label"; warn=$((warn+1)) ;;
    info) echo -e "  $label" ;;
  esac
}

echo "==============================================="
echo "🏥 Obsidian Journal Health Check"
echo "==============================================="
echo "时间: $(date '+%F %T')"
echo "主机: $(hostname)"
echo ""

# 1. HTTP 本地
echo "--- 1. 本地 HTTP (localhost:3000) ---"
http_local=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:3000/ 2>/dev/null || echo "000")
if [ "$http_local" = "200" ]; then
  report pass "HTTP 200 (本机)"
else
  report fail "HTTP $http_local (本机) — dev server 可能挂了"
fi

# 2. dev server 进程
echo ""
echo "--- 2. dev server 进程 ---"
if pgrep -f "next-server" > /dev/null; then
  pid=$(pgrep -f "next-server" | head -1)
  uptime=$(ps -o etime= -p "$pid" 2>/dev/null | tr -d ' ')
  report pass "next-server 进程在跑 (pid=$pid, uptime=$uptime)"
else
  report fail "next-server 进程不存在"
fi

# 3. Cloudflare tunnel
echo ""
echo "--- 3. Cloudflare Named Tunnel ---"
if systemctl is-active --quiet cloudflared 2>/dev/null; then
  report pass "cloudflared.service active"
else
  report fail "cloudflared.service 未运行"
fi

# 4. 域名可达
echo ""
echo "--- 4. 域名可达 (dev.shangkun.uk) ---"
if [ -s .tunnel-url ]; then
  url=$(cat .tunnel-url | tr -d '[:space:]')
  # 重试 5 次 (cloudflared QUIC 偶发抖动 ~3s 间隔, 3 次不够)
  http_remote="000"
  for i in 1 2 3 4 5; do
    http_remote=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -L "$url/" 2>/dev/null || echo "000")
    if [ "$http_remote" = "200" ]; then break; fi
    sleep 3
  done
  if [ "$http_remote" = "200" ]; then
    report pass "$url HTTP 200"
  else
    report fail "$url HTTP $http_remote (3 次重试后仍失败)"
  fi
else
  report warn ".tunnel-url 文件不存在"
fi

# 5. 数据库
echo ""
echo "--- 5. 数据库 ---"
if [ -f data/dev.db ]; then
  size=$(du -h data/dev.db | cut -f1)
  # 检查 SQLite 文件头 (前 16 字节含 \"SQLite format 3\")
  header=$(head -c 16 data/dev.db | tr -d '\0')
  if [[ "$header" == SQLite* ]]; then
    # 简单查表: 用 grep 数 CREATE TABLE
    tables=$(grep -c "CREATE TABLE" data/dev.db 2>/dev/null || echo "0")
    if [ "$tables" -ge 10 ]; then
      report pass "dev.db $size, 有效 SQLite, $tables 表"
    elif [ "$tables" -ge 1 ]; then
      report warn "dev.db $size, $tables 表 (可能 schema 不全)"
    else
      report warn "dev.db $size, 0 表 (空库)"
    fi
  else
    report fail "dev.db 不是有效 SQLite 文件"
  fi
else
  report fail "data/dev.db 不存在"
fi

# 6. 磁盘
echo ""
echo "--- 6. 磁盘 ---"
disk=$(df -h / | tail -1)
used=$(echo "$disk" | awk '{print $5}' | tr -d '%')
if [ "$used" -lt 80 ]; then
  report pass "磁盘 $used% (< 80%)"
elif [ "$used" -lt 90 ]; then
  report warn "磁盘 $used% (80-90%, 建议清理)"
else
  report fail "磁盘 $used% (≥90%, 紧急清理)"
fi

# 7. Swap (2c4g 必备)
echo ""
echo "--- 7. Swap (2c4g 必备) ---"
swap_total=$(free -m | awk '/^Swap:/ {print $2}')
if [ "$swap_total" -ge 2048 ]; then
  report pass "Swap ${swap_total}MB (≥2GB)"
elif [ "$swap_total" -gt 0 ]; then
  report warn "Swap ${swap_total}MB (<2GB, prod-4g 建议 2GB)"
else
  report warn "Swap 0MB (prod-4g 必备, 详见 DEPLOY.md)"
fi

# 8. 内存
echo ""
echo "--- 8. 内存 ---"
mem_total=$(free -m | awk '/^Mem:/ {print $2}')
mem_used=$(free -m | awk '/^Mem:/ {print $3}')
mem_pct=$((mem_used * 100 / mem_total))
if [ "$mem_pct" -lt 80 ]; then
  report pass "内存 ${mem_used}MB / ${mem_total}MB ($mem_pct%)"
elif [ "$mem_pct" -lt 90 ]; then
  report warn "内存 ${mem_used}MB / ${mem_total}MB ($mem_pct%)"
else
  report fail "内存 ${mem_used}MB / ${mem_total}MB ($mem_pct%) — OOM 风险"
fi

# 总结
echo ""
echo "==============================================="
echo -e "结果: ${G}$pass 通过${N}, ${Y}$warn 警告${N}, ${R}$fail 失败${N}"
echo "==============================================="

exit $fail