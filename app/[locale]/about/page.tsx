import AboutHero from "@/components/AboutHero";
import AboutWhoWeAre from "@/components/AboutWhoWeAre";
import AboutWhatWeDo from "@/components/AboutWhatWeDo";
import AboutProcess from "@/components/AboutProcess";
import AboutMilestoneRight from "@/components/AboutMilestoneRight";
import AboutWhySanad from "@/components/AboutWhySanad";
import AboutSectors from "@/components/AboutSectors";
import AboutValues from "@/components/AboutValues";
import AboutPartnershipCTA from "@/components/AboutPartnershipCTA";

export default function AboutPage() {
    const heroData = {
        title: "عن سند برو كابيتال للمشروعات",
        description: "نؤسس ونُدير مشاريع ترتكز على دراسات جدوى دقيقة، واستراتيجية نمو، وهيكلة تمويل مُنضبطة—لتعظيم الربحية واستدامة العائد.",
        trustLine: "نعمل عبر قطاعات متعددة، بمنهج مؤسسي يربط القرار بالبيانات، ويحوّل الفرص إلى مشاريع قابلة للتنفيذ والتشغيل.",
        buttons: {
            explore: "استكشف المشاريع",
            contact: "تواصل مع فريق الاستثمار"
        }
    };

    const whoWeAreData = {
        title: "من نحن",
        content: "Sanad Pro Capital Projects | سند برو كابيتال للمشروعات هي مجموعة أعمال تعمل على تأسيس وإدارة مشاريع استثمارية في مجالات متعددة. نقود دورة المشروع من تقييم الفرصة ودراسة الجدوى، مرورًا بـ التخطيط والهيكلة التمويلية، وصولًا إلى إدارة التنفيذ والتشغيل بحسب طبيعة كل مشروع. نؤمن أن الاستثمار الناجح لا يعتمد على الفكرة وحدها، بل على منهج إدارة منضبط، وشفافية معلوماتية، وشراكات متوازنة تجمع رأس المال بالخبرة."
    };

    const whatWeDoData = {
        title: "ماذا نقدم",
        services: [
            {
                title: "تقييم الفرص ودراسات الجدوى",
                description: "نحلّل السوق والطلب والمخاطر، ونحوّل الفكرة إلى خطة قابلة للقياس والتنفيذ."
            },
            {
                title: "استراتيجية المشروع وهيكلة التمويل",
                description: "نحدد النموذج الاستثماري المناسب، ونصمم هيكل تمويل يوازن بين النمو والسيولة وإدارة المخاطر."
            },
            {
                title: "إدارة التنفيذ وإدارة الموردين",
                description: "نقود التنفيذ وفق خطة واضحة، مع ضبط الجودة والنطاق والزمن والتكاليف."
            },
            {
                title: "إدارة التشغيل والمتابعة",
                description: "نستمر في إدارة المشروع بعد الإطلاق/التشغيل بما يحافظ على الأداء ويعظّم العائد."
            },
            {
                title: "منظومة شفافية ومعلومات",
                description: "نوفر قاعدة بيانات لكل مشروع لتمكين المتابعة والتوثيق وتوضيح القرارات والمخرجات."
            }
        ]
    };

    const processData = {
        title: "منهج العمل",
        steps: [
            {
                title: "اختيار الفرصة",
                description: "معايير واضحة للطلب والجدوى وقابلية التنفيذ"
            },
            {
                title: "الدراسة والتحليل",
                description: "جدوى + مخاطر + سيناريوهات"
            },
            {
                title: "التصميم والهيكلة",
                description: "استراتيجية نمو + هيكل شراكة + تمويل"
            },
            {
                title: "التنفيذ",
                description: "إدارة مشاريع منضبطة ومؤشرات متابعة"
            },
            {
                title: "التشغيل والتحسين",
                description: "أداء مستدام وتطوير مستمر"
            }
        ]
    };

    const milestoneRightData = {
        title: "حقّ المرحلة | Sanad | MilestoneRight",
        description: "ابتكرنا منهج \"حقّ المرحلة\" لبناء شراكات استثمارية أكثر عدالة وشفافية. يقوم على ربط دخول المستثمر بقيمة المراحل المُنجزة والمُوثقة، مع إتاحة متابعة كاملة عبر قاعدة بيانات المشروع، وتطابق مصالح فعلي عبر مساهمة سند برأس مال لا يقل عن 30% عند الانطلاق.",
        ctaText: "اعرف حقّ المرحلة بالتفصيل",
        ctaLink: "/milestone-right"
    };

    const whySanadData = {
        title: "لماذا سند؟",
        features: [
            {
                title: "منهج مؤسسي",
                description: "قرار مبني على بيانات ومخرجات موثقة"
            },
            {
                title: "شفافية متابعة",
                description: "قاعدة بيانات وتقارير تقدم للمستثمرين"
            },
            {
                title: "تطابق مصالح",
                description: "مساهمة سند المالية ≥ 30% عند الانطلاق"
            },
            {
                title: "إدارة تنفيذ وتشغيل",
                description: "ليس تمويلًا فقط—بل إدارة دورة المشروع"
            },
            {
                title: "حوكمة واضحة",
                description: "فصل التكاليف وضبط تغيير النطاق"
            },
            {
                title: "شراكات مرنة",
                description: "رأس مال + خبرة تشغيلية ضمن إطار واحد"
            }
        ]
    };

    const sectorsData = {
        title: "قطاعات عملنا",
        sectors: [
            {
                title: "التطوير العقاري",
                description: "تطوير مشاريع وفق اشتراطات واضحة وخطة تنفيذ وتسويق"
            },
            {
                title: "الاستثمار الزراعي",
                description: "أصول منتجة وإدارة تشغيل تضمن الاستدامة"
            },
            {
                title: "الاستثمار الصناعي",
                description: "تصنيع + توريد + تركيب مع القدرة على التوريدات والمناقصات"
            },
            {
                title: "الرخام والجرانيت والكسارات",
                description: "حلول مواد وتشطيبات للمشروعات"
            }
        ]
    };

    const valuesData = {
        title: "قيمنا",
        values: [
            {
                title: "الشفافية",
                description: "الإفصاح المنظم والتوثيق"
            },
            {
                title: "الانضباط",
                description: "خطط واضحة ومتابعة مؤشرات"
            },
            {
                title: "العدالة",
                description: "شراكات متوازنة عبر الزمن"
            },
            {
                title: "الاستدامة",
                description: "ربحية قابلة للاستمرار لا مكاسب لحظية"
            }
        ]
    };

    const partnershipCTAData = {
        title: "هل تبحث عن شراكة؟",
        description: "نرحب بالشراكات مع المستثمرين، ومع الشركاء أصحاب الخبرات التشغيلية الذين يحتاجون إلى إدارة واستراتيجية وتمويل ضمن إطار مؤسسي واضح. إذا كنت مهتمًا بمشروع محدد أو بنموذج “حقّ المرحلة”، تواصل معنا لجدولة جلسة تعريف.",
        buttons: {
            book: "احجز جلسة تعريف",
            contact: "تواصل معنا"
        }
    };

    return (
        <main>
            <AboutHero data={heroData} />
            <AboutWhoWeAre data={whoWeAreData} />
            <AboutWhatWeDo data={whatWeDoData} />
            <AboutProcess data={processData} />
            <AboutMilestoneRight data={milestoneRightData} />
            <AboutWhySanad data={whySanadData} />
            <AboutSectors data={sectorsData} />
            <AboutValues data={valuesData} />
            <AboutPartnershipCTA data={partnershipCTAData} />
        </main>
    );
}
