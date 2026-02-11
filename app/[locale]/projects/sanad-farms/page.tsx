"use client";

import ProjectHero from "@/components/ProjectHero";
import ProjectQuickSummary from "@/components/ProjectQuickSummary";
import ProjectOverview from "@/components/ProjectOverview";
import ProjectLocation from "@/components/ProjectLocation";
import ProjectTechnicalSpecs from "@/components/ProjectTechnicalSpecs";
import ProjectProduction from "@/components/ProjectProduction";
import ProjectStrategicRoadmap from "@/components/ProjectStrategicRoadmap";
import ProjectMilestoneStages from "@/components/ProjectMilestoneStages";
import ProjectPartnerView from "@/components/ProjectPartnerView";
import ProjectOwnership from "@/components/ProjectOwnership";
import ProjectCompetitiveAdvantages from "@/components/ProjectCompetitiveAdvantages";
import ProjectInvestmentOpp from "@/components/ProjectInvestmentOpp";
import ProjectFAQ from "@/components/ProjectFAQ";
import ProjectDisclaimer from "@/components/ProjectDisclaimer";
import { useTranslations } from "next-intl";

export default function SanadFarmsPage() {
    const t = useTranslations("SanadFarms");

    const badges = [
        { label: t("badges.sector.label"), value: t("badges.sector.value") },
        { label: t("badges.location.label"), value: t("badges.location.value") },
        { label: t("badges.purchaseDate.label"), value: t("badges.purchaseDate.value") },
        { label: t("badges.revenueStatus.label"), value: t("badges.revenueStatus.value") },
        { label: t("badges.ownership.label"), value: t("badges.ownership.value") },
        { label: t("badges.investment.label"), value: t("badges.investment.value") },
        { label: t("badges.operatingPattern.label"), value: t("badges.operatingPattern.value") },
    ];

    const quickHighlights = t.raw("overview.highlights") as { title: string; value: string }[];
    const detailedHighlights = t.raw("detailedOverview.highlights") as string[];

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
                    bookSession: t("ctas.contactManagement"),
                    requestTeaser: t("ctas.viewReports"),
                    downloadPdf: ""
                }}
            />

            <ProjectQuickSummary
                data={{
                    title: t("overview.title"),
                    description: t("overview.description"),
                    highlights: quickHighlights
                }}
            />

            <ProjectOverview
                data={{
                    title: t("detailedOverview.title"),
                    description: t("detailedOverview.description"),
                    highlights: detailedHighlights
                }}
            />

            <ProjectLocation
                data={{
                    title: t("location.title"),
                    description: t("location.description"),
                    points: [
                        t("location.points.1"),
                        t("location.points.2"),
                        t("location.points.3")
                    ],
                    badge: t("location.badge")
                }}
            />

            <ProjectTechnicalSpecs
                data={{
                    title: t("specs.title"),
                    infrastructure: {
                        title: t("specs.infrastructure.title"),
                        items: t.raw("specs.infrastructure.items") as any[]
                    },
                    irrigation: {
                        title: t("specs.irrigation.title"),
                        items: t.raw("specs.irrigation.items") as any[]
                    },
                    livestock: {
                        title: t("specs.livestock.title"),
                        description: t("specs.livestock.description"),
                        readyStatus: t("specs.livestock.readyStatus")
                    }
                }}
            />

            <ProjectProduction
                data={{
                    title: t("production.title"),
                    current: {
                        title: t("production.current.title"),
                        items: t.raw("production.current.items") as string[]
                    },
                    marketing: {
                        title: t("production.marketing.title"),
                        description: t("production.marketing.description")
                    },
                    revenue: {
                        title: t("production.revenue.title"),
                        description: t("production.revenue.description"),
                        revenueLabel: t("production.revenue.revenueLabel")
                    }
                }}
            />

            <ProjectStrategicRoadmap
                data={{
                    title: t("roadmap.title"),
                    description: t("roadmap.description"),
                    steps: t.raw("roadmap.steps") as any[],
                    footer: t("roadmap.footer")
                }}
            />

            <ProjectMilestoneStages
                data={{
                    title: t("milestoneRight.title"),
                    subtitle: t("milestoneRight.subtitle"),
                    description: t("milestoneRight.description"),
                    stages: t.raw("milestoneRight.stages") as any[],
                    cta: t("milestoneRight.cta")
                }}
            />

            <ProjectPartnerView
                data={{
                    title: t("investorView.title"),
                    description: t("investorView.description"),
                    items: t.raw("investorView.items") as string[],
                    note: t("investorView.note")
                }}
            />

            <ProjectOwnership
                data={{
                    title: t("ownership.title"),
                    text: t("ownership.text")
                }}
            />

            <ProjectCompetitiveAdvantages
                data={{
                    title: t("competitiveAdvantages.title"),
                    description: t("competitiveAdvantages.description"),
                    items: t.raw("competitiveAdvantages.items") as any[]
                }}
            />

            <ProjectInvestmentOpp
                data={{
                    title: t("investment.title"),
                    text: t("investment.text"),
                    cta: {
                        teaser: t("investment.cta.teaser")
                    }
                }}
            />

            <ProjectFAQ
                data={{
                    title: t("faq.title"),
                    items: t.raw("faq.items") as any[]
                }}
            />

            <ProjectInvestmentOpp
                data={{
                    title: t("expertCollaboration.title"),
                    text: t("expertCollaboration.text"),
                    cta: {
                        expert: t("expertCollaboration.cta.expert"),
                        session: t("expertCollaboration.cta.session")
                    }
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
