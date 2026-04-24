import Link from "next/link";

export default function HomePage() {
  return (
    <main className="home-page">
      <div className="home-page__card">
        <p className="panel__eyebrow">New Build</p>
        <h1>Dot Motion Builder</h1>
        <p>
          V1 is focused on a usable editor shell with export-first architecture, including Lottie JSON and an SVGA-ready package path from day one.
        </p>
        <Link href="/editor" className="button">
          Open Editor
        </Link>
      </div>
    </main>
  );
}
