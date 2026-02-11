"use client";

import ProjectHero from "@/components/ProjectHero";
import ProjectQuickSummary from "@/components/ProjectQuickSummary";
import ProjectOverview from "@/components/ProjectOverview";
import ProjectProduction from "@/components/ProjectProduction";
import ProjectCompetitiveAdvantages from "@/components/ProjectCompetitiveAdvantages";
import AboutProcess from "@/components/AboutProcess";
import ProjectStrategicRoadmap from "@/components/ProjectStrategicRoadmap";
import ProjectGovernance from "@/components/ProjectGovernance";
import ProjectLocation from "@/components/ProjectLocation";
import ProjectInvestmentOpp from "@/components/ProjectInvestmentOpp";
import ProjectFAQ from "@/components/ProjectFAQ";
import ProjectCTA from "@/components/ProjectCTA";
import ProjectDisclaimer from "@/components/ProjectDisclaimer";
import { useTranslations } from "next-intl";

export default function AlNasrFactoryPage() {
    const t = useTranslations("AlNasrFactory");

    // Aligning badges matching Sanad Farms order (where status is often 4th)
    const badges = [
        { label: t("badges.sector.label"), value: t("badges.sector.value") },
        { label: t("badges.location.label"), value: t("badges.location.value") },
        { label: t("badges.supplyRange.label"), value: t("badges.supplyRange.value") },
        { label: t("badges.operatingStatus.label"), value: t("badges.operatingStatus.value") },
        { label: t("badges.nextDevelopment.label"), value: t("badges.nextDevelopment.value") },
        { label: t("badges.ownership.label"), value: t("badges.ownership.value") },
        { label: t("badges.investment.label"), value: t("badges.investment.value") },
    ];

    return (
        <main>
            <ProjectHero
                title={t("title")}
                description={t("description")}
                strategy={{
                    title: t("strategyTitle"),
                    description: t("strategyDesc"),
                    linkText: t("strategyLink"),
                    linkUrl: "/milestone-right" // Consistent with Sanad Farms
                }}
                badges={badges}
                backgroundImage="/images/hero granite.png"
                ctas={{
                    bookSession: t("ctas.catalog"),
                    requestTeaser: t("ctas.survey"),
                    downloadPdf: t("ctas.boq")
                }}
            />

            <ProjectQuickSummary
                data={{
                    title: t("overview.title"),
                    description: t("overview.description"),
                    highlights: t.raw("overview.highlights") as { title: string; value: string }[]
                }}
            />

            <ProjectOverview
                data={{
                    title: t("detailedOverview.title"),
                    description: t("detailedOverview.description"),
                    highlights: t.raw("detailedOverview.highlights") as string[]
                }}
            />

            <ProjectProduction
                data={{
                    title: t("production.title"),
                    current: {
                        title: t("production.stone.title"),
                        items: t.raw("production.stone.items") as string[]
                    },
                    marketing: {
                        title: t("production.finishes.title"),
                        items: t.raw("production.finishes.items") as string[]
                    },
                    revenue: {
                        title: t("production.aggregates.title"),
                        items: t.raw("production.aggregates.items") as string[]
                    }
                }}
            />

            <ProjectCompetitiveAdvantages
                data={{
                    title: t("services.title"),
                    description: t("services.description"),
                    items: t.raw("services.items") as { title: string; description: string }[]
                }}
            />

            <AboutProcess
                data={{
                    title: t("flow.title"),
                    steps: t.raw("flow.steps") as { title: string; description: string }[]
                }}
            />

            <ProjectStrategicRoadmap
                data={{
                    title: t("capacity.title"),
                    description: t("capacity.description"),
                    steps: t.raw("capacity.steps") as { title: string; description: string }[],
                    footer: t("capacity.footer")
                }}
            />

            <ProjectGovernance
                data={{
                    title: t("quality.title"),
                    description: t("quality.description"),
                    points: t.raw("quality.points") as any
                }}
            />

            <ProjectGovernance
                data={{
                    title: t("safety.title"),
                    description: t("safety.description"),
                    points: t.raw("safety.points") as any
                }}
            />

            <ProjectLocation
                data={{
                    title: t("supplyRange.title"),
                    description: t("supplyRange.description"),
                    points: t.raw("supplyRange.points"),
                    badge: t("supplyRange.badge")
                }}
            />

            <ProjectInvestmentOpp
                data={{
                    title: t("investmentOpp.title"),
                    text: t("investmentOpp.text"),
                    cta: {}
                }}
            />

            <ProjectFAQ
                data={{
                    title: t("faq.title"),
                    items: t.raw("faq.items") as { question: string; answer: string }[]
                }}
            />

            <ProjectCTA
                data={{
                    title: t("ctas.title"),
                    buttons: [
                        { text: t("ctas.survey"), href: "#contact", variant: "contained" },
                        { text: t("ctas.boq"), href: "#contact", variant: "outlined" },
                        { text: t("ctas.catalog"), href: "#contact", variant: "outlined" }
                    ]
                }}
            />

            <ProjectDisclaimer
                data={{
                    text: t("disclaimer.text")
                }}
            />
        </main>
    );
}
