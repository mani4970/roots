import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import "./desktop.css";
import "./desktop-home.css";
import "./desktop-profile.css";
import CapacitorAuthBridge from "@/components/CapacitorAuthBridge";
import NativeStatusBar from "@/components/NativeStatusBar";
import IPhoneRequiredUpdateGate from "@/components/IPhoneRequiredUpdateGate";
import NotificationBridge from "@/components/NotificationBridge";
import CommentNotificationsProvider from "@/components/notifications/CommentNotificationsProvider";
import BottomNavSessionProvider from "@/components/BottomNavSessionProvider";
import AndroidBackButtonBridge from "@/components/AndroidBackButtonBridge";
import AppObservationBridge from "@/components/AppObservationBridge";
import { FALLBACK_LANG, SUPPORTED_LANGS } from "@/lib/i18n";

export const metadata: Metadata = {
  metadataBase: new URL("https://christian-roots.com"),
  title: "Roots",
  description: "매일 말씀과 동행하는 삶, 루츠와 함께",
  openGraph: {
    title: "🌱 Roots",
    description: "말씀에 뿌리내리고, 함께 자라는 크리스천 앱",
    url: "https://christian-roots.com",
    siteName: "Roots",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "🌱 Roots",
    description: "말씀에 뿌리내리고, 함께 자라는 크리스천 앱",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/app-icon-roots-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [
      { url: "/app-icon-roots-180.png", sizes: "180x180" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Roots",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={FALLBACK_LANG} suppressHydrationWarning>
      <head>
        <noscript><link rel="manifest" href="/manifest.json" /></noscript>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/app-icon-roots-180.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Roots" />
        <meta name="theme-color" content="#7A9D7A" />
        <script dangerouslySetInnerHTML={{
          __html: `
            (function(){
              try {
                var savedLang = localStorage.getItem('roots_lang');
                var supportedLangs = ${JSON.stringify(SUPPORTED_LANGS)};
                if (supportedLangs.indexOf(savedLang) !== -1) {
                  document.documentElement.lang = savedLang;
                }

                var t = localStorage.getItem('roots_theme');
                if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
                else document.documentElement.removeAttribute('data-theme');
              } catch (e) {}
            })();
            var isCapacitorApp = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
            // The Home loader renders before BottomNav mounts and marks the active desktop route.
            (function(){
              var iosBridge = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.bridge;
              var root = document.documentElement;
              var ua = navigator.userAgent;
              var platform = navigator.platform;
              var touchPoints = navigator.maxTouchPoints;
              var native = isCapacitorApp || iosBridge || window.androidBridge;
              var isIOS = isCapacitorApp ? window.Capacitor.getPlatform() === 'ios' : !!iosBridge && !window.androidBridge;
              var shortSide = Math.min(screen.width || innerWidth, screen.height || innerHeight);
              var isDesktop = native
                ? isIOS && shortSide >= 768 && touchPoints <= 1
                : !/Android|iPad|iPhone|iPod|Mobile/i.test(ua) &&
                  (/^Win/i.test(platform) || (/Mac/i.test(platform) && touchPoints <= 1));

              if (isDesktop) {
                root.setAttribute('data-roots-desktop-client', '');
                return;
              }

              // iPad Safari can identify itself as a touch-capable Mac. Android
              // tablet WebViews may include Mobile even when the browser doesn't.
              var ipad = /iPad/i.test(ua) ||
                (/Mac/i.test(platform) && touchPoints > 1 && !/iPhone|iPod/i.test(ua));
              var android = /Android/i.test(ua) || (isCapacitorApp && window.Capacitor.getPlatform() === 'android') ||
                (navigator.userAgentData && navigator.userAgentData.platform === 'Android');
              var androidTablet = android && shortSide >= 600 && !/SM-F[0-9]|Pixel[^;)]*Fold/i.test(ua) &&
                (!/Mobile/i.test(ua) || /SM-[XTP][0-9]/i.test(ua));

              // In Chrome's default desktop-site mode a large Galaxy Tab can
              // expose a Linux desktop UA and omit Android and its model name.
              var desktopSiteTablet = !native && /X11; Linux/i.test(ua) && !/Mobile/i.test(ua) &&
                shortSide >= 768 && touchPoints > 1 && matchMedia('(pointer: coarse)').matches;
              if (!ipad && !androidTablet && !desktopSiteTablet) return;

              root.setAttribute('data-roots-tablet-client', '');

              var tabletWindow = matchMedia('(min-width: 960px) and (orientation: landscape)');
              function updateTabletLayout() {
                // Some Android WebViews shrink the layout viewport for the keyboard.
                // Keep a physically upright tablet compact while editing text.
                var input = document.activeElement;
                // Older iPadOS keeps screen.width/height in portrait order.
                var screenPortrait = ipad && typeof window.orientation === 'number'
                  ? Math.abs(window.orientation) !== 90 : screen.height > screen.width;
                var portraitKeyboard = screenPortrait && input &&
                  (input.matches('input, textarea') || input.isContentEditable);
                var wide = tabletWindow.matches && !portraitKeyboard;
                if (wide === root.hasAttribute('data-roots-desktop-client')) return;
                if (wide) root.setAttribute('data-roots-desktop-client', 'tablet');
                else root.removeAttribute('data-roots-desktop-client');
                window.dispatchEvent(new Event('roots-tablet-layout-change'));
              }
              updateTabletLayout();
              // Physical rotation with the keyboard open can change the screen
              // shape while the layout viewport remains wider than it is tall.
              window.addEventListener('resize', updateTabletLayout);
              tabletWindow.addEventListener('change', updateTabletLayout);
            })();
            // The install manifest belongs to the device, even in a narrow window.
            if (!document.querySelector('link[rel="manifest"]')) {
              var manifest = document.createElement('link');
              manifest.rel = 'manifest';
              manifest.href = document.documentElement.hasAttribute('data-roots-tablet-client')
                ? '/tablet.webmanifest' : '/manifest.json';
              document.head.appendChild(manifest);
            }
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                if (isCapacitorApp) {
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    registrations.forEach(function(registration) {
                      registration.unregister();
                    });
                  }).catch(function(err) {
                    console.log('SW cleanup failed:', err);
                  });
                  return;
                }

                navigator.serviceWorker.register('/sw.js').catch(function(err) {
                  console.log('SW registration failed:', err);
                });
              });
            }
          `
        }} />
      </head>
      <body>
        <NativeStatusBar />
        <IPhoneRequiredUpdateGate />
        <CapacitorAuthBridge />
        <NotificationBridge />
        <AndroidBackButtonBridge />
        <AppObservationBridge />
        <CommentNotificationsProvider>
          <BottomNavSessionProvider>{children}</BottomNavSessionProvider>
        </CommentNotificationsProvider>
        <Analytics />
      </body>
    </html>
  );
}


export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#7A9D7A",
};
