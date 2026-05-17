import UIKit
import Capacitor
import Network
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    private let networkMonitor = NWPathMonitor()
    private let networkQueue = DispatchQueue(label: "com.rootspuce.app.network-monitor")
    private var isNetworkAvailable = true
    private weak var offlineView: UIView?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        startNetworkMonitoring()
        return true
    }

    private func startNetworkMonitoring() {
        networkMonitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.isNetworkAvailable = path.status == .satisfied
                if self.isNetworkAvailable {
                    // Keep the offline screen visible until the user explicitly retries.
                    // This avoids exposing a blank WebView while the remote app is still loading.
                    return
                } else {
                    self.showOfflineView()
                }
            }
        }
        networkMonitor.start(queue: networkQueue)
    }

    private func localizedOfflineCopy() -> (title: String, message: String, button: String) {
        let preferredLanguage = Locale.preferredLanguages.first?.lowercased() ?? "en"
        let languageCode = preferredLanguage.split(separator: "-").first.map(String.init) ?? preferredLanguage

        switch languageCode {
        case "ko":
            return (
                "인터넷 연결이 필요해요",
                "Roots를 불러오려면 인터넷 연결이 필요합니다.\n연결 상태를 확인한 뒤 다시 시도해 주세요.",
                "다시 시도"
            )
        case "de":
            return (
                "Internetverbindung erforderlich",
                "Roots benötigt eine Internetverbindung.\nBitte überprüfe deine Verbindung und versuche es erneut.",
                "Erneut versuchen"
            )
        case "fr":
            return (
                "Connexion Internet requise",
                "Roots a besoin d’une connexion Internet.\nVérifie ta connexion, puis réessaie.",
                "Réessayer"
            )
        default:
            return (
                "Internet connection needed",
                "Roots needs an internet connection to load.\nPlease check your connection and try again.",
                "Try again"
            )
        }
    }

    private func showOfflineView() {
        guard offlineView == nil, let window = window else { return }

        let copy = localizedOfflineCopy()
        let container = UIView(frame: window.bounds)
        container.translatesAutoresizingMaskIntoConstraints = false
        container.backgroundColor = UIColor(red: 0.98, green: 0.95, blue: 0.89, alpha: 1.0)
        container.accessibilityIdentifier = "roots-offline-view"

        let card = UIView()
        card.translatesAutoresizingMaskIntoConstraints = false
        card.backgroundColor = UIColor.white.withAlphaComponent(0.86)
        card.layer.cornerRadius = 28
        card.layer.shadowColor = UIColor.black.cgColor
        card.layer.shadowOpacity = 0.08
        card.layer.shadowRadius = 18
        card.layer.shadowOffset = CGSize(width: 0, height: 8)

        let logoView = UIImageView(image: UIImage(named: "RootsOfflineLogo"))
        logoView.translatesAutoresizingMaskIntoConstraints = false
        logoView.contentMode = .scaleAspectFit
        logoView.accessibilityLabel = "Roots"

        let titleLabel = UILabel()
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.text = copy.title
        titleLabel.font = UIFont.systemFont(ofSize: 24, weight: .bold)
        titleLabel.textColor = UIColor(red: 0.18, green: 0.28, blue: 0.18, alpha: 1.0)
        titleLabel.textAlignment = .center
        titleLabel.numberOfLines = 0

        let messageLabel = UILabel()
        messageLabel.translatesAutoresizingMaskIntoConstraints = false
        messageLabel.text = copy.message
        messageLabel.font = UIFont.systemFont(ofSize: 16, weight: .regular)
        messageLabel.textColor = UIColor(red: 0.35, green: 0.40, blue: 0.35, alpha: 1.0)
        messageLabel.textAlignment = .center
        messageLabel.numberOfLines = 0

        let retryButton = UIButton(type: .system)
        retryButton.translatesAutoresizingMaskIntoConstraints = false
        retryButton.setTitle(copy.button, for: .normal)
        retryButton.titleLabel?.font = UIFont.systemFont(ofSize: 17, weight: .semibold)
        retryButton.setTitleColor(.white, for: .normal)
        retryButton.backgroundColor = UIColor(red: 0.20, green: 0.48, blue: 0.29, alpha: 1.0)
        retryButton.layer.cornerRadius = 18
        retryButton.contentEdgeInsets = UIEdgeInsets(top: 14, left: 28, bottom: 14, right: 28)
        retryButton.addTarget(self, action: #selector(retryLoadingRoots), for: .touchUpInside)

        window.addSubview(container)
        container.addSubview(card)
        card.addSubview(logoView)
        card.addSubview(titleLabel)
        card.addSubview(messageLabel)
        card.addSubview(retryButton)

        NSLayoutConstraint.activate([
            container.leadingAnchor.constraint(equalTo: window.leadingAnchor),
            container.trailingAnchor.constraint(equalTo: window.trailingAnchor),
            container.topAnchor.constraint(equalTo: window.topAnchor),
            container.bottomAnchor.constraint(equalTo: window.bottomAnchor),

            card.leadingAnchor.constraint(equalTo: container.safeAreaLayoutGuide.leadingAnchor, constant: 24),
            card.trailingAnchor.constraint(equalTo: container.safeAreaLayoutGuide.trailingAnchor, constant: -24),
            card.centerYAnchor.constraint(equalTo: container.safeAreaLayoutGuide.centerYAnchor),

            logoView.topAnchor.constraint(equalTo: card.topAnchor, constant: 34),
            logoView.centerXAnchor.constraint(equalTo: card.centerXAnchor),
            logoView.widthAnchor.constraint(equalToConstant: 92),
            logoView.heightAnchor.constraint(equalToConstant: 92),

            titleLabel.topAnchor.constraint(equalTo: logoView.bottomAnchor, constant: 22),
            titleLabel.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 24),
            titleLabel.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -24),

            messageLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 12),
            messageLabel.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 24),
            messageLabel.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -24),

            retryButton.topAnchor.constraint(equalTo: messageLabel.bottomAnchor, constant: 26),
            retryButton.centerXAnchor.constraint(equalTo: card.centerXAnchor),
            retryButton.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -34),
        ])

        offlineView = container
    }

    @objc private func retryLoadingRoots() {
        isNetworkAvailable = networkMonitor.currentPath.status == .satisfied
        if isNetworkAvailable {
            reloadRootWebView()
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { [weak self] in
                self?.hideOfflineView()
            }
        } else {
            UIView.animate(withDuration: 0.08, animations: {
                self.offlineView?.transform = CGAffineTransform(scaleX: 0.98, y: 0.98)
            }, completion: { _ in
                UIView.animate(withDuration: 0.12) {
                    self.offlineView?.transform = .identity
                }
            })
        }
    }

    private func hideOfflineView() {
        guard let offlineView = offlineView else { return }
        offlineView.removeFromSuperview()
        self.offlineView = nil
    }

    private func reloadRootWebView() {
        guard let rootViewController = window?.rootViewController else { return }
        findWebView(in: rootViewController.view)?.reload()
    }

    private func findWebView(in view: UIView?) -> WKWebView? {
        guard let view = view else { return nil }
        if let webView = view as? WKWebView { return webView }
        for subview in view.subviews {
            if let webView = findWebView(in: subview) { return webView }
        }
        return nil
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        networkMonitor.cancel()
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
