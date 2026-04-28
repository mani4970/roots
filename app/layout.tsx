import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Roots",
  description: "매일 말씀과 동행하는 삶, 루츠와 함께",
  manifest: "/manifest.json",
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
    <html lang="ko">
      <head>
        <link rel="manifest" href="/manifest.json" />
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
                var t = localStorage.getItem('roots_theme');
                if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
              } catch (e) {}
            })();
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').catch(function(err) {
                  console.log('SW registration failed:', err);
                });
              });
            }
          `
        }} />
      </head>
      <body>{children}</body>
    </html>
  );
}


export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#7A9D7A",
};
