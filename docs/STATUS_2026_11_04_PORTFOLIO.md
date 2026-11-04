# 个人网站续作交接 · 2026-11-04

## 开发环境

- 本机源码：`/Users/shangkun/Desktop/workstation/code/pi/self_page`，沿用 `feat/interactive-portfolio` 分支。
- 技术栈：Next.js 14.2.18 / React 18.3.1 / TypeScript / Tailwind / Node 内置 SQLite / Three.js 0.187。
- 本机 Node 24.13.0；服务器 Node 24.16.0、npm 11.13.0。旧 README 和 package.json 的版本号不表示实际功能进度。
- 服务器：用户已有 SSH 密钥连接 `root@111.228.46.221`；私钥不进源码、归档或报告。
- 服务器 Git 工作区：`/root/.openclaw/workspace/projects/obsidian-journal`；线上原运行目录 `/srv/obsidian-journal`。
- 个人网站：`obsidian-dev.service`，`homepage` 身份，监听 `127.0.0.1:3003`。沿用现有 Nginx / Cloudflare 路由。
- GenSticker 使用独立 `gensticker.service` / `gensticker-worker.service`，内部端口 3001。本轮不修改其环境、入口、业务目录、定时任务或路由。

## 已实现

- 保留文章、小说、视频、资源、后台，首页改为个人介绍、三维角色、按活动时间排列的项目时间线。
- 9 段公开项目摘要、独立详情页、本人贡献与交付状态、简历视图，共用 `lib/portfolio-projects.json`。
- 动漫哑光 v3 GLB：独立虹膜/瞳孔跟随页面指针，限制角度拖动、重置、自然眨眼和表情按钮。眼距沿用上一聊天最后调整后的 v3 原稿。
- 项目滚动/筛选联动角色状态与舞台；手机复用唯一场景并保持紧凑舞台可见。
- 修复详情返回时间线时被 Lenis 重置到顶的问题，支持 hash、历史导航、页面转场延迟挂载。
- WebGL 加载失败或上下文中断时保留备用图，恢复后显示模型；卸载释放 GPU 资源和解码后的 ImageBitmap。

## 经历材料范围

本轮通过 `sitech-posts` 验证上一聊天最新 Cookie，当前公司 VPN 路线可达，但读取本人 review 返回 `login_required`。用户随后明确选择本轮使用已核验的 70 篇历史缓存，整理出覆盖 2025-12 至 2026-10 的部分项目记录。全量历史采集不在本轮完成声明之内。

原文、认证、内网链接、详细证据映射留在私有研究范围。详见 `PORTFOLIO_CONTENT.md`；不把项目活动时间当作任职起止，不把材料交付当作生产验收。

## 验证

- 类型检查、Lint、198 个单元测试、现有全部集成测试通过。
- 最终 26 项首页/作品集 E2E 全部通过，覆盖真实眼球、手机联动、详情锚点返回、WebGL 加载中断/恢复、同页进度、旧栏目和登录。
- 生产构建通过。构建数据库使用临时独立路径；初始化后的 build 设置 `SKIP_DB_INIT=1`，避免并行 worker 反复重建 FTS。
- 当前修改不含数据库结构迁移，候选与正式服务也设置 `SKIP_DB_INIT=1`，不在启动时重建线上索引。后续若改 schema，需显式审核和执行迁移。
- 服务器 npm 11.13 检出旧锁缺少两个跨平台 optional 依赖，现已精确补齐；其他依赖版本未变。

本机可复验：先运行 3099 开发服务，再执行 `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3099 npx playwright test tests/e2e/portfolio.spec.ts tests/e2e/home.spec.ts`。配置自动使用本机 Chrome；软件 WebGL 参数只用于测试浏览器。禁止将重置数据库的 E2E 全局 setup 指向生产站点。

## 提交与发布

- `a814313`：v3 形象、独立眼神、手机舞台与导航修复。
- `19f9d70`：验收测试、跨平台依赖锁、部署验证与资料范围。
- `148c62d`：WebGL 加载竞态、位图释放和构建/运行数据库隔离。
- `bb8b5d0`：修复反向代理下后台跳转 localhost，以及同页返回首页的进度条残留；候选检查新增公网登录地址断言。
- GitHub 仓库 `blackclaw0318/obsidian-journal`。本机默认 GitHub 凭据无该仓库权限，沿用服务器 Git 中转；服务器推送须显式使用已有 obsidian 仓库密钥，不能依赖默认身份。
- 发布脚本 `scripts/deploy-portfolio.sh` 从已验证 Git archive 在独立 release 目录安装/构建；先备份，候选端口 3098 验证成功后只切换个人网站 unit。数据和上传仍链接到原稳定目录。

最终发布提交：`bb8b5d05ef2b0da102d76178e9eba848aac37509`。首版 `148c62d` 保留为上一可回滚版本。

- 公网地址：`https://www.shangkun.uk/`。
- 当前 release：`/srv/obsidian-journal-releases/20261104T102109Z-bb8b5d05ef2b`。
- 当前备份：`/var/backups/homepage/20261104T102109Z`，含通过 SQLite `quick_check` 的一致性快照、原源码、unit 配置、上一 release override 与发布日志。首版备份 `/var/backups/homepage/20261104T100758Z` 继续保留。
- 发布后确认 `homepage` 身份、3003 端口；`obsidian-dev`、`gensticker`、`gensticker-worker`、`nginx`、`cloudflared` 均 active；GenSticker `/healthz` 为 `ok`、1010 个模板。
- 线上 GLB SHA256：`4e5df82d3e47855690a6f92dfe06dcb5d84c61aa3602f2d87ef7df3195016ab0`，与验收文件一致。

回滚本次导航修复时，将当前备份中的 `previous-override.conf` 复制回 `/etc/systemd/system/obsidian-dev.service.d/zzz-portfolio-release.conf`，执行 `systemctl daemon-reload` 后仅重启 `obsidian-dev`，恢复首版 `148c62d`。若需要完全恢复改版前代码，将此 override 移入备份目录（保留而不是删除），刷新 systemd 后仅重启个人网站，原配置会使用 `/srv/obsidian-journal`。没有结构迁移，不应为回滚代码而覆盖现有业务数据库。
