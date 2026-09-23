import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        // Keep Roots' custom bridge so the local word-card export plugin remains registered.
        let rootsWindow = UIWindow(windowScene: windowScene)
        rootsWindow.rootViewController = RootsBridgeViewController()
        window = rootsWindow
        rootsWindow.makeKeyAndVisible()

        // The app supports a single scene. Keep AppDelegate's existing offline/retry
        // infrastructure pointed at the active scene window.
        (UIApplication.shared.delegate as? AppDelegate)?.sceneWindowDidConnect(rootsWindow)

        // Capacitor 8.5+ forwards cold-start URLs and universal links only after
        // plugins are ready, and preserves the App plugin's appUrlOpen behavior.
        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
