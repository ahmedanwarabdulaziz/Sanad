"use client";

import { Box, Button, Container, Typography, Grid } from "@mui/material";
import { motion } from "framer-motion";
import ExploreIcon from '@mui/icons-material/Explore';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import { useState } from "react";
import ContactModal from "./ContactModal";

interface AboutHeroProps {
    data: {
        title: string;
        description: string;
        trustLine: string;
        buttons: {
            explore: string;
            contact: string;
        };
    };
}

export default function AboutHero({ data }: AboutHeroProps) {
    const isRtl = true;
    const [contactOpen, setContactOpen] = useState(false);

    return (
        <Box
            dir="rtl"
            sx={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                backgroundColor: "#154278",
                color: "#d1d0c6",
                overflow: "hidden",
                minHeight: "100vh",
                textAlign: "right",
            }}
        >
            {/* Top Image Section */}
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
                            style={{ textAlign: "right" }}
                        >
                            <Typography
                                component="h1"
                                dir="rtl"
                                sx={{
                                    fontWeight: "bold",
                                    mb: 3,
                                    color: "#d1d0c6 !important",
                                    textAlign: "left",
                                    fontSize: { xs: "2rem", md: "3.5rem" },
                                    lineHeight: 1.2
                                }}
                            >
                                {data.title}
                            </Typography>

                            <Typography
                                variant="h6"
                                dir="rtl"
                                sx={{
                                    mb: 2,
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

                            <Typography
                                variant="h6"
                                dir="rtl"
                                sx={{
                                    mb: 4,
                                    color: "#C29B40 !important",
                                    lineHeight: 1.8,
                                    fontWeight: 500,
                                    fontSize: "1.1rem",
                                    maxWidth: "90%",
                                    textAlign: "left",
                                }}
                            >
                                {data.trustLine}
                            </Typography>

                            <Box sx={{ display: 'flex', gap: 2, justifyContent: "flex-start", flexWrap: "wrap" }}>
                                <Button
                                    variant="contained"
                                    size="large"
                                    startIcon={<ExploreIcon />}
                                    sx={{
                                        backgroundColor: "#d1d0c6",
                                        color: "#154278",
                                        fontWeight: "bold",
                                        "&:hover": {
                                            backgroundColor: "#ffffff",
                                        },
                                    }}
                                >
                                    {data.buttons.explore}
                                </Button>

                                <Button
                                    onClick={() => setContactOpen(true)}
                                    variant="outlined"
                                    size="large"
                                    startIcon={<ContactMailIcon />}
                                    sx={{
                                        color: "#d1d0c6 !important",
                                        borderColor: "#d1d0c6 !important",
                                        "&:hover": {
                                            borderColor: "#ffffff !important",
                                            backgroundColor: "rgba(209, 208, 198, 0.1)"
                                        }
                                    }}
                                >
                                    {data.buttons.contact}
                                </Button>
                            </Box>
                        </motion.div>
                        <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
                    </Grid>

                    {/* Empty Grid item to balance layout */}
                    <Grid size={{ xs: 12, md: 4 }} />
                </Grid>
            </Container>

            {/* Decorative Circle */}
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
