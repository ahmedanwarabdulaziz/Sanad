import type { Metadata } from "next";
import RealEstateRequestForm from "@/components/RealEstateRequestForm";

const title = "شريك للبناء أو وحدة بنظام اتحاد الملاك | سند برو كابيتال";
const description =
  "لديك أرض في المجتمعات العمرانية الجديدة وتبحث عن شريك للبناء، أو ترغب في شراء وحدة بنظام اتحاد الملاك؟ أرسل طلبك الآن ليدرسه فريق سند.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.sanadproprojects.com"),
  title,
  description,
  alternates: { canonical: "/real-estate-partnership" },
  openGraph: {
    title,
    description,
    url: "/real-estate-partnership",
    siteName: "Sanad Pro Capital",
    locale: "ar_EG",
    type: "website",
  },
};

export default function RealEstatePartnershipPage() {
  return (
    <main>
      <RealEstateRequestForm />
    </main>
  );
}
