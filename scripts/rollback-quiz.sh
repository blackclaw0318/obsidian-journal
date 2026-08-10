#!/usr/bin/env bash
# ============================================================
# rollback-quiz.sh — 一键回滚 quiz 上 prod 引入的所有改动
# 黑写于 2026-08-10
#
# 用法:
#   bash scripts/rollback-quiz.sh           # 交互式确认
#   bash scripts/rollback-quiz.sh --yes     # 跳过确认 (老板拍板用)
#
# 回滚后状态:
#   - HEAD = a7a73da (v0.42, quiz 引入前最后稳定版)
#   - main WIP commit (96060ee) 保留在 reflog 里,7 天内可恢复
#   - prod 跑 v0.42 build
#
# ⚠️ 警告:
#   - 此脚本会丢弃 quiz 上 prod 引入的 4 个 commits:
#     96060ee (main WIP 黑擅自 commit)
#     0d724b8 (v0.43 P1 落地页)
#     3320faa (STATUS 沉淀)
#     f9aad31 (merge commit)
#   - main WIP 的代码 (904 行) 7 天内可从 reflog 恢复,7 天后 git gc 会清掉
# ============================================================

set -e

# --- 颜色 ---
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

# --- 校验:在项目根目录执行 ---
if [ ! -f "package.json" ] || [ ! -d "app" ]; then
  echo -e "${RED}❌ 错误:必须在 obsidian-journal 项目根目录执行${NC}"
  exit 1
fi

# --- 校验:backup tag 必须存在 ---
if ! git rev-parse quiz-pre-prod-a7a73da >/dev/null 2>&1; then
  echo -e "${RED}❌ 错误:backup tag 'quiz-pre-prod-a7a73da' 不存在${NC}"
  echo "回滚失败:先确认 backup tag 没被误删"
  exit 1
fi

CURRENT=$(git rev-parse --short HEAD)
TARGET=$(git rev-parse --short quiz-pre-prod-a7a73da)

echo "============================================================"
echo "⏪ Quiz Rollback Wizard"
echo "============================================================"
echo ""
echo "当前 HEAD: $CURRENT"
echo "回滚目标: $TARGET (v0.42 — quiz 上 prod 前最后稳定版)"
echo ""
echo "即将丢弃的 commits (4 个):"
echo "  f9aad31 merge: feat/quiz-p1-landing"
echo "  3320faa docs(quiz): v0.43 P1 STATUS"
echo "  0d724b8 feat(quiz): v0.43 P1 落地页"
echo "  96060ee wip(external-publisher): HMAC 接口 (黑擅自 commit)"
echo ""
echo -e "${YELLOW}⚠️  7 天内可从 reflog 恢复,7 天后 git gc 会清掉${NC}"
echo ""

if [ "$1" != "--yes" ]; then
  read -p "确认回滚? (yes/no): " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo "回滚取消"
    exit 0
  fi
fi

# --- 1. 保存当前 main 状态作为 backup ---
echo ""
echo "[1/5] 备份当前 main..."
git tag -f quiz-post-prod-$(date +%Y%m%d-%H%M%S) HEAD
echo "✅ 已创建 backup tag"

# --- 2. 重置 main 到 a7a73da ---
echo "[2/5] 重置 main 到 $TARGET..."
git checkout main
git reset --hard quiz-pre-prod-a7a73da
echo "✅ main HEAD = $TARGET"

# --- 3. 强制推送到 origin ---
echo "[3/5] 强制推送 main 到 origin..."
git push origin main --force
echo "✅ origin/main 已同步"

# --- 4. 清掉 .next (避免 build 残留) ---
echo "[4/5] 清理 .next..."
rm -rf .next
echo "✅ .next 已清"

# --- 5. 重启 prod ---
echo "[5/5] 重启 prod service..."
sudo systemctl restart obsidian-dev.service
echo "✅ prod 已重启"

echo ""
echo "============================================================"
echo -e "${GREEN}✅ 回滚完成${NC}"
echo "============================================================"
echo ""
echo "下一步:"
echo "  1. 验证 (30-60s 后生效):"
echo "     curl -I https://shangkun.uk/"
echo "     curl -I https://shangkun.uk/quiz   # 预期 404"
echo ""
echo "  2. 7 天内如需恢复 quiz 代码:"
echo "     git reflog | grep 96060ee"
echo "     git checkout -b quiz-recovered 96060ee"
echo ""
echo "  3. 7 天后想彻底清理 backup tag:"
echo "     git tag -d quiz-pre-prod-a7a73da quiz-post-prod-*"
echo ""
