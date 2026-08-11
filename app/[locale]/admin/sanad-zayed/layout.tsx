import type { Metadata } from "next";
import SanadShell from "./components/SanadShell";

export const metadata: Metadata = {
  title: "سند زايد | Sanad ERP",
  description: "نظام إدارة مشروع سند زايد الاستثماري",
};

export default function SanadZayedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SanadShell>{children}</SanadShell>;
}
