import Hero from "@/components/Hero";
import TrustBar from "@/components/TrustBar";
import FeaturedProjects from "@/components/FeaturedProjects";
import WhySanad from "@/components/WhySanad";
import OurSectors from "@/components/OurSectors";
import MilestoneTeaser from "@/components/MilestoneTeaser";
import PortalTeaser from "@/components/PortalTeaser";
import PartnershipCTA from "@/components/PartnershipCTA";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <Hero />
      <TrustBar />
      <FeaturedProjects />
      <WhySanad />
      <OurSectors />
      <MilestoneTeaser />
      <PortalTeaser />
      <PartnershipCTA />
    </main>
  );
}
