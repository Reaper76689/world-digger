import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "真探",
  description: "河南高校校园现场动态应用"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
