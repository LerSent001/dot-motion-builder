import { compileTimeline } from "@/lib/core/timeline";
import { sanitizeName } from "@/lib/exporters/utils";
import { ExportArtifact, LoaderComponent } from "@/types/dot-motion";

function pascalCase(value: string) {
  return value
    .replace(/(^\w|-\w)/g, (part) => part.replace("-", "").toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, "");
}

export function exportReact(loader: LoaderComponent): ExportArtifact {
  const timeline = compileTimeline(loader);
  const componentName = `${pascalCase(loader.name)}Loader`;
  const className = sanitizeName(loader.name);

  const cells = timeline.tracks
    .map(
      (track) =>
        `        <span className="${className}__cell" style={{ ["--delay" as string]: "${track.delayMs}ms" }} />`
    )
    .join("\n");

  return {
    format: "react",
    filename: `${className}.tsx`,
    mimeType: "text/plain",
    content: `import "./${className}.css";

type ${componentName}Props = {
  label?: string;
};

export function ${componentName}({ label = "${loader.text?.content ?? loader.name}" }: ${componentName}Props) {
  return (
    <div className="${className}">
      <div className="${className}__grid">
${cells}
      </div>
      <span className="${className}__label">{label}</span>
    </div>
  );
}

export default ${componentName};`
  };
}
