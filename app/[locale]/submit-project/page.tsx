import type { Metadata } from "next";
import SubmitProjectForm from "@/components/SubmitProjectForm";

const title = "قدّم مشروعك إلى سند برو كابيتال";
const description =
  "لديك فكرة مشروع أو مشروع قائم يحتاج إلى استثمار أو توسّع؟ أرسل بيانات مشروعك الآن ليدرسها فريق سند.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.sanadproprojects.com"),
  title,
  description,
  alternates: { canonical: "/submit-project" },
  openGraph: {
    title,
    description,
    url: "/submit-project",
    siteName: "Sanad Pro Capital",
    locale: "ar_EG",
    type: "website",
    images: [
      {
        url: "/images/og-submit-project.jpg",
        width: 1200,
        height: 630,
        alt: "قدّم مشروعك إلى سند برو كابيتال للاستثمار أو التوسع",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/images/og-submit-project.jpg"],
  },
};

export default function SubmitProjectPage() {
  return (
    <main>
      <SubmitProjectForm />
    </main>
  );
}
