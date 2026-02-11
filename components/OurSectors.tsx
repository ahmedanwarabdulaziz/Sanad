"use client";

import { Box, Container, Typography, Grid, Button, Stack, Paper } from "@mui/material";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Link } from "@/navigation";
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BusinessIcon from '@mui/icons-material/Business';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import FactoryIcon from '@mui/icons-material/Factory';
import ConstructionIcon from '@mui/icons-material/Construction';

export default function OurSectors() {
    const t = useTranslations("OurSectors");

    const sectors = [
        {
            key: "realEstate",
            path: "/projects",
            icon: <BusinessIcon sx={{ fontSize: 50 }} />,
            color: "#154278",
            image: "/images/sectors/real-estate.jpg" // We might need to generate or use placeholder
        },
        {
            key: "agricultural",
            path: "/projects/sanad-farms",
            icon: <AgricultureIcon sx={{ fontSize: 50 }} />,
            color: "#2e7d32",
            image: "/images/sectors/agriculture.jpg"
        },
        {
            key: "industrial",
            path: "/projects/al-nasr-interlock",
            icon: <ConstructionIcon sx={{ fontSize: 50 }} />,
            color: "#C29B40",
            image: "/images/sectors/industrial.jpg"
        },
        {
            key: "marble",
            path: "/projects/al-nasr-factory",
            icon: <FactoryIcon sx={{ fontSize: 50 }} />,
            color: "#5d4037",
            image: "/images/sectors/marble.jpg"
        }
    ];

    return (
        <Box sx={{ py: { xs: 10, md: 15 }, bgcolor: "#f0f2f5" }}>
            <Container maxWidth="xl">
                <Typography
                    variant="h3"
                    sx={{
                        fontWeight: 800,
                        color: "#154278",
                        mb: 8,
                        textAlign: "center",
                        fontSize: { xs: "2rem", md: "3rem" }
                    }}
                >
                    {t("title")}
                </Typography>

                <Grid container spacing={4}>
                    {sectors.map((sector, index) => (
                        <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={index}>
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                            >
                                <Paper
                                    sx={{
                                        position: 'relative',
                                        height: 380,
                                        borderRadius: 6,
                                        overflow: 'hidden',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                        border: '1px solid rgba(0,0,0,0.05)',
                                        '&:hover': {
                                            transform: 'translateY(-12px)',
                                            boxShadow: '0 25px 50px rgba(21, 66, 120, 0.15)',
                                            '& .sector-overlay': {
                                                background: 'linear-gradient(to top, rgba(21, 66, 120, 0.95), rgba(21, 66, 120, 0.7))',
                                            }
                                        }
                                    }}
                                >
                                    {/* Background Accent (Colored) */}
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            bgcolor: sector.color,
                                            opacity: 0.03
                                        }}
                                    />

                                    <Box
                                        className="sector-overlay"
                                        sx={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            background: 'linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.2))',
                                            transition: 'all 0.4s ease',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'flex-end',
                                            p: 4,
                                            color: 'white',
                                            zIndex: 1
                                        }}
                                    >
                                        <Box sx={{ mb: 'auto' }}>
                                            <Box
                                                sx={{
                                                    width: 80,
                                                    height: 80,
                                                    borderRadius: 3,
                                                    bgcolor: 'rgba(255,255,255,0.15)',
                                                    backdropFilter: 'blur(10px)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    mb: 2,
                                                    border: '1px solid rgba(255,255,255,0.2)'
                                                }}
                                            >
                                                {sector.icon}
                                            </Box>
                                        </Box>

                                        <Typography
                                            variant="h4"
                                            sx={{
                                                fontWeight: 800,
                                                mb: 3,
                                                fontSize: { xs: '1.6rem', md: '1.8rem' },
                                                lineHeight: 1.2
                                            }}
                                        >
                                            {t(`${sector.key}.title`)}
                                        </Typography>

                                        <Button
                                            component={Link}
                                            href={sector.path}
                                            variant="contained"
                                            fullWidth
                                            endIcon={<ArrowForwardIcon sx={{ transform: t('title') === 'Our Sectors' ? 'none' : 'rotate(180deg)' }} />}
                                            sx={{
                                                bgcolor: 'white',
                                                color: '#154278',
                                                fontWeight: 700,
                                                py: 1.5,
                                                borderRadius: 3,
                                                fontSize: '1rem',
                                                transition: 'all 0.3s ease',
                                                '&:hover': {
                                                    bgcolor: '#f0f0f0',
                                                    transform: 'scale(1.02)'
                                                }
                                            }}
                                        >
                                            {t(`${sector.key}.cta`)}
                                        </Button>
                                    </Box>
                                </Paper>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>
            </Container>
        </Box>
    );
}
