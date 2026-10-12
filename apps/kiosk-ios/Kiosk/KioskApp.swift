import SwiftUI
import WebKit

private let kioskURL = URL(string: "https://web-production-9ac73.up.railway.app")!

@main
struct KioskApp: App {
    var body: some Scene {
        WindowGroup {
            KioskController()
                .ignoresSafeArea()
                .statusBarHidden(true)
        }
    }
}

struct KioskController: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> KioskViewController {
        KioskViewController()
    }

    func updateUIViewController(_ uiViewController: KioskViewController, context: Context) {}
}

final class KioskViewController: UIViewController, WKNavigationDelegate {
    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        let web = WKWebView(frame: view.bounds)
        web.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.isOpaque = true
        web.navigationDelegate = self
        view.addSubview(web)
        web.load(URLRequest(url: kioskURL))
    }
}
