import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "世探",
  description: "按地点交换现场信息的地图社交应用"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
