# Motion update — 2026-09-20

Reference: https://www.loaders.wtf/

The reference renders the inspected grid as DOM/SVG (no canvas in the inspected page). Its brightness patterns and cell size styles are separate. This update implements that separation in the existing editor; it does not copy the reference site's entire application or its advanced effects catalog.

## Implemented

- Rebuilt the original preset library around deterministic spatial brightness fields.
- Added Radar, Orbit, Heartbeat, Equalizer, DNA Helix, Sparkle, Breathing, Sine Wave and Collapse (19 total after removing Blink, Ripple and Pulse).
- Added visual preset thumbnails, fill/clear grid, opacity/pulse/fish-eye/shrink/pop styles, scale intensity, and independent playback speed (0.25–3×).
- Kept the user's selected-cell mask when switching presets.
- Removed brightness thresholds that abruptly changed cell color/scale, removed the extra preview-only animation layer, and removed the grid-density frame-rate cap.
- Preview and both standalone export runtimes share sampled motion and background brightness. Web uses Canvas in a custom element; SwiftUI uses Canvas and TimelineView.
- Playback uses requestAnimationFrame. FPS is shown only for discrete sequences; continuous motion exports use at least 120 samples per cycle and at least 60 samples per second.
- Existing project version/storage key are retained so saved drawings are not cleared.

## Fidelity boundary

This is an adaptation of the reference's core grid-motion behavior, not a pixel-identical port of every pattern. Fish-eye Lens uses the reference's diagonal brightness wave and radial lens-scale formula. Added motifs use independently implemented deterministic formulas. Random-looking effects are deterministic for reproducible exports; some hard-stepped reference effects are interpolated for smoother playback.

Node connections, chromatic/glass/glitch filters, image masks, text shimmer and pattern morphing from the reference are not included. Exports are now exclusively standalone Web and SwiftUI source. Sequence exports play frames directly, rather than returning a JSON handoff. The editor panel is intentionally omitted; exported backgrounds are transparent. Font rendering and glow kernels differ between browsers and SwiftUI.

## Verification

- TypeScript typecheck and production build.
- `node scripts/test-motion.cjs`: 19 presets on 2×2, 5×5 and 8×8 grids, 10,602 finite/range samples, loop endpoint equality, mask preservation, the reference fish-eye formula, shared timeline samples and speed scaling.
- `scripts/browser-qa.mjs`: switches all 19 presets, fills a grid, verifies animation advances, changes speed/scale, reloads and checks persistence; no page errors.
- Browser verification covers the generated JavaScript Web Component, pause/resume, resize, sequences, and both file downloads.
- Generated Swift compiles and runs in an arm64 iOS Simulator app; native macOS SwiftUI static rendering is verified separately. No physical-device acceptance is claimed.

## Local run

Run `pnpm install` then `pnpm dev --hostname 127.0.0.1 --port 3108` and open [http://127.0.0.1:3108/editor](http://127.0.0.1:3108/editor).

Select **Fill Grid**, choose a motion preset, and press **Preview Animation**. Draw a custom mask with the existing grid controls. Switching presets preserves that mask.

For the browser check, install Playwright or set `PLAYWRIGHT_MODULE` to its ESM entry, then run `node scripts/browser-qa.mjs` with the local server running.
