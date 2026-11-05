export type AvatarDomain = "all" | "coder" | "musician" | "video" | "christian" | "dreamer" | "work";
export type AvatarAction = "apple" | "bread" | "flash";
export const avatarExpressions = ["natural", "silly", "wow", "grin"] as const;
export const avatarDomains: { id: Exclude<AvatarDomain, "all">; label: string; word: string; node: string; angle: number; title: string; description: string; href: string; link: string }[] = [
  { id: "coder", label: "程序员", word: "CODER", node: "LabelCoder", angle: -.32, title: "用代码，把想法变成现实。", description: "计算机视觉、多模态评测、AI 工程。关心一个方法是否有效，也关心它能不能真正用起来。", href: "#work", link: "看看我做过的项目" },
  { id: "musician", label: "音乐人", word: "MUSICIAN", node: "LabelMusician", angle: .36, title: "代码之外，还有旋律。", description: "这是属于音乐的一面。先从日常记录开始认识，新的作品也会在这里慢慢留下来。", href: "/posts", link: "去文章里逛逛" },
  { id: "video", label: "视频创作者", word: "VIDEO CREATOR", node: "LabelVideo", angle: -.46, title: "换个镜头，看看这个世界。", description: "画面、声音和节奏，是另一种表达。这里收录我的视频与影像记录。", href: "/videos", link: "进入视频空间" },
  { id: "christian", label: "基督徒", word: "CHRISTIAN", node: "LabelChristian", angle: .45, title: "也给内心，留一个位置。", description: "关于信仰、生活与思考。这一面会随着日常记录，慢慢变得更具体。", href: "/posts", link: "阅读生活与思考" },
  { id: "dreamer", label: "梦想家", word: "DREAMER", node: "LabelDreamer", angle: -.22, title: "脑袋里，总有下一个故事。", description: "让还没发生的世界，先在文字里发生。欢迎进入故事，也欢迎带走一点想象力。", href: "/novels", link: "打开故事目录" },
  { id: "work", label: "工作经历", word: "WORK", node: "LabelWork", angle: .22, title: "有趣之外，也认真做事。", description: "从数据、实验到服务交付，按项目认识我做过的工作，以及我在其中的具体贡献。", href: "#work", link: "展开工作经历" }
];
