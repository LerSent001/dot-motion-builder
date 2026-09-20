# Export Review

Last updated: September 20, 2026.

## Supported targets

The export panel exposes two production targets:

- **JavaScript** — a dependency-free file that registers a reusable `<dot-motion-loader>` Web Component.
- **Swift** — a standalone `DotMotionView.swift` component for SwiftUI on iOS 15+ and macOS 12+.

Legacy Lottie, SVG, PNG sequence, SVGA, JSON handoff, and demo-HTML exports have been removed. Project autosave is independent of the export formats and remains unchanged.

Both exporters preserve the active-cell mask, sequence order, cell shape and gap, active and inactive colors, opacity, glow, playback speed, background-cell animation, and sampled motion. The outer background is transparent and no editor interface is included.

## JavaScript output

The generated `.js` file contains the animation payload and rendering runtime. It does not include a demo page, generated usage comments, third-party dependencies, or network requests.

```html
<script src="./loader-1.js" defer></script>
<dot-motion-loader style="width: 48px" speed="1"></dot-motion-loader>
```

The component uses Shadow DOM for isolation, supports independent multiple instances, and exposes `play()`, `pause()`, `seek(seconds)`, `speed`, and `paused`. Its default width is 48 px; CSS controls its display size while the exported aspect ratio is preserved.

When a page loads multiple different exported animations, assign a unique `data-dot-motion-tag` value to each script and use the corresponding custom-element name.

## Swift output

The generated `DotMotionView.swift` file can be added directly to an Xcode target. It contains no generated usage comments or third-party dependency.

```swift
DotMotionView(isPlaying: true, speed: 1)
    .frame(width: 48, height: 48)
```

The surrounding interface controls the frame size. When several independently exported Swift files are added to the same target, rename their `DotMotionView` types to avoid a symbol collision.

## Issues resolved during review

1. The Web timeline clamps a browser timestamp that predates initialization, preventing negative progress and invalid samples.
2. Sequence exports play their ordered frames at the selected FPS instead of returning an inert data container.
3. Export payloads safely preserve Unicode, emoji, and script-like text.
4. Text cells scale to their available width instead of being clipped.
5. Clipboard failures no longer produce a false success state.
6. Download object URLs are revoked after the browser has started the download.
7. Continuous animation no longer exposes a misleading export-FPS setting; sequence FPS remains available.
8. A completed non-looping SwiftUI animation stops requesting timeline updates.

## Verification completed

- `pnpm test` covers type checking, 19 motion presets across multiple grid sizes, the reference fish-eye formula, loop boundaries, masks, speed scaling, special text, shapes, sequences, and both generators.
- `scripts/browser-qa.mjs` covers all preset selections, persistence, real Web Component playback, pause/resume, resizing, and JavaScript/Swift downloads without page errors.
- `scripts/browser-export-edge-qa.mjs` covers offline loading, transparency, real pixel output, multiple instances, speed changes, invalid-speed fallback, resizing, sequence playback, and non-looping completion.
- The generated Swift output type-checks against the arm64 iOS Simulator SDK.
- Exported continuous and sequence fixtures compile, install, launch, and animate in an iPhone 17 Pro / iOS 26.4 Simulator app.
- A native macOS SwiftUI `ImageRenderer` fixture verifies static rendering independently of source-string checks.
- The production Next.js build and whitespace validation pass.

See [PLATFORM-RENDER-QA.md](./PLATFORM-RENDER-QA.md) for measured cross-platform rendering results.

## Validation boundary

- A physical iPhone has not been used for acceptance testing. Simulator validation does not establish physical-device energy use or performance.
- Web Canvas and SwiftUI Canvas use different blur, compositing, and antialiasing implementations, so edge pixels are not expected to be identical.
- Motion samples are linearly interpolated between exported timeline values. Very abrupt transitions can be smoothed within one sample interval.
- The iOS 15 compatibility path uses the older SwiftUI `onChange` overload, which produces a deprecation warning on newer SDKs but no compile error.
