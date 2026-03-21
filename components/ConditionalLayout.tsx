"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isNAdmin = pathname?.includes("/n-admin");
  const isErpAdmin = pathname?.includes("/admin") && !pathname?.includes("/n-admin");

  if (isNAdmin || isErpAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
