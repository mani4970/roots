import Foundation
import UIKit
import Capacitor
import Photos
import ImageIO

// Preserve the stock bridge behaviour; only register our app-local export plugin.
class RootsBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(RootsWordCardExportPlugin())
    }
}

@objc(RootsWordCardExportPlugin)
public class RootsWordCardExportPlugin: CAPPlugin, CAPBridgedPlugin, UIDocumentPickerDelegate, UIAdaptivePresentationControllerDelegate {
    public let identifier = "RootsWordCardExportPlugin"
    public let jsName = "RootsWordCardExport"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "prepareImage", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveImage", returnType: CAPPluginReturnPromise)
    ]
    private let worker = DispatchQueue(label: "com.rootspuce.app.word-card-export", qos: .userInitiated)
    // Accessed only on the main queue. Keep export delegates/calls alive until done.
    private var saving = false
    private var documentCall: CAPPluginCall?
    private var documentURL: URL?

    private enum ImageError: Error { case invalidImage, invalidFilename }
    private func validatedImage(_ call: CAPPluginCall) throws -> (Data, String) {
        guard let filename = call.getString("filename"),
              filename.range(of: "^Christian-Roots-[0-9]{4}-[0-9]{2}-[0-9]{2}-(ko|en|de|fr|es)\\.png$", options: .regularExpression) != nil else {
            throw ImageError.invalidFilename
        }
        guard let raw = call.getString("base64"), raw.utf8.count <= 22_369_624,
              let data = Data(base64Encoded: raw), !data.isEmpty, data.count <= 16 * 1024 * 1024,
              data.starts(with: [137, 80, 78, 71, 13, 10, 26, 10]),
              let source = CGImageSourceCreateWithData(data as CFData, nil),
              let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [String: Any],
              let width = properties[kCGImagePropertyPixelWidth as String] as? NSNumber,
              let height = properties[kCGImagePropertyPixelHeight as String] as? NSNumber,
              width.intValue > 0, width.intValue <= 4096, height.intValue > 0, height.intValue <= 14000,
              width.intValue * height.intValue <= 60_000_000 else {
            throw ImageError.invalidImage
        }
        return (data, filename)
    }

    private func writeTemporaryImage(_ data: Data, filename: String) throws -> URL {
        let manager = FileManager.default
        let root = try manager.url(for: .cachesDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
            .appendingPathComponent("roots-word-cards", isDirectory: true)
        try manager.createDirectory(at: root, withIntermediateDirectories: true)
        // Read timestamps from our directory names, not filesystem metadata.
        // Do not delete fresh files when Share closes: a recipient may read later.
        let now = Int64(Date().timeIntervalSince1970 * 1000)
        if let children = try? manager.contentsOfDirectory(at: root, includingPropertiesForKeys: nil, options: [.skipsHiddenFiles]) {
            for child in children {
                let parts = child.lastPathComponent.split(separator: "_", maxSplits: 1)
                if parts.count == 2, let created = Int64(parts[0]), UUID(uuidString: String(parts[1])) != nil,
                   created > 0, created < now - 86_400_000 {
                    try? manager.removeItem(at: child)
                }
            }
        }
        let directory = root.appendingPathComponent("\(now)_\(UUID().uuidString)", isDirectory: true)
        try manager.createDirectory(at: directory, withIntermediateDirectories: true)
        let url = directory.appendingPathComponent(filename)
        do { try data.write(to: url, options: .atomic) }
        catch { try? manager.removeItem(at: directory); throw error }
        return url
    }

    @objc func prepareImage(_ call: CAPPluginCall) {
        worker.async {
            do {
                let (data, filename) = try self.validatedImage(call)
                let url = try self.writeTemporaryImage(data, filename: filename)
                call.resolve(["uri": url.absoluteString])
            } catch {
                call.reject("Could not prepare word card image", "IMAGE_PREPARE_FAILED")
            }
        }
    }

    @objc func saveImage(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard !self.saving else { call.reject("A save is already in progress", "EXPORT_BUSY"); return }
            self.saving = true
            self.worker.async {
                do {
                    let (data, filename) = try self.validatedImage(call)
                    let url = try self.writeTemporaryImage(data, filename: filename)
                    DispatchQueue.main.async {
                        // The current Mac product is the iPhone/iPad app on Apple
                        // silicon, not a separate AppKit or Catalyst target.
                        #if targetEnvironment(macCatalyst)
                        self.exportDocument(url, call: call)
                        #else
                        if ProcessInfo.processInfo.isiOSAppOnMac {
                            self.exportDocument(url, call: call)
                        } else {
                            self.saveToPhotos(url, call: call)
                        }
                        #endif
                    }
                } catch {
                    self.finishSave(call, url: nil, destination: nil, errorCode: "SAVE_FAILED")
                }
            }
        }
    }

    private func saveToPhotos(_ url: URL, call: CAPPluginCall) {
        // Add-only permission, only after Save is tapped. No library reading.
        PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
            guard status == .authorized || status == .limited else {
                self.finishSave(call, url: url, destination: nil, errorCode: "PHOTO_PERMISSION_DENIED")
                return
            }
            PHPhotoLibrary.shared().performChanges({
                let request = PHAssetCreationRequest.forAsset()
                let options = PHAssetResourceCreationOptions()
                options.originalFilename = url.lastPathComponent
                request.addResource(with: .photo, fileURL: url, options: options)
            }, completionHandler: { success, _ in
                self.finishSave(call, url: url, destination: success ? "photos" : nil,
                                errorCode: success ? nil : "SAVE_FAILED")
            })
        }
    }

    private func exportDocument(_ url: URL, call: CAPPluginCall) {
        guard let presenter = bridge?.viewController, presenter.viewIfLoaded?.window != nil,
              presenter.presentedViewController == nil else {
            finishSave(call, url: url, destination: nil, errorCode: "EXPORT_BUSY")
            return
        }
        documentCall = call
        documentURL = url
        let picker = UIDocumentPickerViewController(forExporting: [url], asCopy: true)
        picker.delegate = self
        picker.modalPresentationStyle = .formSheet
        picker.presentationController?.delegate = self
        if let popover = picker.popoverPresentationController {
            popover.sourceView = presenter.view
            popover.sourceRect = CGRect(x: presenter.view.bounds.midX, y: presenter.view.bounds.midY, width: 1, height: 1)
            popover.permittedArrowDirections = []
        }
        presenter.present(picker, animated: true)
    }

    public func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        finishDocument(destination: urls.isEmpty ? nil : "files", errorCode: urls.isEmpty ? "CANCELLED" : nil)
    }
    public func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        finishDocument(destination: nil, errorCode: "CANCELLED")
    }
    public func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
        finishDocument(destination: nil, errorCode: "CANCELLED")
    }
    private func finishDocument(destination: String?, errorCode: String?) {
        guard let call = documentCall else { return }
        let url = documentURL
        documentCall = nil; documentURL = nil
        finishSave(call, url: url, destination: destination, errorCode: errorCode)
    }
    private func finishSave(_ call: CAPPluginCall, url: URL?, destination: String?, errorCode: String?) {
        if let url = url {
            // Only the scratch directory created by this save call, never the
            // exported document, photos, or a file created for sharing.
            worker.async { try? FileManager.default.removeItem(at: url.deletingLastPathComponent()) }
        }
        DispatchQueue.main.async {
            self.saving = false
            if let destination = destination { call.resolve(["destination": destination]) }
            else { call.reject("Word card save did not finish", errorCode ?? "SAVE_FAILED") }
        }
    }
}
