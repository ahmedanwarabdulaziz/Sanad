"use client";

import { Box, Container, Typography, Grid, Card, CardContent, CardMedia, Button, Chip, Stack } from "@mui/material";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Link } from "@/navigation";
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import FactoryIcon from '@mui/icons-material/Factory';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import ApartmentIcon from '@mui/icons-material/Apartment';
import ConstructionIcon from '@mui/icons-material/Construction';

export default function FeaturedProjects() {
    const t = useTranslations("FeaturedProjects");

    const projects = [
        {
            id: "al-nasr-interlock",
            key: "alNasrInterlock",
            image: "/images/interlock-hero.jpg", // Placeholder or existing image
            icon: <ConstructionIcon sx={{ fontSize: 40 }} />,
            color: "#154278"
        },
        {
            id: "al-nasr-factory",
            key: "alNasrFactory",
            image: "/images/marble-hero.jpg",
            icon: <FactoryIcon sx={{ fontSize: 40 }} />,
            color: "#C29B40"
        },
        {
            id: "sanad-farms",
            key: "sanadFarms",
            image: "/images/farms-hero.jpg",
            icon: <AgricultureIcon sx={{ fontSize: 40 }} />,
            color: "#2e7d32"
        },
        {
            id: "sanad-zayed",
            key: "sanadZayed",
            image: "/images/zayed-hero.jpg",
            icon: <ApartmentIcon sx={{ fontSize: 40 }} />,
            color: "#d32f2f"
        }
    ];

    return (
        <Box sx={{ py: { xs: 10, md: 15 }, bgcolor: "#f8f9fa" }}>
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
                    {projects.map((project, index) => (
                        <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={project.id}>
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                            >
                                <Card
                                    sx={{
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        borderRadius: 4,
                                        overflow: 'hidden',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                                        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                        '&:hover': {
                                            transform: 'translateY(-10px)',
                                            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                                            '& .card-media-overlay': {
                                                opacity: 1
                                            }
                                        }
                                    }}
                                >
                                    <Box sx={{ position: 'relative' }}>
                                        <Box
                                            sx={{
                                                height: 240,
                                                bgcolor: project.color,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                opacity: 0.9
                                            }}
                                        >
                                            {project.icon}
                                        </Box>
                                        <Box
                                            className="card-media-overlay"
                                            sx={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                                bgcolor: 'rgba(21, 66, 120, 0.4)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                opacity: 0,
                                                transition: 'opacity 0.3s ease',
                                                zIndex: 1
                                            }}
                                        >
                                            <Button
                                                component={Link}
                                                href={`/projects/${project.id}`}
                                                variant="contained"
                                                sx={{
                                                    bgcolor: 'white',
                                                    color: '#154278',
                                                    '&:hover': { bgcolor: '#f0f0f0' },
                                                    borderRadius: 50,
                                                    px: 3
                                                }}
                                            >
                                                {t("viewProject")}
                                            </Button>
                                        </Box>
                                        <Chip
                                            label={t(`projects.${project.key}.status`)}
                                            sx={{
                                                position: 'absolute',
                                                top: 16,
                                                right: 16,
                                                bgcolor: 'rgba(255,255,255,0.9)',
                                                fontWeight: 'bold',
                                                color: project.color,
                                                backdropFilter: 'blur(4px)',
                                                zIndex: 2
                                            }}
                                        />
                                    </Box>
                                    <CardContent sx={{ flexGrow: 1, p: 3, display: 'flex', flexDirection: 'column' }}>
                                        <Typography
                                            variant="overline"
                                            sx={{
                                                color: project.color,
                                                fontWeight: 700,
                                                letterSpacing: 1,
                                                mb: 1,
                                                display: 'block'
                                            }}
                                        >
                                            {t(`projects.${project.key}.sector`)}
                                        </Typography>
                                        <Typography
                                            variant="h5"
                                            sx={{
                                                fontWeight: 700,
                                                mb: 2,
                                                color: "#154278",
                                                lineHeight: 1.3,
                                                minHeight: '4.5rem', // Ensure 2-3 lines of title don't break alignment
                                                display: '-webkit-box',
                                                WebkitLineClamp: 3,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            {t(`projects.${project.key}.title`)}
                                        </Typography>
                                        <Box sx={{ mt: 'auto' }}>
                                            <Stack direction="row" spacing={1} alignItems="flex-start">
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: "#666",
                                                        lineHeight: 1.6,
                                                        fontSize: '0.9rem',
                                                        minHeight: '3rem' // Ensure metric section has consistent height
                                                    }}
                                                >
                                                    {t(`projects.${project.key}.metric`)}
                                                </Typography>
                                            </Stack>
                                        </Box>
                                    </CardContent>
                                    <Box sx={{ p: 2, pt: 0 }}>
                                        <Button
                                            component={Link}
                                            href={`/projects/${project.id}`}
                                            fullWidth
                                            endIcon={<ArrowForwardIcon />}
                                            sx={{
                                                justifyContent: 'space-between',
                                                color: '#154278',
                                                fontWeight: 600,
                                                '&:hover': { bgcolor: 'rgba(21, 66, 120, 0.05)' }
                                            }}
                                        >
                                            {t("viewProject")}
                                        </Button>
                                    </Box>
                                </Card>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>
            </Container>
        </Box>
    );
}
