export type RgbColor = {
  r: number;
  g: number;
  b: number;
};

export function clampAlpha(value: number | undefined, fallback = 1) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, value));
}

export function normalizeHexColor(input: string | undefined, fallback = "#000000") {
  const raw = (input ?? fallback).trim().replace("#", "");
  const safe = raw.length === 3
    ? raw.split("").map((part) => `${part}${part}`).join("")
    : raw.padEnd(6, "0").slice(0, 6);

  if (!/^[0-9a-fA-F]{6}$/.test(safe)) {
    return fallback;
  }

  return `#${safe.toUpperCase()}`;
}

export function hexToRgb(hex: string | undefined): RgbColor {
  const safe = normalizeHexColor(hex).replace("#", "");

  return {
    r: Number.parseInt(safe.slice(0, 2), 16),
    g: Number.parseInt(safe.slice(2, 4), 16),
    b: Number.parseInt(safe.slice(4, 6), 16)
  };
}

export function rgbToHex(color: RgbColor) {
  const toHex = (value: number) => Math.min(255, Math.max(0, Math.round(value)))
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();

  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

export function rgbaWithOpacity(hex: string | undefined, opacity: number, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  const resolvedOpacity = clampAlpha(opacity) * clampAlpha(alpha);

  return `rgba(${r}, ${g}, ${b}, ${resolvedOpacity.toFixed(3)})`;
}

export function formatAlphaPercent(alpha: number | undefined) {
  return Math.round(clampAlpha(alpha) * 100);
}
