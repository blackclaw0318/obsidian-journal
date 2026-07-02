# v0.29.0 收官 — FTS5 中文分词 (P2-19 兑现)

**日期**: 2026-07-03 00:31–00:55
**version**: 0.28.0 → 0.29.0
**触发**: 老板 00:31 命令"继续开发F"
**P2-19 状态**: ⏳ → ✅ done

---

## 🎯 老板原话

> "继续开发F" (FTS5 中文分词 P2-19)

## 🔄 决策回滚 (工程教训)

| 候选 | 评估 | 决定 |
|---|---|---|
| `@node-rs/jieba` (Rust N-API) | 安装成功, 但 dict.txt 35万词却缺基础词 ("程序员"/"小红书"/"黑曜石"都不在), 默认按字拆, 实际效果差 | ❌ 卸装 |
| `nodejieba` (C++ native) | 需要 cmake 编译, 跨平台风险 | ❌ 不走 |
| **FTS5 trigram (SQLite 内置)** | 3 字滑窗, 中文 3+ 字完美命中, 2 字/单字走 LIKE 兜底, **零依赖** | ✅ 选用 |
| FTS5 + jieba 字典预热 | 需要维护项目特定词典 (5k 词), 工程量 | ⏸ 后续 |

## 📦 v0.28 → v0.29 新增 (4 文件 +102 -17)

### 1. db.ts FTS5 schema 切 trigram
- `tokenize='unicode61 remove_diacritics 2'` → `tokenize='trigram'`
- migration: `DROP TABLE IF EXISTS posts_fts + DROP TRIGGER posts_ai/ad/au` + recreate
- 末尾自动 `INSERT INTO posts_fts(posts_fts) VALUES('rebuild')` (trigram 需显式 rebuild, trigger 不生成 3-gram index)

### 2. repo.ts search 双轨架构
- **轨 1 FTS5 trigram**: 3+ 字中文 / 英文 3+ 字 / 英文 phrase
- **轨 2 LIKE 兜底**: 1-2 字中文 (trigram 限制) + FTS5 失败保护
- **合并去重** (按 post id, FTS5 优先)
- 性能: 0-2ms (in-memory LIKE + FTS5)
- query 转义: 去除 FTS5 保留字符 `'"()`

### 3. 中文搜索测试 (+5 个)
- P2-19 中文 3 字 trigram 命中 (黑曜石)
- P2-19 中文 2 字 LIKE 兜底 (曜石)
- P2-19 中文 4 字 (黑曜石项目)
- P2-19 中文 1 字 LIKE (黑)
- P2-19 中文不应返回草稿 (status filter)

## 🧪 验收

| 维度 | 数据 |
|---|---|
| typecheck | 0 error |
| lint | 0 warning |
| unit | 151/151 ✅ |
| integration | exit 0 ✅ (含 5 新 P2-19 测试) |
| e2e | 121/121+2skip ✅ (0 破坏) |
| visual | 9/9 ✅ (0 破坏) |
| **总计** | **293/293+2skip (0 改, 仅 +5 search 测试)** |

## 🧠 搜索实测 (种子数据)

```
q="黑曜石" 3字 trigram 命中: "你好, 黑曜石日志"
q="曜石" 2字 LIKE 兜底命中:  "你好, 黑曜石日志"
q="石日志" 3字滑窗命中:      "你好, 黑曜石日志"
q="FTS5" 英文 trigram 命中:  2 篇
q="Vitest" 英文 trigram 命中: 1 篇
q="obsidian" 英文 命中 3 篇
q="测试" 2字 LIKE 命中:     1 篇
q="部署" 2字 LIKE 命中:     2 篇
```

## ⚠️ 踩坑记录 (强制入 MEMORY)

- **@node-rs/jieba dict 缺基础词**: 35 万词但 "程序员/小红书/黑曜石" 都不在, 默认按字拆, 实际工程化差 → 卸装
- **FTS5 trigram + external content 需 rebuild**: trigger 同步仅插入 row, 不生成 3-gram index → 必须在 initSchema 末尾 `INSERT INTO posts_fts VALUES('rebuild')` 否则 query 全返回 0
- **trigram 不支持 1-2 字中文**: 工程限制 → 双轨 (trigram + LIKE 合并去重)
- **rebuild 幂等**: posts 为空时也是 noop, 安全

## 📁 改动文件

```
lib/db.ts                            | 17 ++++++++++--
lib/repo.ts                          | 56 ++++++++++++++++++++++++++++------
package-lock.json                    |  4 +-- (jieba 卸装)
tests/integration/search.test.mts    | 42 +++++++++++++++++++++++++++++
```

## 🎯 下一步 (等老板选)

| 选项 | 内容 | 黑推荐 |
|---|---|---|
| G | favicon/og_image 上传 UI (P2-20/21) | ⭐⭐ |
| H | Worker 独立仓 (P2-16, 百度解析) | ⭐⭐ (需老板建仓决策) |
| I | 性能 (Lighthouse ≥95 / LCP <1.5s) | ⭐⭐ |
| J | 双仓 deploy 脚本 (deploy-main + deploy-worker) | ⭐ |
| K | README + 运营文档 | ⭐ |
| L | 监控告警 (企业微信 webhook, 复用 xhs-novel-bot 经验) | ⭐⭐⭐ |

