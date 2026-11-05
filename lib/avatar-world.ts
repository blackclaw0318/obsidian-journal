export type AvatarDomain = "all" | "coder" | "musician" | "video" | "christian" | "dreamer" | "work";
export type AvatarAction = "apple" | "bread" | "flash";
export const avatarExpressions = ["natural", "silly", "wow", "grin"] as const;
// The scene normalizes any replacement portrait to 3.1 units high. Keep the
// interactive node names in the rig when replacing this asset.
export const avatarAsset = { url: "/models/avatar-v4.glb", poster: "/images/avatar-v4/poster.webp", id: "avatar-v4" };

export const avatarCameraShots = {
  portrait: { domain: "all", look: [0, 1.65, 0], angle: -.025, zoom: 1.16, elevation: .025, anchor: 0 },
  coder: { domain: "coder", look: [.43, 2.10, .12], angle: -.29, zoom: .49, elevation: .055, anchor: .14 },
  work: { domain: "work", look: [.53, 1.87, .12], angle: .22, zoom: .48, elevation: .02, anchor: .14 },
  delivery: { domain: "work", look: [.56, 1.96, .10], angle: .34, zoom: .45, elevation: .075, anchor: .1 },
  videoWork: { domain: "video", look: [.49, 2.06, .08], angle: -.39, zoom: .43, elevation: .03, anchor: .12 },
  document: { domain: "coder", look: [.50, 2.12, .07], angle: -.18, zoom: .46, elevation: -.035, anchor: .1 },
  vision: { domain: "work", look: [.51, 2.02, .04], angle: .42, zoom: .43, elevation: -.045, anchor: .1 },
  musician: { domain: "musician", look: [.48, 2.21, .05], angle: .35, zoom: .44, elevation: .08, anchor: .13 },
  video: { domain: "video", look: [.52, 2.00, .1], angle: -.48, zoom: .45, elevation: .015, anchor: .13 },
  christian: { domain: "christian", look: [.52, 2.04, .06], angle: .48, zoom: .44, elevation: -.055, anchor: .13 },
  dreamer: { domain: "dreamer", look: [.44, 2.12, .07], angle: -.24, zoom: .43, elevation: -.12, anchor: .12 },
  farewell: { domain: "all", look: [.35, 1.77, 0], angle: .10, zoom: .73, elevation: .03, anchor: 0 }
} satisfies Record<string, { domain: AvatarDomain; look: number[]; angle: number; zoom: number; elevation: number; anchor: number }>;
export type AvatarShot = keyof typeof avatarCameraShots;
export interface AvatarScrollPose { from: AvatarShot; to: AvatarShot; mix: number; progress: number; index: number; }
export interface AvatarScrollSource { current: AvatarScrollPose; }
export const initialAvatarScrollPose: AvatarScrollPose = { from: "portrait", to: "portrait", mix: 0, progress: 0, index: 0 };
export const avatarDomains: { id: Exclude<AvatarDomain, "all">; label: string; word: string; node: string; angle: number; title: string; description: string; href: string; link: string }[] = [
  { id: "coder", label: "程序员", word: "CODER", node: "LabelCoder", angle: -.32, title: "用代码，把想法变成现实。", description: "计算机视觉、多模态评测、AI 工程。关心一个方法是否有效，也关心它能不能真正用起来。", href: "#work", link: "看看我做过的项目" },
  { id: "musician", label: "音乐人", word: "MUSICIAN", node: "LabelMusician", angle: .36, title: "代码之外，还有旋律。", description: "这是属于音乐的一面。先从日常记录开始认识，新的作品也会在这里慢慢留下来。", href: "/posts", link: "去文章里逛逛" },
  { id: "video", label: "视频创作者", word: "VIDEO CREATOR", node: "LabelVideo", angle: -.46, title: "换个镜头，看看这个世界。", description: "画面、声音和节奏，是另一种表达。这里收录我的视频与影像记录。", href: "/videos", link: "进入视频空间" },
  { id: "christian", label: "基督徒", word: "CHRISTIAN", node: "LabelChristian", angle: .45, title: "也给内心，留一个位置。", description: "关于信仰、生活与思考。这一面会随着日常记录，慢慢变得更具体。", href: "/posts", link: "阅读生活与思考" },
  { id: "dreamer", label: "梦想家", word: "DREAMER", node: "LabelDreamer", angle: -.22, title: "脑袋里，总有下一个故事。", description: "让还没发生的世界，先在文字里发生。欢迎进入故事，也欢迎带走一点想象力。", href: "/novels", link: "打开故事目录" },
  { id: "work", label: "工作经历", word: "WORK", node: "LabelWork", angle: .22, title: "有趣之外，也认真做事。", description: "从数据、实验到服务交付，按项目认识我做过的工作，以及我在其中的具体贡献。", href: "#work", link: "展开工作经历" }
];
