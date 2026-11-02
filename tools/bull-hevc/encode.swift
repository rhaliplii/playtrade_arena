// Encode a folder of RGBA PNG frames into an HEVC-with-alpha .mov — the format
// Safari needs for a transparent video (it drops WebM's alpha channel).
// usage: swiftc -O encode.swift -o encode && ./encode <frames-dir> <out.mov> [fps]
import AVFoundation
import VideoToolbox
import AppKit

let args = CommandLine.arguments
guard args.count >= 3 else { print("usage: encode <frames-dir> <out.mov> [fps]"); exit(2) }
let dir = URL(fileURLWithPath: args[1]), out = URL(fileURLWithPath: args[2])
let fps = Int32(args.count > 3 ? Int(args[3])! : 30)
let files = try FileManager.default.contentsOfDirectory(atPath: dir.path).filter { $0.hasSuffix(".png") }.sorted()
guard let first = NSImage(contentsOf: dir.appendingPathComponent(files[0])),
      let fcg = first.cgImage(forProposedRect: nil, context: nil, hints: nil) else { exit(1) }
let w = fcg.width, h = fcg.height
try? FileManager.default.removeItem(at: out)

let writer = try AVAssetWriter(outputURL: out, fileType: .mov)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.hevcWithAlpha,
  AVVideoWidthKey: w, AVVideoHeightKey: h,
  AVVideoCompressionPropertiesKey: [
    AVVideoQualityKey: 0.75,
    kVTCompressionPropertyKey_TargetQualityForAlpha as String: 0.9,
  ],
])
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
  kCVPixelBufferWidthKey as String: w, kCVPixelBufferHeightKey as String: h,
])
writer.add(input)
writer.startWriting(); writer.startSession(atSourceTime: .zero)

for (i, f) in files.enumerated() {
  guard let img = NSImage(contentsOf: dir.appendingPathComponent(f)),
        let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { continue }
  var pb: CVPixelBuffer?
  CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pb)
  guard let buf = pb else { continue }
  CVPixelBufferLockBaseAddress(buf, [])
  let ctx = CGContext(data: CVPixelBufferGetBaseAddress(buf), width: w, height: h, bitsPerComponent: 8,
                      bytesPerRow: CVPixelBufferGetBytesPerRow(buf), space: CGColorSpaceCreateDeviceRGB(),
                      bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)!
  ctx.clear(CGRect(x: 0, y: 0, width: w, height: h))
  ctx.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))
  CVPixelBufferUnlockBaseAddress(buf, [])
  while !input.isReadyForMoreMediaData { usleep(2000) }
  adaptor.append(buf, withPresentationTime: CMTime(value: CMTimeValue(i), timescale: fps))
}
input.markAsFinished()
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
if writer.status != .completed { print("failed:", writer.error ?? "?"); exit(1) }
print(out.lastPathComponent, files.count, "frames", "\(w)x\(h)")
