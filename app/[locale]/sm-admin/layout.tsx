import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "سند للرخام والجرانيت",
  description: "نظام إدارة الموارد - الإدارة",
  icons: {
    icon: "/images/short logo.png",
  },
};

export default function SMAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col font-cairo n-admin-rtl" dir="rtl" style={{ backgroundColor: "#f5f5f5" }}>
      {children}
    </main>
  );
}
