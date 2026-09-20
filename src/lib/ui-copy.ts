import { InactiveStyle, MotionPresetId } from "@/types/dot-motion";

export type Language = "cn" | "en";

export const uiCopy = {
  cn: {
    add: "+ 新建",
    previewAll: "全部预览",
    stopPreview: "停止预览",
    export: "导出",
    settings: "设置",
    grid: "网格",
    pattern: "图案",
    animation: "动画",
    colors: "颜色",
    effects: "效果",
    shape: "形状",
    rectangle: "圆角",
    square: "方形",
    circle: "圆形",
    hexagon: "六边形",
    star: "星型",
    diamond: "菱形",
    customMode: "自定义",
    sequenceMode: "序列",
    addFrame: "+ 序列",
    removeFrame: "- 序列",
    primaryColor: "激活颜色",
    glow: "发光",
    spread: "范围",
    backgroundColor: "未激活颜色",
    gridSize: "点阵数量",
    gap: "间距",
    activeCells: "激活点",
    inactiveCells: "未激活点",
    playbackSpeed: "速度",
    direction: "方向",
    originX: "原点 X",
    originY: "原点 Y",
    speed: "速度 (FPS)",
    previewAnimation: "预览动画",
    copyOutput: "复制",
    copied: "已复制",
    downloadFile: "下载",
    closeExport: "关闭导出窗口",
    exportFile: "导出文件"
  },
  en: {
    add: "+ Add",
    previewAll: "Preview All",
    stopPreview: "Stop Preview",
    export: "Export",
    settings: "Settings",
    grid: "Grid",
    pattern: "Pattern",
    animation: "Animation",
    colors: "Colors",
    effects: "Effects",
    shape: "Shape",
    rectangle: "Rounded",
    square: "Square",
    circle: "Circle",
    hexagon: "Hexagon",
    star: "Star",
    diamond: "Diamond",
    customMode: "Custom",
    sequenceMode: "Sequence",
    addFrame: "+ Seq",
    removeFrame: "- Seq",
    primaryColor: "Active Color",
    glow: "Glow",
    spread: "Spread",
    backgroundColor: "Inactive Color",
    gridSize: "Grid Size",
    gap: "Gap",
    activeCells: "Active Cells",
    inactiveCells: "Inactive Cells",
    playbackSpeed: "Speed",
    direction: "Direction",
    originX: "Origin X",
    originY: "Origin Y",
    speed: "Speed (FPS)",
    previewAnimation: "Preview Animation",
    copyOutput: "Copy",
    copied: "Copied",
    downloadFile: "Download",
    closeExport: "Close export panel",
    exportFile: "Export File"
  }
} as const;

export const inactiveStyleCopy: Record<Language, Record<InactiveStyle, string>> = {
  cn: {
    none: "无（静态）",
    "static-dim": "静态暗点",
    breathe: "呼吸",
    ghost: "幽灵网格"
  },
  en: {
    none: "None (Static)",
    "static-dim": "Static Dim",
    breathe: "Breathe",
    ghost: "Ghost Grid"
  }
};

export const motionPresetCopy: Record<Language, Record<MotionPresetId, { name: string; description: string }>> = {
  cn: {
    wave: { name: "波浪", description: "可向上下左右或对角线推进的错峰波浪。" },
    sweep: { name: "扫描", description: "更干净的扫描前沿，带柔和尾迹。" },
    bloom: { name: "扩散", description: "从指定原点向外扩散的亮度波。" },
    "fish-eye": { name: "鱼眼镜头", description: "参考站的对角亮度波、径向缩放与自然留白。" },
    checkerboard: { name: "棋盘", description: "奇偶格分组交替闪烁。" },
    pinwheel: { name: "风车", description: "按角度象限围绕中心旋转推进。" },
    burst: {name: "爆发", description: "单圈从原点向外爆发并逐渐消失。"},
    random: {name: "随机噪点", description: "可重复的帧噪点在网格中闪烁。"},
    "diamond-wave": {name: "菱形扩散", description: "按曼哈顿距离从原点扩散。"},
    radar: {name: "雷达", description: "旋转光束与渐隐尾迹。"},
    heartbeat: {name: "心跳", description: "一强一弱的双脉冲与短暂停顿。"},
    breathing: {name: "呼吸", description: "所有选中点阵平滑明暗交替。"}
  },
  en: {
    wave: { name: "Wave", description: "A staggered wave that travels horizontally, vertically, or diagonally." },
    sweep: { name: "Sweep", description: "A clean scanning front with a softer trailing edge." },
    bloom: { name: "Bloom", description: "A center-out bloom that expands from a chosen origin point." },
    "fish-eye": { name: "Fish-eye Lens", description: "The reference's diagonal brightness wave, radial scaling, and natural spacing." },
    checkerboard: { name: "Checkerboard", description: "Alternating parity groups pulse in a checker rhythm." },
    pinwheel: { name: "Pinwheel", description: "Angular quadrants spin around the center like a pinwheel." },
    burst: {name: "Burst", description: "A single ring explodes from the origin and fades."},
    random: {name: "Random", description: "Repeatable frame noise flickers across the grid."},
    "diamond-wave": {name: "Diamond", description: "A Manhattan-distance diamond expands from the origin."},
    radar: {name: "Radar", description: "Rotating beam with a fading trail."},
    heartbeat: {name: "Heartbeat", description: "A strong beat followed by a softer echo."},
    breathing: {name: "Breathing", description: "Smooth, synchronized breathing."}
  }
};
