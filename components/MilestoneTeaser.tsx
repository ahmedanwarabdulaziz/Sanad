"use client";

import { Box, Container, Typography, Button, Stack } from "@mui/material";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Link } from "@/navigation";
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ShieldIcon from '@mui/icons-material/Shield';

export default function MilestoneTeaser() {
    const t = useTranslations("MilestoneTeaser");

    return (
        <Box
            sx={{
                py: { xs: 12, md: 20 },
                background: "linear-gradient(135deg, #154278 0%, #0a213c 100%)",
                position: 'relative',
                overflow: 'hidden',
                color: 'white'
            }}
        >
            {/* Background Decorative Elements */}
            <Box
                sx={{
                    position: 'absolute',
                    top: -100,
                    right: -100,
                    width: 400,
                    height: 400,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(194, 155, 64, 0.15) 0%, rgba(194, 155, 64, 0) 70%)',
                    zIndex: 0
                }}
            />
            <Box
                sx={{
                    position: 'absolute',
                    bottom: -150,
                    left: -150,
                    width: 500,
                    height: 500,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(194, 155, 64, 0.1) 0%, rgba(194, 155, 64, 0) 70%)',
                    zIndex: 0
                }}
            />

            <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
                <Stack spacing={4} alignItems="center" textAlign="center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        <Box
                            sx={{
                                display: 'inline-flex',
                                p: 2,
                                borderRadius: '50%',
                                bgcolor: 'rgba(194, 155, 64, 0.2)',
                                color: '#C29B40',
                                mb: 2,
                                border: '1px solid rgba(194, 155, 64, 0.3)'
                            }}
                        >
                            <ShieldIcon sx={{ fontSize: 50 }} />
                        </Box>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <Typography
                            variant="h2"
                            sx={{
                                fontWeight: 900,
                                fontSize: { xs: "2.5rem", md: "4rem" },
                                mb: 3,
                                letterSpacing: '-0.02em',
                                lineHeight: 1.1
                            }}
                        >
                            {t("title")}
                        </Typography>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                    >
                        <Typography
                            variant="h5"
                            sx={{
                                opacity: 0.9,
                                maxWidth: "800px",
                                mx: "auto",
                                lineHeight: 1.8,
                                fontWeight: 400,
                                fontSize: { xs: "1.1rem", md: "1.35rem" }
                            }}
                        >
                            {t("description")}
                        </Typography>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                    >
                        <Button
                            component={Link}
                            href="/milestone-right"
                            variant="contained"
                            size="large"
                            endIcon={<ArrowForwardIcon sx={{ transform: t('title').includes('|') ? 'none' : 'rotate(180deg)' }} />}
                            sx={{
                                bgcolor: "#C29B40",
                                color: "white",
                                px: 6,
                                py: 2,
                                fontSize: "1.1rem",
                                fontWeight: 700,
                                borderRadius: 50,
                                boxShadow: '0 10px 30px rgba(194, 155, 64, 0.3)',
                                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                "&:hover": {
                                    bgcolor: "#ae8a36",
                                    transform: "scale(1.05)",
                                    boxShadow: '0 15px 40px rgba(194, 155, 64, 0.4)',
                                }
                            }}
                        >
                            {t("cta")}
                        </Button>
                    </motion.div>
                </Stack>
            </Container>
        </Box>
    );
}
