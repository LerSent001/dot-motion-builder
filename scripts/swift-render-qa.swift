import SwiftUI
import AppKit

@main
struct RenderQA {
    @MainActor
    static func main() throws {
        let renderer = ImageRenderer(content: DotMotionView(isPlaying: false).frame(width: 320, height: 320))
        renderer.scale = 2
        guard let image = renderer.nsImage,
              let tiff = image.tiffRepresentation,
              let bitmap = NSBitmapImageRep(data: tiff),
              let png = bitmap.representation(using: .png, properties: [:]) else {
            fatalError("SwiftUI rendering failed")
        }
        try png.write(to: URL(fileURLWithPath: "/tmp/dot-motion-swift-qa.png"))
        print("PASS: native SwiftUI render, \(bitmap.pixelsWide)x\(bitmap.pixelsHigh)")
    }
}
