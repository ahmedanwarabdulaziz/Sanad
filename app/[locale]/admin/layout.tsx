import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sanad ERP - تسجيل الدخول",
  description: "نظام إدارة الموارد - سند",
  icons: {
    icon: "/images/short logo.png",
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      className="font-cairo"
      dir="rtl"
      style={{
        minHeight: "100vh",
        backgroundColor: "#d1d0c6",
      }}
    >
      {children}
    </main>
  );
}
