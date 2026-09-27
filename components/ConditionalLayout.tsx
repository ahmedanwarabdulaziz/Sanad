"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";
import MarbleHeader from "./MarbleHeader";

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isNAdmin = pathname?.includes("/n-admin");
  const isErpAdmin = pathname?.includes("/admin") && !pathname?.includes("/n-admin");

  const isMarbleProject = pathname?.includes("/projects/marble");

  if (isNAdmin || isErpAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      {isMarbleProject ? <MarbleHeader /> : <Header />}
      {children}
      <Footer />
    </>
  );
}
