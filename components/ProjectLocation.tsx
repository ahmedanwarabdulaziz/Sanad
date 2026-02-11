"use client";

import { Box, Container, Grid, Typography, Paper } from "@mui/material";
import { motion } from "framer-motion";
import LocationOnIcon from '@mui/icons-material/LocationOn';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ParkIcon from '@mui/icons-material/Park';
import CommuteIcon from '@mui/icons-material/Commute';
import HomeWorkIcon from '@mui/icons-material/HomeWork';

interface ProjectLocationProps {
    data: {
        title: string;
        description: string;
        points: string[];
        badge?: string;
    };
    images?: string[]; // Optional for now
}

export default function ProjectLocation({ data, images = [] }: ProjectLocationProps) {

    const icons = [
        <TrendingUpIcon key={0} />,
        <AccountBalanceIcon key={1} />,
        <ParkIcon key={2} />,
        <CommuteIcon key={3} />,
        <HomeWorkIcon key={4} />
    ];

    return (
        <Box sx={{ py: 10, backgroundColor: "#f0f2f5" }}>
            <Container maxWidth="xl">
                <Grid container spacing={8} alignItems="center">
                    {/* Content Section */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                        >
                            <Typography variant="h4" sx={{ fontWeight: "bold", mb: 3, color: "#154278" }}>
                                {data.title}
                            </Typography>
                            <Typography variant="body1" sx={{ color: "#555", lineHeight: 1.8, fontSize: "1.1rem", mb: 4 }}>
                                {data.description}
                            </Typography>

                            <Box component="ul" sx={{ p: 0, listStyle: 'none' }}>
                                {data.points.map((point, index) => (
                                    <Box component="li" key={index} sx={{ display: 'flex', alignItems: 'flex-start', mb: 3, gap: 3 }}>
                                        <Box sx={{
                                            color: "#154278",
                                            p: 1.5,
                                            borderRadius: '50%',
                                            bgcolor: 'rgba(21, 66, 120, 0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            {icons[index]}
                                        </Box>
                                        <Typography variant="body1" sx={{ color: "#333", fontWeight: 500, pt: 1 }}>
                                            {point}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        </motion.div>
                    </Grid>

                    {/* Visual Section - Static Image */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                        >
                            <Paper
                                elevation={2}
                                sx={{
                                    height: '400px',
                                    width: '100%',
                                    borderRadius: 4,
                                    overflow: 'hidden',
                                    position: 'relative',
                                    backgroundColor: '#e6e6e6',
                                    backgroundImage: "url('/hero.png')",
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center'
                                }}
                            >
                                {data.badge && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: 20,
                                            right: 20,
                                            bgcolor: '#154278',
                                            color: '#ffffff',
                                            px: 3,
                                            py: 1,
                                            borderRadius: 2,
                                            fontWeight: 'bold',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                            zIndex: 2
                                        }}
                                    >
                                        {data.badge}
                                    </Box>
                                )}
                            </Paper>
                        </motion.div>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
}
