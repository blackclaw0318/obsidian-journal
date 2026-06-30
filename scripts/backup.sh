#!/usr/bin/env bash
# ============================================================
# backup.sh — SQLite 数据库自动备份 (Phase 3.10, v0.17)
# 用法: bash scripts/backup.sh [DB_PATH]
# 默认备份 data/dev.db → data/backups/dev-YYYY-MM-DD-HHMM.db.gz
# 保留最近 7 天, 老的自动删
# ============================================================
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DB_PATH="${1:-data/dev.db}"
BACKUP_DIR="data/backups"
KEEP_DAYS=7
TS=$(date '+%Y-%m-%d-%H%M%S')
DB_NAME=$(basename "$DB_PATH" .db)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}-${TS}.db.gz"

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_PATH" ]; then
  echo "❌ 数据库不存在: $DB_PATH"
  exit 1
fi

echo "📦 备份 $DB_PATH → $BACKUP_FILE"

# 用项目自带的 Node 脚本做备份 (避免依赖系统 sqlite3 命令)
NODE_PATH="$ROOT/node_modules" node --input-type=module -e "
  import Database from 'better-sqlite3';
  const db = new Database('$DB_PATH');
  try {
    await db.backup('$BACKUP_DIR/${DB_NAME}-${TS}.db');
    console.log('  backup done (WAL-safe)');
  } catch (e) {
    // 备用: VACUUM INTO
    console.log('  fallback to VACUUM INTO:', e.message);
    db.exec('VACUUM INTO \\'$BACKUP_DIR/${DB_NAME}-${TS}.db\\'');
  }
  db.close();
"
# 压缩
gzip -9 "$BACKUP_DIR/${DB_NAME}-${TS}.db"
# 大小
size=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ 备份完成: $BACKUP_FILE ($size)"

# 清理老备份 (保留 KEEP_DAYS 天)
deleted=$(find "$BACKUP_DIR" -name "${DB_NAME}-*.db.gz" -mtime +$KEEP_DAYS -delete -print | wc -l)
if [ "$deleted" -gt 0 ]; then
  echo "🗑️ 清理 $deleted 个老备份 (>$KEEP_DAYS 天)"
fi

# 列表
echo ""
echo "📋 当前备份列表:"
ls -lah "$BACKUP_DIR/${DB_NAME}-"*.db.gz 2>/dev/null | tail -10