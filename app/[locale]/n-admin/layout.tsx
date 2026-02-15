import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "لوحة المبيعات - Sanad",
  description: "لوحة إدارة المبيعات والتواصل",
};

export default function NAdminLayout({
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
