# Phase 4 方案 — 心理测试问卷平台 (代码仓简版)

> �️ 方案稿,等老板拍 Q1-Q7 启动 P2  
> 完整方案见公仓: https://github.com/blackclaw0318/psych-quiz-bot/blob/main/docs/PHASE4_PLAN_QUIZ_PLATFORM.md

## 老板需求 (4 条)
1. 当前 `/quiz` 只是假前端 → 真实数据
2. obsidian-journal 新增"性格测试"分类,首页是问卷卡片列表
3. admin 后台管理问卷 (CRUD + 上下架 + 编辑)
4. LLM 自动生成问卷 + Skill + 定时任务

## 黑冷峻抽取 (6 项隐藏需求)
- **变现闭环**: 复用 v0.34 虎皮椒 9.9 元 (免费摘要 + 付费完整报告)
- **SEO 流量**: 每张问卷独立路由 + JSON-LD Quiz schema + sitemap
- **运营闭环**: cron 自动 + 灰度发布 + **人工终审** (XHS 2026-06-23 教训)
- **数据隐私**: 只存 IP hash + UA hash (GDPR 友好)
- **可扩展性**: schema 通用 (theme/dimensions/options),不写死 RBTI
- **审计追溯**: `generation_log JSON` 字段存 LLM 调用记录 (prompt/model/cost)

## 路由结构

```
/quiz                              ← 首页 (问卷卡片列表)
  ├── /quiz/[slug]                 ← 详情/开始
  │   ├── /take                    ← 答题
  │   ├── /result/[attemptId]      ← 报告
  │   └── /share/[attemptId]       ← 分享卡
  └── /quiz/categories/[cat]       ← 分类

/admin/quiz                        ← admin 后台
  ├── /new                         ← 新建 (手动 + LLM 双模式)
  ├── /[id]/edit                   ← 编辑
  ├── /[id]/preview                ← 预览
  └── /generate                    ← LLM 生成向导
```

## 数据模型 (5 张新表)

```sql
quiz_categories          -- 分类 (性格/心理/趣味/职业)
quiz_questionnaires      -- 问卷主表 (slug, status, scoring_logic JSON)
quiz_questions           -- 题目 (questionnaire_id, dimension, weight)
quiz_options             -- 选项 (dimension_scores JSON)
quiz_attempts            -- 答题记录 (answers, raw_scores, persona_result)
quiz_payments            -- 支付 (复用虎皮椒 webhook)
```

完整 schema 见 [公仓 docs/DATA_MODEL.md](https://github.com/blackclaw0318/psych-quiz-bot/blob/main/docs/DATA_MODEL.md)

## LLM Skill 设计 (R4 核心)

```
Skill 1: quiz-generate   → 输入主题 → 输出问卷草案 (50 题 + 16 persona)
Skill 2: quiz-validate   → 结构校验 (维度均衡 + 选项互斥 + 敏感词)
Skill 3: quiz-publish    → 写入数据库 (status=draft, 人工审校才 publish)
```

**关键约束**: LLM **只到 draft**,绝不自动 publish。XHS 2026-06-23 教训 — 自动上架触发风控。

## Phase 拆解 (估时 8d)

| Phase | 内容 | 估时 | 依赖 |
|---|---|---|---|
| **P2** | Schema + 首页 + RBTI mock | 0.5d | — |
| **P3** | 答题流程 + 算分 + 报告 | 1.5d | P2 |
| **P4** | admin CRUD + 状态机 | 1.5d | P2 |
| **P5** | 虎皮椒支付墙 | 1d | P3, 需 Q3 |
| **P6** | LLM skill + cron 定时 | 2d | P4, 需 Q7 |
| **P7** | 多主题矩阵 + 分类扩展 | 1.5d | P4 |

## 老板 Q1-Q7 决策清单

| # | 决策项 | 黑推荐 |
|---|---|---|
| **Q1** | 首期问卷主题 | ⭐ 红楼梦 RBTI (P0 已定) |
| **Q2** | 部署形态 | ⭐ 集成 obsidian-journal (P0 已定) |
| **Q3** | 支付方案 | ⭐ 虎皮椒 ¥9.9 (v0.34 已拍) |
| **Q4** | admin 权限 | ⭐ 仅老板 |
| **Q5** | LLM 审核 | ⭐ LLM + **人工终审** (XHS 教训) |
| **Q6** | 自动生成频率 | ⭐ 每周 3 (周二/四/六 02:00) |
| **Q7** | 首期题目数 | ⭐ 50 (经典长度) |

## 风险评估 (黑冷峻)

| # | 风险 | 等级 | 应对 |
|---|---|---|---|
| **W1** | LLM 生成质量差 | 🔴 P0 | Skill 2 自动校验 + 人工终审 + 灰度发布 |
| **W2** | 自动上架触发风控 | 🔴 P0 | **禁止自动 publish**,LLM 只到 draft |
| **W3** | 心理测试被举报歧视 | 🟡 P1 | 免责声明 + 敏感词过滤 |
| **W4** | 虎皮椒回调失败 | � P1 | 复用 v0.34 webhook + 重试 |
| **W5** | LLM 成本失控 | 🟡 P1 | 单问卷预算上限 ¥5 |

## 启动顺序

```
[1/3] 老板拍 Q1-Q7 (阻塞项: Q3 + Q5 + Q7)
        ↓
[2/3] 我开 P2 (0.5d) → /quiz 首页 + RBTI mock
        ↓
[3/3] 我开 P3 (1.5d) → 老板可完整答完 RBTI 看结果
        ↓
[并行] P4 (admin) + P5 (支付) + P6 (LLM) — 4.5d
```

## 文件交付清单

```
prisma/schema.prisma         ← +5 表
lib/db.ts + repo.ts          ← +quizRepo
lib/quiz/
├── scoring.ts               ← 算分算法
├── personas.ts              ← 16 类型定义
└── payment.ts               ← 虎皮椒集成
lib/skills/
├── quiz-generate.ts         ← Skill 1
├── quiz-validate.ts         ← Skill 2
└── quiz-publish.ts          ← Skill 3
app/quiz/                    ← 新增 5 个路由
app/admin/quiz/              ← 新增 4 个路由
app/api/quiz/                ← 公开 API
app/api/admin/quiz/          ← admin API
data/quiz/                   ← RBTI seed
data/themes.json             ← LLM 生成主题列表
scripts/cron-quiz-generate.sh ← 定时任务
```

---

**状态**: ⏸️ 等老板拍 Q1-Q7  
**最大阻塞**: Q3 + Q5 + Q7  
**预期**: 8d 内 P2-P6 完整上线

⬛ 黑 2026-08-11
