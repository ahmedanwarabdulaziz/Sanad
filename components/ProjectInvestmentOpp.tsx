"use client";

import { Box, Container, Typography, Button, Stack } from "@mui/material";
import { motion } from "framer-motion";
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ArticleIcon from '@mui/icons-material/Article';
import { useState } from "react";
import TeaserModal from "./TeaserModal";
import ContactModal from "./ContactModal";

interface ProjectInvestmentOppProps {
    data: {
        title: string;
        text: string;
        cta: {
            session?: string;
            teaser?: string;
            expert?: string;
        };
    };
}

export default function ProjectInvestmentOpp({ data }: ProjectInvestmentOppProps) {
    const [teaserOpen, setTeaserOpen] = useState(false);
    const [contactOpen, setContactOpen] = useState(false);

    return (
        <Box sx={{ py: 12, backgroundColor: "#154278", color: "white" }}>
            <Container maxWidth="md">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <Box sx={{ textAlign: 'center', mb: 8 }}>
                        <Typography variant="h4" sx={{ fontWeight: "bold", mb: 4 }}>
                            {data.title}
                        </Typography>
                        <Typography variant="body1" sx={{ fontSize: '1.25rem', lineHeight: 2, fontWeight: 300, opacity: 0.9, mb: 6 }}>
                            {data.text}
                        </Typography>

                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={3}
                            justifyContent="center"
                            alignItems="center"
                        >
                            {data.cta.session && (
                                <Button
                                    onClick={() => setContactOpen(true)}
                                    variant="contained"
                                    size="large"
                                    startIcon={<CalendarMonthIcon />}
                                    sx={{
                                        bgcolor: 'white',
                                        color: '#154278',
                                        px: 5,
                                        py: 1.8,
                                        borderRadius: 50,
                                        fontSize: '1.1rem',
                                        fontWeight: 'bold',
                                        '&:hover': { bgcolor: '#f0f0f0' }
                                    }}
                                >
                                    {data.cta.session}
                                </Button>
                            )}

                            {data.cta.teaser && (
                                <Button
                                    onClick={() => setTeaserOpen(true)}
                                    variant="outlined"
                                    size="large"
                                    startIcon={<ArticleIcon />}
                                    sx={{
                                        borderColor: 'rgba(255,255,255,0.5)',
                                        color: 'white',
                                        px: 5,
                                        py: 1.8,
                                        borderRadius: 50,
                                        fontSize: '1.1rem',
                                        '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
                                    }}
                                >
                                    {data.cta.teaser}
                                </Button>
                            )}

                            {data.cta.expert && (
                                <Button
                                    onClick={() => setContactOpen(true)}
                                    variant="contained"
                                    size="large"
                                    sx={{
                                        bgcolor: 'white',
                                        color: '#154278',
                                        px: 5,
                                        py: 1.8,
                                        borderRadius: 50,
                                        fontSize: '1.1rem',
                                        fontWeight: 'bold',
                                        '&:hover': { bgcolor: '#f0f0f0' }
                                    }}
                                >
                                    {data.cta.expert}
                                </Button>
                            )}
                        </Stack>

                    </Box>
                </motion.div>
                <TeaserModal open={teaserOpen} onClose={() => setTeaserOpen(false)} projectName={data.title} />
                <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
            </Container>
        </Box>
    );
}
