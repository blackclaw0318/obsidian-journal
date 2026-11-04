import projectData from "./portfolio-projects.json";

export type ProjectCategory = "vision" | "multimodal" | "engineering";
export type CharacterScene = "hello" | "vision" | "motion" | "build" | "research";
export interface PortfolioProject {
  slug: string;
  date: string;
  period: string;
  title: string;
  subtitle: string;
  summary: string;
  contributions: string[];
  outcome: string;
  status: string;
  tags: string[];
  category: ProjectCategory;
  scene: CharacterScene;
}

// Deliberately contains only edited public summaries. Evidence and raw posts live outside Git.
export const portfolioProjects = projectData as PortfolioProject[];
export const projectCategories: { id: "all" | ProjectCategory; label: string }[] = [
  { id: "all", label: "全部经历" },
  { id: "vision", label: "计算机视觉" },
  { id: "multimodal", label: "多模态与评测" },
  { id: "engineering", label: "工程与工具" }
];

export function projectBySlug(slug: string) {
  return portfolioProjects.find((project) => project.slug === slug);
}

export function projectYear(date: string) {
  return date.slice(0, 4);
}

export const characterScenes: Record<CharacterScene, { label: string; word: string; caption: string }> = {
  hello: { label: "好奇模式", word: "HELLO, WORLD.", caption: "嘿，往下滑。一起看看我做过什么。" },
  vision: { label: "观察模式", word: "LOOK CLOSER.", caption: "换一个角度，细节就会说话。" },
  motion: { label: "行动模式", word: "MAKE A MOVE.", caption: "一帧是画面，连起来才是故事。" },
  build: { label: "构建模式", word: "MAKE IT WORK.", caption: "把复杂的流程，做成顺手的工具。" },
  research: { label: "思考模式", word: "STAY CURIOUS.", caption: "先把问题问对，再让实验回答。" }
};
