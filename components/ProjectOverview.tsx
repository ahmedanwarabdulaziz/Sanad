"use client";

import { Box, Container, Grid, Typography, Paper } from "@mui/material";
import { motion } from "framer-motion";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface ProjectOverviewProps {
    data: {
        title: string;
        description: string;
        highlights: string[];
    };
}

export default function ProjectOverview({ data }: ProjectOverviewProps) {
    return (
        <Box sx={{ py: 10, backgroundColor: "#ffffff" }}>
            <Container maxWidth="lg">
                <Grid container spacing={6} alignItems="center">
                    {/* Text Section - Full Width */}
                    <Grid size={{ xs: 12 }}>
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                        >
                            <Typography variant="h4" sx={{ fontWeight: "bold", mb: 3, color: "#154278" }}>
                                {data.title}
                            </Typography>
                            <Typography variant="body1" sx={{ color: "#555", lineHeight: 1.8, fontSize: "1.1rem", mb: 4, maxWidth: "100%" }}>
                                {data.description}
                            </Typography>

                            <Grid container spacing={2}>
                                {data.highlights.map((highlight, index) => (
                                    <Grid size={{ xs: 12, md: 6 }} key={index}>
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                            <CheckCircleIcon sx={{ color: "#154278", mt: 0.5 }} />
                                            <Typography variant="body1" sx={{ color: "#333", fontWeight: 500 }}>
                                                {highlight}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                ))}
                            </Grid>
                        </motion.div>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
}
