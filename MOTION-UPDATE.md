# Motion update — 2026-09-20

Reference: https://www.loaders.wtf/

The reference renders the inspected grid as DOM/SVG (no canvas in the inspected page). Its brightness patterns and cell size styles are separate. This update implements that separation in the existing editor; it does not copy the reference site's entire application or its advanced effects catalog.

## Implemented

- Rebuilt the original preset library around deterministic spatial brightness fields.
- Curated 12 reusable, mask-safe motion presets after removing fill-dependent paths, scans, icons, letters and state drawings. Every remaining effect visibly animates arbitrary selected cells without requiring a filled grid.
- Matched the reference Fish-eye Lens at both levels that affect its feel: the original diagonal brightness/radial-scale formula and its approximately 3:16 gap-to-cell proportion. The larger breathing room prevents enlarged cells from crowding and overlapping.
- Added visual preset thumbnails, fill/clear grid, opacity/brightness-scale/fish-eye/shrink/pop styles, scale intensity, and independent playback speed (0.25–3×).
- Kept the user's selected-cell mask when switching presets.
- Removed brightness thresholds that abruptly changed cell color/scale, removed the extra preview-only animation layer, and removed the grid-density frame-rate cap.
- Preview and both standalone export runtimes share sampled motion and background brightness. Web uses Canvas in a custom element; SwiftUI uses Canvas and TimelineView.
- Playback uses requestAnimationFrame. FPS is shown only for discrete sequences; continuous motion exports use at least 120 samples per cycle and at least 60 samples per second.
- Existing project version/storage key are retained so saved drawings are not cleared.

## Fidelity boundary

This is an adaptation of the reference's reusable grid-motion behavior, not a copy of every pattern. Fish-eye Lens uses the reference's diagonal brightness wave, radial lens-scale formula and spacing proportion. Added motifs use independently implemented deterministic formulas. Random-looking effects are deterministic for reproducible exports; some hard-stepped reference effects are interpolated for smoother playback.

Node connections, chromatic/glass/glitch filters, image masks, text shimmer and pattern morphing from the reference are not included. Exports are now exclusively standalone Web and SwiftUI source. Sequence exports play frames directly, rather than returning a JSON handoff. The editor panel is intentionally omitted; exported backgrounds are transparent. Font rendering and glow kernels differ between browsers and SwiftUI.

## Verification

- TypeScript typecheck and production build.
- `node scripts/test-motion.cjs`: 12 presets on 2×2, 5×5, 8×8 and 13×13 grids, finite/range samples, loop endpoint equality, every-cell participation, mask preservation, reference fish-eye formula and spacing, shared timeline samples and speed scaling.
- `scripts/browser-qa.mjs`: draws a five-cell sparse mask, switches all 12 presets, verifies animation advances, changes speed/scale, reloads and checks persistence; no page errors.
- Browser verification covers the generated JavaScript Web Component, pause/resume, resize, sequences, and both file downloads.
- Generated Swift compiles and runs in an arm64 iOS Simulator app; native macOS SwiftUI static rendering is verified separately. No physical-device acceptance is claimed.

## Local run

Run `pnpm install` then `pnpm dev --hostname 127.0.0.1 --port 3108` and open [http://127.0.0.1:3108/editor](http://127.0.0.1:3108/editor).

Draw any sparse or filled mask, choose a motion preset, and press **Preview Animation**. Switching presets preserves that mask.

For the browser check, install Playwright or set `PLAYWRIGHT_MODULE` to its ESM entry, then run `node scripts/browser-qa.mjs` with the local server running.
