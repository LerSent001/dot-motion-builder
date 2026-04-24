"use client";

import { PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { formatAlphaPercent, hexToRgb, normalizeHexColor, rgbToHex } from "@/lib/colors";

type ColorControlProps = {
  label: string;
  color: string;
  alpha?: number;
  onColorChange: (value: string) => void;
  onAlphaChange: (value: number) => void;
  disabled?: boolean;
};

type HsvColor = {
  h: number;
  s: number;
  v: number;
};

type EyeDropperConstructor = new () => {
  open: () => Promise<{ sRGBHex: string }>;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function rgbToHsv({ r, g, b }: ReturnType<typeof hexToRgb>): HsvColor {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;

  if (delta !== 0) {
    if (max === red) {
      hue = 60 * (((green - blue) / delta) % 6);
    } else if (max === green) {
      hue = 60 * ((blue - red) / delta + 2);
    } else {
      hue = 60 * ((red - green) / delta + 4);
    }
  }

  return {
    h: hue < 0 ? hue + 360 : hue,
    s: max === 0 ? 0 : (delta / max) * 100,
    v: max * 100
  };
}

function hsvToRgb({ h, s, v }: HsvColor) {
  const saturation = clamp(s, 0, 100) / 100;
  const value = clamp(v, 0, 100) / 100;
  const chroma = value * saturation;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = value - chroma;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (h >= 0 && h < 60) {
    red = chroma;
    green = x;
  } else if (h >= 60 && h < 120) {
    red = x;
    green = chroma;
  } else if (h >= 120 && h < 180) {
    green = chroma;
    blue = x;
  } else if (h >= 180 && h < 240) {
    green = x;
    blue = chroma;
  } else if (h >= 240 && h < 300) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  return {
    r: Math.round((red + m) * 255),
    g: Math.round((green + m) * 255),
    b: Math.round((blue + m) * 255)
  };
}

function rgbToCss(color: ReturnType<typeof hexToRgb>, alpha = 1) {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${clamp(alpha, 0, 1)})`;
}

export function ColorControl({
  label,
  color,
  alpha = 1,
  onColorChange,
  onAlphaChange,
  disabled = false
}: ColorControlProps) {
  const [open, setOpen] = useState(false);
  const [hexDraft, setHexDraft] = useState(color.toUpperCase());
  const [canUseEyeDropper, setCanUseEyeDropper] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const areaRef = useRef<HTMLDivElement | null>(null);
  const hueRef = useRef<HTMLDivElement | null>(null);
  const rgb = hexToRgb(color);
  const hsv = useMemo(() => rgbToHsv(rgb), [rgb.r, rgb.g, rgb.b]);
  const alphaPercent = formatAlphaPercent(alpha);
  const opaqueColor = rgbToCss(rgb, 1);
  const transparentColor = rgbToCss(rgb, 0);

  useEffect(() => {
    setHexDraft(color.toUpperCase());
  }, [color]);

  useEffect(() => {
    setCanUseEyeDropper(typeof window !== "undefined" && "EyeDropper" in window);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) {
        return;
      }

      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function updateRgb(channel: keyof typeof rgb, value: string) {
    const nextValue = Number(value);
    if (Number.isNaN(nextValue)) {
      return;
    }

    onColorChange(rgbToHex({
      ...rgb,
      [channel]: Math.min(255, Math.max(0, Math.round(nextValue)))
    }));
  }

  function updateAlpha(value: string) {
    const nextValue = Number(value);
    if (Number.isNaN(nextValue)) {
      return;
    }

    onAlphaChange(Math.min(1, Math.max(0, nextValue / 100)));
  }

  function commitHex(value = hexDraft) {
    const nextColor = normalizeHexColor(value, color);
    setHexDraft(nextColor);
    onColorChange(nextColor);
  }

  function updateFromArea(clientX: number, clientY: number) {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const saturation = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const value = clamp((1 - ((clientY - rect.top) / rect.height)) * 100, 0, 100);
    onColorChange(rgbToHex(hsvToRgb({ h: hsv.h, s: saturation, v: value })));
  }

  function updateFromHue(clientX: number) {
    const rect = hueRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const hue = clamp(((clientX - rect.left) / rect.width) * 360, 0, 360);
    onColorChange(rgbToHex(hsvToRgb({ h: hue === 360 ? 0 : hue, s: hsv.s, v: hsv.v })));
  }

  function bindPointerDrag(
    event: ReactPointerEvent,
    update: (clientX: number, clientY: number) => void
  ) {
    if (disabled) {
      return;
    }

    event.preventDefault();
    update(event.clientX, event.clientY);

    function handleMove(pointerEvent: PointerEvent) {
      pointerEvent.preventDefault();
      update(pointerEvent.clientX, pointerEvent.clientY);
    }

    function handleEnd() {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleEnd);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleEnd, { once: true });
  }

  async function pickFromScreen() {
    if (disabled || typeof window === "undefined") {
      return;
    }

    const EyeDropper = (window as Window & { EyeDropper?: EyeDropperConstructor }).EyeDropper;
    if (!EyeDropper) {
      return;
    }

    try {
      const result = await new EyeDropper().open();
      onColorChange(normalizeHexColor(result.sRGBHex, color));
    } catch {
      // Browser eyedropper cancellation is expected; keep the picker open.
    }
  }

  return (
    <div
      ref={rootRef}
      className={`color-control${disabled ? " is-disabled" : ""}${open ? " is-open" : ""}`}
      style={{
        ["--picker-color" as string]: color,
        ["--picker-rgba" as string]: rgbToCss(rgb, alpha),
        ["--picker-alpha-gradient" as string]: `linear-gradient(90deg, ${transparentColor}, ${opaqueColor})`,
        ["--picker-hue" as string]: hsv.h
      }}
    >
      <button
        type="button"
        className="color-control__trigger"
        onClick={() => !disabled && setOpen((value) => !value)}
        disabled={disabled}
        aria-expanded={open}
      >
        <span className="color-control__label">{label}</span>
        <span className="color-control__strip" aria-hidden="true" />
      </button>
      {open ? (
        <div className="color-control__popover" role="dialog" aria-label={`${label} picker`}>
          <div className="color-control__popover-header">
            <span>{label}</span>
            <strong>{color.toUpperCase()} · {alphaPercent}%</strong>
          </div>

          <div
            ref={areaRef}
            className="color-control__area"
            style={{ backgroundColor: `hsl(${hsv.h} 100% 50%)` }}
            onPointerDown={(event) => bindPointerDrag(event, updateFromArea)}
            role="slider"
            aria-label={`${label} saturation and brightness`}
            aria-valuetext={`${Math.round(hsv.s)} saturation, ${Math.round(hsv.v)} brightness`}
            tabIndex={disabled ? -1 : 0}
          >
            <span
              className="color-control__area-thumb"
              style={{
                left: `${hsv.s}%`,
                top: `${100 - hsv.v}%`
              }}
              aria-hidden="true"
            />
          </div>

          <div
            ref={hueRef}
            className="color-control__hue"
            onPointerDown={(event) => bindPointerDrag(event, (clientX) => updateFromHue(clientX))}
            role="slider"
            aria-label={`${label} hue`}
            aria-valuemin={0}
            aria-valuemax={360}
            aria-valuenow={Math.round(hsv.h)}
            tabIndex={disabled ? -1 : 0}
          >
            <span
              className="color-control__hue-thumb"
              style={{ left: `${(hsv.h / 360) * 100}%` }}
              aria-hidden="true"
            />
          </div>

          <label className="color-control__alpha" aria-label={`${label} opacity`}>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={alphaPercent}
              onChange={(event) => updateAlpha(event.target.value)}
              disabled={disabled}
            />
          </label>

          <div className="color-control__values">
            <input
              className="color-control__hex"
              value={hexDraft.replace("#", "")}
              disabled={disabled}
              onChange={(event) => setHexDraft(`#${event.target.value}`)}
              onBlur={() => commitHex()}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commitHex();
                  event.currentTarget.blur();
                }
              }}
              aria-label={`${label} hex`}
            />
            <button
              type="button"
              className="color-control__eyedropper"
              onClick={pickFromScreen}
              disabled={disabled || !canUseEyeDropper}
              aria-label={`${label} eyedropper`}
              title="Eyedropper"
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M13.9 2.4a2.3 2.3 0 0 1 3.2 3.2l-2 2 1 1-1.4 1.4-1-1-7.4 7.4-3.5.8.8-3.5L11 6.3l-1-1 1.4-1.4 1 1 1.5-1.5Zm-8.7 12 .9-.2 6.2-6.2-.9-.9-6.2 6.2-.2.9Z" />
              </svg>
            </button>
            <span className="color-control__mode">RGB</span>
            {(["r", "g", "b"] as const).map((channel) => (
              <input
                key={channel}
                type="number"
                min="0"
                max="255"
                value={rgb[channel]}
                disabled={disabled}
                onChange={(event) => updateRgb(channel, event.target.value)}
                aria-label={`${label} ${channel}`}
              />
            ))}
            <label className="color-control__percent">
              <input
                type="number"
                min="0"
                max="100"
                value={alphaPercent}
                disabled={disabled}
                onChange={(event) => updateAlpha(event.target.value)}
                aria-label={`${label} opacity percent`}
              />
              <span>%</span>
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}
