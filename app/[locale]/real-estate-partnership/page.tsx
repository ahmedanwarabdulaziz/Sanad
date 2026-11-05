import type { Metadata } from "next";
import RealEstateRequestForm from "@/components/RealEstateRequestForm";
import { listEligibleCityNames } from "@/lib/realEstateCities";

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

// The city list is edited from the admin page, so it's read on every visit rather than at build time.
export const dynamic = "force-dynamic";

export default async function RealEstatePartnershipPage() {
  // With the list unreadable the form shows that no cities are available instead of a broken page.
  const cities = await listEligibleCityNames().catch((error) => {
    console.error(error);
    return [];
  });

  return (
    <main>
      <RealEstateRequestForm cities={cities} />
    </main>
  );
}
