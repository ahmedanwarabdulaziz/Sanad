"use client";

import { Box, Button, Container, Typography, Grid, Chip, Link as MuiLink } from "@mui/material";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'; // For Strategy Link
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'; // For PDF Download

interface ProjectHeroProps {
    title: string;
    description: string;
    strategy: {
        title: string;
        description: string;
        linkText: string;
        linkUrl: string;
    };
    badges: {
        label: string;
        value: string;
    }[];
    ctas: {
        bookSession: string;
        requestTeaser: string;
        downloadPdf: string;
    };
}

export default function ProjectHero({ title, description, strategy, badges, ctas }: ProjectHeroProps) {
    // Forced RTL for Arabic site
    const isRtl = true;


    return (
        <Box
            sx={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                backgroundColor: "#154278", // Blue background for the content section
                color: "#d1d0c6",
                overflow: "hidden",
                minHeight: "100vh"
            }}
        >
            {/* Top Image Section (Visible on all screens) */}
            <Box
                sx={{
                    width: "100%",
                    height: { xs: "40vh", md: "60vh" }, // Taller image on desktop
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
                    {/* Left Column: Title, Description, Strategy */}
                    <Grid size={{ xs: 12, md: 7 }}>
                        <motion.div
                            initial={{ opacity: 0, x: isRtl ? 50 : -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8 }}
                        >
                            <Typography
                                component="h1"
                                sx={{
                                    fontWeight: "bold",
                                    mb: 2,
                                    color: "#d1d0c6",
                                    fontSize: { xs: "2rem", md: "3.5rem" },
                                    lineHeight: 1.2
                                }}
                            >
                                {title}
                            </Typography>

                            <Typography
                                variant="h6"
                                sx={{
                                    mb: 4,
                                    color: "#d1d0c6",
                                    lineHeight: 1.8,
                                    fontWeight: 500,
                                    fontSize: { xs: "1.1rem", md: "1.25rem" },
                                    maxWidth: "90%",
                                    // Removed ml: auto which was pushing text oddly
                                }}
                            >
                                {description}
                            </Typography>

                            {/* CTAs */}
                            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                                <Button
                                    variant="contained"
                                    size="large"
                                    sx={{
                                        backgroundColor: "#d1d0c6",
                                        color: "#154278",
                                        fontWeight: "bold",
                                        "&:hover": { backgroundColor: "#ffffff" },
                                    }}
                                >
                                    {ctas.bookSession}
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="large"
                                    sx={{
                                        color: "#d1d0c6",
                                        borderColor: "#d1d0c6",
                                        "&:hover": { borderColor: "#ffffff", backgroundColor: "rgba(209, 208, 198, 0.1)" }
                                    }}
                                >
                                    {ctas.requestTeaser}
                                </Button>
                                <Button
                                    startIcon={<PictureAsPdfIcon />}
                                    sx={{
                                        color: "#d1d0c6",
                                        opacity: 0.8,
                                        "&:hover": { opacity: 1, textDecoration: 'underline' }
                                    }}
                                >
                                    {ctas.downloadPdf}
                                </Button>
                            </Box>
                        </motion.div>
                    </Grid>

                    {/* Right Column: Badges */}
                    <Grid size={{ xs: 12, md: 5 }}>
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                        >
                            <Box
                                dir="ltr" // Reversed to LTR
                                sx={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    backdropFilter: 'blur(10px)',
                                    borderRadius: 4,
                                    p: 3,
                                    border: '1px solid rgba(209, 208, 198, 0.2)',
                                    textAlign: 'left', // Reversed to Left
                                    width: '100%', // Ensure full width
                                    mb: 3
                                }}>
                                {badges.map((badge, index) => (
                                    <Box key={index} sx={{
                                        mb: index === badges.length - 1 ? 0 : 1.5,
                                        pb: index === badges.length - 1 ? 0 : 1.5,
                                        borderBottom: index === badges.length - 1 ? 'none' : '1px solid rgba(209, 208, 198, 0.1)',
                                    }}>
                                        <Typography variant="caption" sx={{ display: 'block', color: 'rgba(209, 208, 198, 0.7)', mb: 0.5, fontSize: '0.75rem', fontWeight: 600 }}>
                                            {badge.label}
                                        </Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1.2, fontSize: '0.95rem' }}>
                                            {badge.value}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>

                            {/* Strategy Sidebar Badge */}
                            <Box sx={{
                                backgroundColor: 'rgba(209, 208, 198, 0.1)',
                                borderRadius: 4,
                                p: 3,
                                borderLeft: '4px solid #d1d0c6',
                                textAlign: 'right',
                                dir: 'rtl'
                            }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: '#d1d0c6' }}>
                                    {strategy.title}
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 2, opacity: 0.9, lineHeight: 1.6, color: '#d1d0c6' }}>
                                    {strategy.description}
                                </Typography>
                                <MuiLink href={strategy.linkUrl} underline="hover" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, color: '#d1d0c6', fontWeight: 'bold' }}>
                                    {strategy.linkText}
                                    <ArrowForwardIcon fontSize="small" sx={{ transform: 'rotate(180deg)' }} />
                                </MuiLink>
                            </Box>
                        </motion.div>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
}
