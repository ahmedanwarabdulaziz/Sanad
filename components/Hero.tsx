"use client";

import { Box, Button, Container, Typography, Grid, Stack, Divider } from "@mui/material";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LanIcon from '@mui/icons-material/Lan';
import { Link } from "@/navigation";
import { useState } from "react";
import ContactModal from "./ContactModal";

export default function Hero() {
    const t = useTranslations("HomePage");
    const locale = useLocale();
    const isRtl = locale === 'ar';
    const [contactOpen, setContactOpen] = useState(false);

    return (
        <Box
            sx={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                backgroundColor: "#154278",
                color: "#d1d0c6",
                overflow: "hidden",
                minHeight: "100vh"
            }}
        >
            {/* Top Image Section */}
            <Box
                sx={{
                    width: "100%",
                    height: { xs: "35vh", md: "55vh" },
                    backgroundImage: "url('/images/hero.png')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    position: "relative"
                }}
            >
                <Box
                    sx={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: "150px",
                        background: "linear-gradient(to bottom, transparent, #154278)",
                        zIndex: 1
                    }}
                />
            </Box>

            <Container maxWidth="xl" sx={{ position: "relative", zIndex: 2, pt: 2, pb: 10 }}>
                <Grid container spacing={4} alignItems="flex-start">
                    <Grid size={{ xs: 12, md: 9 }}>
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                        >
                            <Typography
                                component="h1"
                                sx={{
                                    fontWeight: "bold",
                                    mb: 2,
                                    color: "#d1d0c6 !important",
                                }}
                            >
                                <Box component="span" sx={{ display: 'block', fontSize: { xs: "2.2rem", md: "3.8rem" }, lineHeight: 1.1 }}>
                                    {t("heroTitleLine1")}
                                </Box>
                                <Box component="span" sx={{ display: 'block', fontSize: { xs: "1.6rem", md: "2.8rem" }, lineHeight: 1.3, mt: 1, opacity: 0.9 }}>
                                    {t("heroTitleLine2")}
                                </Box>
                            </Typography>

                            <Typography
                                variant="h6"
                                sx={{
                                    mb: 4,
                                    color: "#d1d0c6 !important",
                                    lineHeight: 1.8,
                                    fontWeight: 400,
                                    fontSize: isRtl ? "1.2rem" : "1.3rem",
                                    maxWidth: "1000px",
                                    opacity: 0.95
                                }}
                            >
                                {t("heroSubtitle")}
                            </Typography>

                            {/* Milestone Right Note */}
                            <Box
                                sx={{
                                    mb: 5,
                                    p: 2.5,
                                    borderRadius: 2,
                                    bgcolor: 'rgba(209, 208, 198, 0.08)',
                                    border: '1px solid rgba(209, 208, 198, 0.15)',
                                    maxWidth: '900px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2
                                }}
                            >
                                <LanIcon sx={{ color: '#C29B40', fontSize: 28 }} />
                                <Typography sx={{ fontSize: '0.95rem', lineHeight: 1.6, color: '#d1d0c6' }}>
                                    {t("milestoneNote")}
                                </Typography>
                            </Box>

                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={2}
                                sx={{ mt: 2 }}
                            >
                                <Button
                                    component={Link}
                                    href="/projects"
                                    variant="contained"
                                    size="large"
                                    endIcon={<ArrowForwardIcon sx={{ transform: isRtl ? 'rotate(180deg)' : 'none' }} />}
                                    sx={{
                                        backgroundColor: "#d1d0c6",
                                        color: "#154278",
                                        fontWeight: "bold",
                                        px: 4,
                                        py: 1.8,
                                        borderRadius: 50,
                                        "&:hover": {
                                            backgroundColor: "#ffffff",
                                        },
                                    }}
                                >
                                    {t("exploreProjects")}
                                </Button>
                                <Button
                                    component={Link}
                                    href="/#sectors"
                                    variant="outlined"
                                    size="large"
                                    sx={{
                                        color: "#d1d0c6 !important",
                                        borderColor: "#d1d0c6 !important",
                                        px: 4,
                                        py: 1.8,
                                        borderRadius: 50,
                                        "&:hover": {
                                            borderColor: "#ffffff !important",
                                            backgroundColor: "rgba(209, 208, 198, 0.1)"
                                        }
                                    }}
                                >
                                    {t("exploreSectors")}
                                </Button>
                                <Button
                                    onClick={() => setContactOpen(true)}
                                    variant="text"
                                    size="large"
                                    sx={{
                                        color: "#d1d0c6 !important",
                                        px: 3,
                                        py: 1.8,
                                        fontWeight: 600,
                                        "&:hover": {
                                            color: "#ffffff !important",
                                            backgroundColor: "transparent",
                                            textDecoration: 'underline'
                                        }
                                    }}
                                >
                                    {t("contactUs")}
                                </Button>
                            </Stack>

                            <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
                        </motion.div>
                    </Grid>
                </Grid>
            </Container>

            {/* Decorative Background Element */}
            <Box sx={{
                display: { xs: 'none', lg: 'block' },
                position: 'absolute',
                top: '50%',
                right: '5%',
                width: '450px',
                height: '450px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(209, 208, 198, 0.05) 0%, rgba(209, 208, 198, 0) 70%)',
                zIndex: 0
            }} />
        </Box>
    );
}
