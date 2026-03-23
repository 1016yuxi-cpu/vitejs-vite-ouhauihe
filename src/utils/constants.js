// --- 🎨 开放配色系统 ---
export const COLOR_PRESETS = [
  {
    name: '马卡龙',
    colors: [
      { hex: "#f57c6e", name: "珊瑚红" },
      { hex: "#f2b56f", name: "杏橙" },
      { hex: "#fae69e", name: "暖黄" },
      { hex: "#84c3b7", name: "薄荷绿" },
      { hex: "#88d8db", name: "天蓝" },
      { hex: "#71b7ed", name: "湖蓝" },
      { hex: "#b8aeeb", name: "薰衣草紫" },
      { hex: "#f2a7da", name: "樱粉" },
    ]
  },
  {
    name: '明亮',
    colors: [
      { hex: "#ef4444", name: "正红" },
      { hex: "#f97316", name: "亮橙" },
      { hex: "#eab308", name: "金黄" },
      { hex: "#22c55e", name: "草绿" },
      { hex: "#06b6d4", name: "青蓝" },
      { hex: "#3b82f6", name: "亮蓝" },
      { hex: "#a855f7", name: "亮紫" },
      { hex: "#ec4899", name: "亮粉" },
    ]
  }
];

// TASK_COLORS 保留为全部 16 色的扁平数组（主要供全局查找颜色名称，或者旧代码兼容使用）
export const TASK_COLORS = COLOR_PRESETS.flatMap(p => p.colors);


// --- 💾 存储键名 ---
export const STORAGE_KEY_PLANS = 'pvr_plans';
export const STORAGE_KEY_ACTUALS = 'pvr_actuals';