"use client";

import { Box, Button, Container, Typography, Grid } from "@mui/material";
import { Link } from "@/navigation";
import { motion } from "framer-motion";

interface MilestoneHeroProps {
    data: {
        title: string;
        subtitle: string;
        description: string;
        cta: {
            session: string;
            projects: string;
        };
    };
    locale?: string;
}

export default function MilestoneHero({ data, locale }: MilestoneHeroProps) {
    // Forced RTL for Arabic content
    const isRtl = true;

    return (
        <Box
            dir="rtl"
            sx={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                backgroundColor: "#154278", // Blue background for the content section
                color: "#d1d0c6",
                overflow: "hidden",
                minHeight: "100vh",
                textAlign: "right",
            }}
        >
            {/* Top Image Section - Exact same as Home Page Hero */}
            <Box
                sx={{
                    width: "100%",
                    height: { xs: "40vh", md: "60vh" },
                    backgroundImage: "url('/images/hero.png')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    position: "relative"
                }}
            >
                {/* Gradient Overlay for melting edge */}
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

            <Container maxWidth="xl" sx={{ position: "relative", zIndex: 2, pt: 4, pb: 12 }}>
                <Grid container spacing={6} alignItems="flex-start">
                    <Grid size={{ xs: 12, md: 8 }}>
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            style={{ textAlign: "right" }} // Ensure motion div also aligns right
                        >
                            <Typography
                                component="h1"
                                dir="rtl"
                                sx={{
                                    fontWeight: "bold",
                                    mb: 1,
                                    color: "#d1d0c6 !important",
                                    textAlign: "left",
                                }}
                            >
                                <Box component="span" sx={{ display: 'block', fontSize: { xs: "2rem", md: "3.5rem" }, lineHeight: 1.1 }}>
                                    {data.title}
                                </Box>
                                <Box component="span" sx={{ display: 'block', fontSize: { xs: "1.2rem", md: "2rem" }, lineHeight: 1.3, mt: 1, opacity: 0.9 }}>
                                    {data.subtitle}
                                </Box>
                            </Typography>
                            <Typography
                                variant="h6"
                                dir="rtl"
                                sx={{
                                    mb: 4,
                                    pt: 2,
                                    color: "#d1d0c6 !important",
                                    lineHeight: 1.8,
                                    fontWeight: 500,
                                    fontSize: "1.2rem",
                                    maxWidth: "90%",
                                    textAlign: "left",
                                }}
                            >
                                {data.description}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, justifyContent: "flex-start" }}> {/* Ensure buttons align to start (right in RTL) */}
                                <Button
                                    href="/contact"
                                    component={Link}
                                    variant="contained"
                                    size="large"
                                    sx={{
                                        backgroundColor: "#d1d0c6",
                                        color: "#154278",
                                        fontWeight: "bold",
                                        "&:hover": {
                                            backgroundColor: "#ffffff",
                                        },
                                    }}
                                >
                                    {data.cta.session}
                                </Button>
                                <Button
                                    href="/projects"
                                    component={Link}
                                    variant="outlined"
                                    size="large"
                                    sx={{
                                        color: "#d1d0c6 !important",
                                        borderColor: "#d1d0c6 !important",
                                        "&:hover": {
                                            borderColor: "#ffffff !important",
                                            backgroundColor: "rgba(209, 208, 198, 0.1)"
                                        }
                                    }}
                                >
                                    {data.cta.projects}
                                </Button>
                            </Box>
                        </motion.div>
                    </Grid>

                    {/* Empty Grid item to balance layout if needed */}
                    <Grid size={{ xs: 12, md: 4 }} />
                </Grid>
            </Container>

            {/* Decorative Circles - Adjusted to be subtle in blue background */}
            <Box sx={{
                display: { xs: 'none', md: 'block' },
                position: 'absolute',
                top: '50%',
                right: '-5%',
                width: '400px',
                height: '400px',
                borderRadius: '50%',
                background: 'rgba(209, 208, 198, 0.05)',
                zIndex: 0
            }} />
        </Box>
    );
}
