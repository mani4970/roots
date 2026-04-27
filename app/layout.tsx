import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Roots — 영적 루틴 앱",
  description: "Roots — In Gottes Wort verwurzelt, gemeinsam wachsen | 말씀에 뿌리내리고, 함께 자라다",
  manifest: "/manifest.json",
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
        <link rel="apple-touch-icon" href="/app-icon-roots-180.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Roots" />
        <meta name="theme-color" content="#7A9D7A" />
        <script dangerouslySetInnerHTML={{
          __html: `
            (function(){var t=localStorage.getItem('roots_theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');})();
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
