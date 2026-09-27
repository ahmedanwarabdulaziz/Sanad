import type { Metadata } from "next";
import MarbleShell from "./components/MarbleShell";

export const metadata: Metadata = {
  title: "الرخام والجرانيت | Sanad ERP",
  description: "نظام إدارة كتالوج الرخام والجرانيت",
};

export default function MarbleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MarbleShell>{children}</MarbleShell>;
}
