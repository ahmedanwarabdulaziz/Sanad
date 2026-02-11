import ProjectHero from "@/components/ProjectHero";
import ProjectStatus from "@/components/ProjectStatus";
import ProjectOverview from "@/components/ProjectOverview";
import ProjectLocation from "@/components/ProjectLocation";
import ProjectLandData from "@/components/ProjectLandData";
import ProjectLiveStatus from "@/components/ProjectLiveStatus";
import ProjectRoadmap from "@/components/ProjectRoadmap";
import ProjectMilestoneRight from "@/components/ProjectMilestoneRight";
import ProjectInvestorView from "@/components/ProjectInvestorView";
import ProjectOwnership from "@/components/ProjectOwnership";
import ProjectReturns from "@/components/ProjectReturns";
import ProjectGovernance from "@/components/ProjectGovernance";
import ProjectInvestmentOpp from "@/components/ProjectInvestmentOpp";
import ProjectDisclaimer from "@/components/ProjectDisclaimer";
import ProjectFAQ from "@/components/ProjectFAQ";
import { useTranslations } from "next-intl";

export default function SanadZayedPage() {
    const t = useTranslations("SanadZayed");
    const tCommon = useTranslations("Common");

    const badges = [
        { label: t("badges.sector.label"), value: t("badges.sector.value") },
        { label: t("badges.location.label"), value: t("badges.location.value") },
        { label: t("badges.entity.label"), value: t("badges.entity.value") },
        { label: t("badges.status.label"), value: t("badges.status.value") },
        { label: t("badges.investment.label"), value: t("badges.investment.value") },
        { label: t("badges.ownership.label"), value: t("badges.ownership.value") },
        { label: t("badges.sanadShare.label"), value: t("badges.sanadShare.value") },
    ];

    const statusData = {
        title: t("projectStatus.title"),
        items: [
            { label: t("projectStatus.currentStage.label"), value: t("projectStatus.currentStage.value") },
            { label: t("projectStatus.nextStep.label"), value: t("projectStatus.nextStep.value") },
            { label: t("projectStatus.investmentStatus.label"), value: t("projectStatus.investmentStatus.value") },
            { label: t("projectStatus.sanadContribution.label"), value: t("projectStatus.sanadContribution.value") },
            { label: t("projectStatus.lastUpdate.label"), value: t("projectStatus.lastUpdate.value") },
        ]
    };

    return (
        <main>
            <ProjectHero
                title={t("title")}
                description={t("description")}
                strategy={{
                    title: t("strategyTitle"),
                    description: t("strategyDesc"),
                    linkText: t("strategyLink"),
                    linkUrl: "#" // Link placeholder as requested
                }}
                badges={badges}
                ctas={{
                    bookSession: t("ctas.bookSession"),
                    requestTeaser: t("ctas.requestTeaser"),
                    downloadPdf: t("ctas.downloadPdf")
                }}
            />

            <ProjectStatus data={statusData} />

            <ProjectOverview
                data={{
                    title: t("overview.title"),
                    description: t("overview.description"),
                    highlights: [
                        t("overview.highlights.1"),
                        t("overview.highlights.2"),
                        t("overview.highlights.3")
                    ]
                }}
            />

            <ProjectLocation
                data={{
                    title: t("location.title"),
                    description: t("location.description"),
                    points: [
                        t("location.points.1"),
                        t("location.points.2"),
                        t("location.points.3"),
                        t("location.points.4"),
                        t("location.points.5")
                    ]
                }}
            />

            <ProjectLandData
                data={{
                    title: t("landData.title"),
                    table: {
                        area: { label: t("landData.table.area.label"), value: t("landData.table.area.value") },
                        usage: { label: t("landData.table.usage.label"), value: t("landData.table.usage.value") },
                        authority: { label: t("landData.table.authority.label"), value: t("landData.table.authority.value") },
                        requirements: { label: t("landData.table.requirements.label"), value: t("landData.table.requirements.value") },
                        ratio: { label: t("landData.table.ratio.label"), value: t("landData.table.ratio.value") }
                    },
                    note: t("landData.note")
                }}
            />

            <ProjectLiveStatus
                data={{
                    title: t("liveStatus.title"),
                    stages: {
                        done: {
                            label: t("liveStatus.stages.done.label"),
                            items: [
                                t("liveStatus.stages.done.items.1"),
                                t("liveStatus.stages.done.items.2")
                            ]
                        },
                        inProgress: {
                            label: t("liveStatus.stages.inProgress.label"),
                            items: [
                                t("liveStatus.stages.inProgress.items.1")
                            ]
                        },
                        next: {
                            label: t("liveStatus.stages.next.label"),
                            items: [
                                t("liveStatus.stages.next.items.1")
                            ]
                        }
                    }
                }}
            />

            <ProjectRoadmap
                data={{
                    title: t("roadmap.title"),
                    description: t("roadmap.description"),
                    steps: {
                        "1": t("roadmap.steps.1"),
                        "2": t("roadmap.steps.2"),
                        "3": t("roadmap.steps.3"),
                        "4": t("roadmap.steps.4"),
                        "5": t("roadmap.steps.5"),
                        "6": t("roadmap.steps.6")
                    }
                }}
            />

            <ProjectMilestoneRight
                data={{
                    title: t("milestoneRight.title"),
                    description: t("milestoneRight.description"),
                    points: {
                        clarity: {
                            title: t("milestoneRight.points.clarity.title"),
                            desc: t("milestoneRight.points.clarity.desc")
                        },
                        fairness: {
                            title: t("milestoneRight.points.fairness.title"),
                            desc: t("milestoneRight.points.fairness.desc")
                        },
                        transparency: {
                            title: t("milestoneRight.points.transparency.title"),
                            desc: t("milestoneRight.points.transparency.desc")
                        }
                    },
                    cta: t("milestoneRight.cta")
                }}
            />

            <ProjectInvestorView
                data={{
                    title: t("investorView.title"),
                    description: t("investorView.description"),
                    cards: {
                        "1": t("investorView.cards.1"),
                        "2": t("investorView.cards.2"),
                        "3": t("investorView.cards.3"),
                        "4": t("investorView.cards.4"),
                        "5": t("investorView.cards.5"),
                        "6": t("investorView.cards.6")
                    }
                }}
            />

            <ProjectOwnership
                data={{
                    title: t("ownership.title"),
                    text: t("ownership.text")
                }}
            />

            <ProjectReturns
                data={{
                    title: t("returns.title"),
                    description: t("returns.description"),
                    cards: {
                        partnership: {
                            title: t("returns.cards.partnership.title"),
                            desc: t("returns.cards.partnership.desc")
                        },
                        management: {
                            title: t("returns.cards.management.title"),
                            desc: t("returns.cards.management.desc")
                        },
                        valueCreation: {
                            title: t("returns.cards.valueCreation.title"),
                            desc: t("returns.cards.valueCreation.desc")
                        }
                    },
                    note: t("returns.note")
                }}
            />

            <ProjectGovernance
                data={{
                    title: t("governance.title"),
                    description: t("governance.description"),
                    points: {
                        "1": t("governance.points.1"),
                        "2": t("governance.points.2"),
                        "3": t("governance.points.3"),
                        "4": t("governance.points.4"),
                        "5": t("governance.points.5"),
                        "6": t("governance.points.6"),
                        "7": t("governance.points.7")
                    }
                }}
            />

            <ProjectInvestmentOpp
                data={{
                    title: t("investmentOpp.title"),
                    text: t("investmentOpp.text"),
                    cta: {
                        session: t("investmentOpp.cta.session"),
                        teaser: t("investmentOpp.cta.teaser"),
                        nda: t("investmentOpp.cta.nda")
                    }
                }}
            />

            <ProjectFAQ
                data={{
                    title: t("faq.title"),
                    items: [
                        { question: t("faq.items.1.question"), answer: t("faq.items.1.answer") },
                        { question: t("faq.items.2.question"), answer: t("faq.items.2.answer") },
                        { question: t("faq.items.3.question"), answer: t("faq.items.3.answer") },
                        { question: t("faq.items.4.question"), answer: t("faq.items.4.answer") },
                        { question: t("faq.items.5.question"), answer: t("faq.items.5.answer") },
                        { question: t("faq.items.6.question"), answer: t("faq.items.6.answer") },
                        { question: t("faq.items.7.question"), answer: t("faq.items.7.answer") },
                        { question: t("faq.items.8.question"), answer: t("faq.items.8.answer") }
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
