import Link from "next/link";
import type { CSSProperties } from "react";

export default function HomePage() {
  const previewCells = Array.from({ length: 36 }, (_, index) => {
    const x = index % 6;
    const y = Math.floor(index / 6);
    const distance = Math.hypot(x - 2.5, y - 2.5);

    return (
      <span
        key={index}
        className="home-motion-demo__dot"
        style={{ "--home-wave-delay": `${distance * 0.12}s` } as CSSProperties}
      />
    );
  });

  return (
    <main className="home-page">
      <div className="home-page__card">
        <div className="home-motion-demo" aria-hidden="true">
          <div className="home-motion-demo__grid">{previewCells}</div>
        </div>
        <p className="panel__eyebrow">Dot Motion Builder</p>
        <h1>欢迎使用点阵动画编辑器</h1>
        <p>
          在这里，你可以自由绘制点阵、选择动效预设、编排序列帧，设计专属于自己的点阵动画样式，并导出为 Lottie、SVGA、SVG、HTML/CSS 或 PNG 序列。
        </p>
        <Link href="/editor" className="button">
          开始创作
        </Link>
      </div>
    </main>
  );
}
