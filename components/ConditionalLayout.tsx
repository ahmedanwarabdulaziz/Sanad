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

  // The interactive master plan is a full-screen experience with its own header.
  const isMasterplan = pathname?.includes("/masterplan");
  // So is the «حقّ المرحلة» film.
  const isFilm = pathname?.includes("/milestone-right/film");

  if (isNAdmin || isErpAdmin || isMasterplan || isFilm) {
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
