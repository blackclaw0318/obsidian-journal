# 2026-11-05 · 贴纸角色与工作项目续作

本轮按用户提供的五步流程重做，功能提交为 `e9566ddd6a792a651582bfd89b37f2107f5947e9`。工作内容归并提交为 `3bd7671`；两者均已推送 GitHub 的 `feat/interactive-portfolio` 分支。

## 形象与模型

- 以用户原头像为身份来源，生成干净头部底稿，以及吐舌眨眼、惊讶、大笑三张带英文贴纸的表情参考。Pinterest 两图仅借鉴脸部贴纸的白边、异形轮廓与粗字风格。
- 可编辑源：`design/avatar-v4/avatar-v4.blend`，纹理已打包。脚本、实际生成提示和节点合同位于 `scripts/avatar-v4/`。
- 头部由官方 TripoSR 从干净底稿重建，在 Blender 中分离 Head/Torso。双眼、手、苹果、整片/缺口面包、手机、闪光灯、口腔、牙齿、舌头与六枚有厚度的贴纸均有独立部件。
- 59,785 个三角面，139 节点，118 mesh，Surprise/Grin 两个形变。原始导出 2,317,352 字节，无损 Meshopt 后公开 GLB 为 1,707,928 字节；备用 WebP 为 60,894 字节。压缩不改变节点、层级、形变或 PNG 字节。
- 原始 GLB SHA-256：`afcebdb7fcc42b3744b0c9eab259bf93ac5941cd140a57837dc02b3bcd40045a`；公开 GLB：`ebb9b786bdd85c6e062fecd513effce529b33e820dfa3abdcefb5b9f0b9c2dcb`。

## 网站行为

- 六个标签为 CODER、MUSICIAN、VIDEO CREATOR、CHRISTIAN、DREAMER、WORK。点击模型贴纸或页面按钮，实际相机转向对应标签并改变焦点，再由介绍入口进入原有内容栏目或工作经历。
- 左右瞳孔独立转动；眼部水平角限制为 ±0.15 弧度，避免极限视线穿面。苹果抛接带动手腕，面包切换实际布尔缺口，手机短暂闪光并伴随轻微手部动作。表情以独立眼皮、口腔和形变驱动。
- 相机限制在正面约 ±30°。这是一套单视图推断头部与轻量表情控制，不能当成经过完整多视图校准的 360° 数字人或完整面部骨骼。
- 手机有相同的可访问按钮；减少动画时停止跟随/呼吸/自动眨眼并直接切换镜头。无 WebGL 或加载失败时保留最终模型的备用图和全部内容入口。模型视口外停止绘制，最高像素比 1.5、约 30 fps，卸载时释放纹理、ImageBitmap、几何体与材质。
- 工作经历用同一份公开 JSON 归并为四个项目。旧五个详情地址 HTTP 308，旧首页 hash 仍可定位。原始 70 篇缓存、会话、内网地址和证据映射不发布。
- 文章、小说、视频、资源、版权、工作详情、简历统一纸白/炭黑/酸绿/珊瑚红风格。修复手机菜单遮罩仅覆盖导航条，以及原生 hash 历史导致 Back 地址与页面不一致的问题。

## 验证

- `npm run verify:fast` 通过：类型、lint、200 项单元及既有全部集成检查。
- 使用独立构建数据库执行生产构建通过，未读写运行数据。
- 两份定向 Playwright 文件共 32 项全部通过。覆盖相机实际坐标、双眼、苹果真实位移、面包几何显隐、闪光节点、减少动画、WebGL 不可用及加载期 context 丢失/恢复、四项目、308、hash、Back/Forward、手机亮暗布局和菜单遮罩。
- Blender 默认重导出命令已验证；输出原始 GLB 与建模导出 SHA-256 一致。源模型的正面、左右 30°、双眼凝视、眨眼、吐舌、笑、惊讶及道具均有回导 PNG 证明。
- 本机证明材料在 `.local/qa-v4/`，完整桌面首屏为 `full-32/avatar-desktop-1440.png`。这些测试截图与私有研究不随部署包发布。

## 发布记录

沿用 `scripts/deploy-portfolio.sh` 的独立目录构建、备份、候选检查和回滚流程。个人网站仍是 `obsidian-dev.service` 的 127.0.0.1:3003，Nginx 127.0.0.1:3000 和现有公网隧道保持原路由。GenSticker 仍是独立的 3001 服务。

- 已部署功能提交：`e9566ddd6a792a651582bfd89b37f2107f5947e9`。
- 独立 release：`/srv/obsidian-journal-releases/20261105T075532Z-e9566ddd6a79`。
- 私有备份与上一版 unit override：`/var/backups/homepage/20261105T075532Z`。回滚应恢复其中 `previous-override.conf` 到网站 override，再执行 daemon-reload 并只重启 `obsidian-dev`；不改业务数据或其他服务。
- 服务器候选检查及最终切换成功；内部 3003 与 Nginx 3000 均为 HTTP 200。网站、Nginx、Cloudflare 隧道、GenSticker API 和 worker 五项服务全部 active，GenSticker `/healthz` 为 ok、1010 模板。
- 公网 IPv4 首页与模型均 HTTP 200；下载模型 SHA-256 与已测试压缩模型一致。公网浏览器地址为 `https://www.shangkun.uk/`，实际状态 `data-model=avatar-v4`、`data-ready=true`，不是仅展示静态备用图。
- 公网实际验收截图：`.local/qa-v4/home-live.png`。开发预览 3099 已停止，线上仍沿用原 3003 服务端口与原 Nginx 路由。
