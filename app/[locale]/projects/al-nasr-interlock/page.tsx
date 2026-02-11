"use client";

import ProjectHero from "@/components/ProjectHero";
import ProjectQuickSummary from "@/components/ProjectQuickSummary";
import ProjectOverview from "@/components/ProjectOverview";
import ProjectProduction from "@/components/ProjectProduction";
import ProjectCompetitiveAdvantages from "@/components/ProjectCompetitiveAdvantages";
import AboutProcess from "@/components/AboutProcess";
import ProjectInvestmentOpp from "@/components/ProjectInvestmentOpp";
import ProjectFAQ from "@/components/ProjectFAQ";
import ProjectCTA from "@/components/ProjectCTA";
import ProjectDisclaimer from "@/components/ProjectDisclaimer";
import { useTranslations } from "next-intl";

export default function AlNasrInterlockPage() {
    const t = useTranslations("AlNasrInterlock");

    const badges = [
        { label: t("badges.sector.label"), value: t("badges.sector.value") },
        { label: t("badges.location.label"), value: t("badges.location.value") },
        { label: t("badges.supplyRange.label"), value: t("badges.supplyRange.value") },
        { label: t("badges.operatingStatus.label"), value: t("badges.operatingStatus.value") },
        { label: t("badges.ownership.label"), value: t("badges.ownership.value") },
        { label: t("badges.services.label"), value: t("badges.services.value") },
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
                    linkUrl: "/milestone-right"
                }}
                badges={badges}
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
                        title: t("production.interlock.title"),
                        items: t.raw("production.interlock.items") as string[]
                    },
                    marketing: {
                        title: t("production.tiles.title"),
                        items: t.raw("production.tiles.items") as string[]
                    },
                    revenue: {
                        title: t("production.curbstone.title"),
                        items: t.raw("production.curbstone.items") as string[]
                    }
                }}
            />

            <ProjectCompetitiveAdvantages
                data={{
                    title: t("uses.title"),
                    description: t("uses.description"),
                    items: t.raw("uses.items") as { title: string; description: string }[]
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

            <ProjectCompetitiveAdvantages
                data={{
                    title: t("quality.title"),
                    description: t("quality.description"),
                    items: t.raw("quality.items") as { title: string; description: string }[]
                }}
            />

            <ProjectCompetitiveAdvantages
                data={{
                    title: t("safety.title"),
                    description: t("safety.description"),
                    items: t.raw("safety.items") as { title: string; description: string }[]
                }}
            />

            <ProjectCompetitiveAdvantages
                data={{
                    title: t("supply.title"),
                    description: t("supply.description"),
                    items: t.raw("supply.items") as { title: string; description: string }[]
                }}
            />

            <ProjectInvestmentOpp
                data={{
                    title: t("investmentDetails.title"),
                    text: t("investmentDetails.description"),
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
                    title: t("finalCta.title"),
                    buttons: [
                        {
                            text: t("finalCta.buttons.survey"),
                            href: "#",
                            variant: "contained"
                        },
                        {
                            text: t("finalCta.buttons.boq"),
                            href: "#",
                            variant: "outlined"
                        },
                        {
                            text: t("finalCta.buttons.catalog"),
                            href: "#",
                            variant: "outlined"
                        }
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
