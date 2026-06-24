// ============================================================
// 重置数据库 (dev only)
// ============================================================
import { initSchema } from "../lib/db";
import { resetAllData } from "../lib/repo";

initSchema();
resetAllData();
console.log("✅ 数据库已重置");