import { MotionData } from "./motion-data";
import { ExportArtifact } from "@/types/dot-motion";

export function exportSwift(data: MotionData, _name: string): ExportArtifact {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const encoded = btoa(binary);
  return {
    format: "swift", filename: "DotMotionView.swift", mimeType: "text/plain;charset=utf-8",
    content: `import SwiftUI

@available(iOS 15.0, macOS 12.0, *)
public struct DotMotionView: View {
    public var isPlaying: Bool
    public var speed: Double
    @State private var elapsed: Double = 0
    @State private var anchor = Date()
    @State private var active = false
    @State private var rate: Double = 1

    public init(isPlaying: Bool = true, speed: Double = 1) {
        self.isPlaying = isPlaying
        self.speed = speed
    }

    public var body: some View {
        TimelineView(.animation(paused: !active)) { timeline in
            Canvas { context, size in
                Self.render(context: context, size: size, elapsed: time(at: timeline.date))
            }
            .onChange(of: !Self.animation.loop && time(at: timeline.date) >= Self.animation.duration) { finished in
                if finished { synchronize(); active = false }
            }
        }
        .accessibilityLabel("Loading animation")
        .onAppear { anchor = Date(); active = isPlaying; rate = safeSpeed }
        .onDisappear { synchronize(); active = false }
        .onChange(of: isPlaying) { value in synchronize(); active = value }
        .onChange(of: speed) { _ in synchronize(); rate = safeSpeed }
    }

    private var safeSpeed: Double { speed.isFinite && speed > 0 ? speed : 1 }
    private func time(at date: Date) -> Double {
        elapsed + (active ? max(0, date.timeIntervalSince(anchor)) * rate : 0)
    }
    private func synchronize() { let now = Date(); elapsed = time(at: now); anchor = now }

    private struct AnimationData: Decodable {
        let duration: Double
        let loop, discrete: Bool
        let width, height: Double
        let scenes: [Scene]
    }
    private struct Scene: Decodable {
        let width, height, cellSize, radius, glow, fontSize, fontWeight, letterSpacing, labelY: Double
        let polygon, primary, background, glowColor, textColor: [Double]
        let label: String
        let cells: [Cell]
    }
    private struct Cell: Decodable {
        let x, y: Double
        let active: Bool
        let samples: [[Double]]
    }
    private static func color(_ c: [Double]) -> Color {
        Color(.sRGB, red: c[0], green: c[1], blue: c[2], opacity: c[3])
    }
    private static func path(scene: Scene, rect: CGRect) -> Path {
        if scene.polygon.isEmpty {
            let radius = min(rect.width / 2, scene.radius * rect.width / scene.cellSize)
            return Path(roundedRect: rect, cornerRadius: radius)
        }
        var result = Path()
        for i in stride(from: 0, to: scene.polygon.count, by: 2) {
            let point = CGPoint(x: rect.minX + scene.polygon[i] * rect.width, y: rect.minY + scene.polygon[i + 1] * rect.height)
            if i == 0 { result.move(to: point) } else { result.addLine(to: point) }
        }
        result.closeSubpath()
        return result
    }
    private static func drawCell(context: GraphicsContext, scene: Scene, cell: Cell, scale: Double, opacity: Double, fill: [Double], glow: Bool) {
        guard scale > 0, opacity > 0 else { return }
        var layer = context
        layer.opacity = opacity
        let size = scene.cellSize * scale
        let inset = (scene.cellSize - size) / 2
        let rect = CGRect(x: cell.x + inset, y: cell.y + inset, width: size, height: size)
        if glow && scene.glow > 0 { layer.addFilter(.shadow(color: color(scene.glowColor), radius: scene.glow / 2)) }
        layer.fill(path(scene: scene, rect: rect), with: .color(color(fill)))
    }
    private static func render(context: GraphicsContext, size: CGSize, elapsed: Double) {
        let data = animation
        let phase = data.loop ? elapsed.truncatingRemainder(dividingBy: data.duration) / data.duration : min(1, elapsed / data.duration)
        let sceneIndex = data.discrete ? min(data.scenes.count - 1, Int(phase * Double(data.scenes.count))) : 0
        let scene = data.scenes[sceneIndex]
        let scale = min(size.width / data.width, size.height / data.height)
        var drawing = context
        drawing.translateBy(x: (size.width - data.width * scale) / 2, y: (size.height - data.height * scale) / 2)
        drawing.scaleBy(x: scale, y: scale)
        drawing.translateBy(x: (data.width - scene.width) / 2, y: (data.height - scene.height) / 2)
        for cell in scene.cells {
            let position = phase * Double(cell.samples.count - 1)
            let index = min(cell.samples.count - 2, Int(position))
            let mix = position - Double(index)
            let a = cell.samples[index], b = cell.samples[index + 1]
            let values = (0..<3).map { a[$0] + (b[$0] - a[$0]) * mix }
            drawCell(context: drawing, scene: scene, cell: cell, scale: 1, opacity: values[2], fill: scene.background, glow: false)
            if cell.active { drawCell(context: drawing, scene: scene, cell: cell, scale: values[1], opacity: values[0], fill: scene.primary, glow: true) }
        }
        if !scene.label.isEmpty {
            let weight: Font.Weight = scene.fontWeight >= 700 ? .bold : scene.fontWeight >= 600 ? .semibold : scene.fontWeight >= 500 ? .medium : .regular
            let text = Text(scene.label).font(.system(size: scene.fontSize, weight: weight)).tracking(scene.letterSpacing * scene.fontSize).foregroundColor(color(scene.textColor))
            let resolved = drawing.resolve(text)
            let measured = resolved.measure(in: CGSize(width: CGFloat.greatestFiniteMagnitude, height: CGFloat.greatestFiniteMagnitude))
            let fit = min(1, (scene.width - 40) / max(1, measured.width))
            drawing.scaleBy(x: fit, y: fit)
            drawing.draw(resolved, at: CGPoint(x: scene.width / 2 / fit, y: scene.labelY / fit), anchor: .top)
        }
    }

    private static let animation: AnimationData = {
        let payload = "${encoded}"
        return try! JSONDecoder().decode(AnimationData.self, from: Data(base64Encoded: payload)!)
    }()
}
`
  };
}
