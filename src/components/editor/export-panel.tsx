"use client";

import { useEffect, useMemo, useState } from "react";
import { generateExportArtifact } from "@/lib/exporters";
import { Language, uiCopy } from "@/lib/ui-copy";
import { useEditorStore, useSelectedLoader } from "@/stores/use-editor-store";
import { ExportFormat } from "@/types/dot-motion";
import { Button } from "@/toolcraft/ui/components/primitives/button";
import { SegmentedControl } from "@/toolcraft/ui/components/controls/segmented/segmented-control";

const formats: { value: ExportFormat; label: string }[] = [
  { value: "web", label: "JavaScript" },
  { value: "swift", label: "Swift" }
];

type ExportPanelProps = {
  language: Language;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExportPanel({ language }: ExportPanelProps) {
  const project = useEditorStore((state) => state.project);
  const format = useEditorStore((state) => state.exportFormat);
  const setFormat = useEditorStore((state) => state.setExportFormat);
  const loader = useSelectedLoader();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const t = uiCopy[language];
  const effectiveFormat = formats.some((item) => item.value === format) ? format : "web";
  const artifact = useMemo(
    () => generateExportArtifact(effectiveFormat, project, loader),
    [effectiveFormat, project, loader]
  );
  useEffect(() => { setCopied(false); setCopyError(false); }, [artifact]);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1200);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(artifact.content);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  }

  async function handleDownload() {
    downloadBlob(new Blob([artifact.content], { type: artifact.mimeType }), artifact.filename);
  }

  return (
    <section className="panel panel--export">
      <div className="panel__header">
        <div>
          <h2>{t.exportFile}</h2>
        </div>
      </div>
      <div className="export-platform-control">
        <SegmentedControl
          ariaLabel={language === "cn" ? "导出格式" : "Export format"}
          name={language === "cn" ? "格式" : "Format"}
          value={effectiveFormat}
          options={formats}
          onValueChange={(value) => {
            if (value === "web" || value === "swift") setFormat(value);
          }}
        />
      </div>
      <div className="export-meta">
        <span>{artifact.filename}</span>
      </div>
      <pre className="export-code">{artifact.content}</pre>
      <div className="panel__actions">
        {copyError ? <p role="alert">{language === "cn" ? "复制失败，请下载文件或手动复制。" : "Copy failed. Download the file or copy manually."}</p> : null}
        <Button type="button" variant="outline" onClick={handleCopy}>
          {copied ? t.copied : t.copyOutput}
        </Button>
        <Button type="button" variant="default" onClick={handleDownload}>
          {t.downloadFile}
        </Button>
      </div>
    </section>
  );
}
