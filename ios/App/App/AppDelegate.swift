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
                self.updateOfflineView()
            }
        }
        networkMonitor.start(queue: networkQueue)
    }

    private func updateOfflineView() {
        hasActiveReflectionEditor { [weak self] editorReady in
            guard let self = self else { return }
            if editorReady == true {
                // A hydrated editor owns its network notice. Keep its current document and input.
                self.hideOfflineView()
                self.notifyReflectionConnectivity()
            } else if editorReady == false && self.networkMonitor.currentPath.status != .satisfied {
                self.showOfflineView()
            }
            // A cold-start overlay stays visible after reconnect until the user retries.
        }
    }

    private func notifyReflectionConnectivity() {
        guard let rootViewController = window?.rootViewController,
              let webView = findWebView(in: rootViewController.view) else {
            return
        }
        let online = networkMonitor.currentPath.status == .satisfied ? "true" : "false"
        webView.evaluateJavaScript(
            "if (document.documentElement.getAttribute('data-roots-editor-ready') === 'true') {"
                + "window.dispatchEvent(new CustomEvent('roots-qt-connectivity', {detail: {online: "
                + online + "}}));}",
            completionHandler: nil
        )
    }

    private func hasActiveReflectionEditor(_ completion: @escaping (Bool?) -> Void) {
        guard let rootViewController = window?.rootViewController,
              let webView = findWebView(in: rootViewController.view) else {
            completion(false)
            return
        }
        let documentURL = webView.url
        if documentURL == nil || documentURL?.absoluteString.isEmpty == true || documentURL?.absoluteString == "about:blank" {
            completion(false)
            return
        }
        // Set and removed by the mounted reflection UI; an error/blank document has no marker.
        webView.evaluateJavaScript(
            "document.documentElement.getAttribute('data-roots-editor-ready') === 'true'"
        ) { [weak self, weak webView] result, error in
            guard let self = self, let webView = webView,
                  webView === self.findWebView(in: self.window?.rootViewController?.view),
                  webView.url == documentURL else {
                // This answer belongs to an earlier document; it cannot authorize a reload.
                completion(nil)
                return
            }
            // An unavailable JS context does not authorize discarding a document.
            completion(error == nil ? result as? Bool : nil)
        }
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
        case "es":
            return (
                "Se necesita conexión a Internet",
                "Roots necesita conexión a Internet para cargarse.\nComprueba tu conexión e inténtalo de nuevo.",
                "Intentar de nuevo"
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
        hasActiveReflectionEditor { [weak self] editorReady in
            guard let self = self else { return }
            if editorReady == true {
                self.hideOfflineView()
                self.notifyReflectionConnectivity()
                return
            }
            guard editorReady == false else { return }
            self.isNetworkAvailable = self.networkMonitor.currentPath.status == .satisfied
            if self.isNetworkAvailable {
                self.reloadRootWebView()
                DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) { [weak self] in
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
    }

    private func hideOfflineView() {
        guard let offlineView = offlineView else { return }
        offlineView.removeFromSuperview()
        self.offlineView = nil
    }

    private func reloadRootWebView() {
        guard let rootViewController = window?.rootViewController,
              let webView = findWebView(in: rootViewController.view),
              let rootsURL = URL(string: "https://www.christian-roots.com") else {
            return
        }

        webView.load(URLRequest(url: rootsURL))
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

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

}
