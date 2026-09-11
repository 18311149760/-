import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '星星连连 · 你的片刻小宇宙',
  description: '旋转连线，点亮星光。36 关不限时益智小游戏，自动保存，随时接着玩。',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/favicon.svg', apple: '/icon-192.png' },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: '星星连连' },
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#1b2544', viewportFit: 'cover' };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN"><body>{children}</body>
    </html>
  );
}
