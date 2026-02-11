"use client";

import { Box, Container, Typography, Paper, Grid } from "@mui/material";
import { motion } from "framer-motion";
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

interface CompetitiveAdvantage {
    title: string;
    description: string;
}

interface ProjectCompetitiveAdvantagesProps {
    data: {
        title: string;
        description: string;
        items: CompetitiveAdvantage[];
    };
}

export default function ProjectCompetitiveAdvantages({ data }: ProjectCompetitiveAdvantagesProps) {
    const icons = [
        <SettingsSuggestIcon key="0" sx={{ fontSize: 40 }} />,
        <DashboardCustomizeIcon key="1" sx={{ fontSize: 40 }} />,
        <LocalShippingIcon key="2" sx={{ fontSize: 40 }} />,
        <TrendingUpIcon key="3" sx={{ fontSize: 40 }} />,
        <AdminPanelSettingsIcon key="4" sx={{ fontSize: 40 }} />,
    ];

    return (
        <Box sx={{ py: 12, backgroundColor: "#f8f9fa" }}>
            <Container maxWidth="lg">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <Box sx={{ textAlign: 'center', mb: 8, maxWidth: '800px', mx: 'auto' }}>
                        <Typography variant="h3" sx={{ fontWeight: "bold", mb: 3, color: "#154278", fontSize: { xs: "2rem", md: "2.5rem" } }}>
                            {data.title}
                        </Typography>
                        <Typography variant="body1" sx={{ color: "#555", fontSize: '1.2rem', lineHeight: 1.8 }}>
                            {data.description}
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 4,
                            justifyContent: 'center'
                        }}
                    >
                        {data.items.map((item, index) => (
                            <Box
                                key={index}
                                sx={{
                                    width: {
                                        xs: '100%',
                                        sm: 'calc(50% - 16px)',
                                        md: index < 3 ? 'calc(33.333% - 27px)' : 'calc(50% - 16px)'
                                    },
                                    display: 'flex'
                                }}
                            >
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1, duration: 0.5 }}
                                    style={{ width: '100%', display: 'flex' }}
                                >
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 4,
                                            width: '100%',
                                            borderRadius: 4,
                                            border: '1px solid #e0e0e0',
                                            backgroundColor: '#ffffff',
                                            transition: 'all 0.3s ease',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 2,
                                            '&:hover': {
                                                borderColor: '#154278',
                                                boxShadow: '0 10px 30px rgba(21, 66, 120, 0.08)',
                                                transform: 'translateY(-5px)'
                                            }
                                        }}
                                    >
                                        <Box sx={{ color: '#154278', display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(21, 66, 120, 0.05)', display: 'flex' }}>
                                                {icons[index % icons.length]}
                                            </Box>
                                            <Typography variant="h6" sx={{ color: "#154278", fontWeight: "bold" }}>
                                                {item.title}
                                            </Typography>
                                        </Box>
                                        <Typography variant="body2" sx={{ color: "#666", lineHeight: 1.7, fontSize: '1rem' }}>
                                            {item.description}
                                        </Typography>
                                    </Paper>
                                </motion.div>
                            </Box>
                        ))}
                    </Box>
                </motion.div>
            </Container>
        </Box>
    );
}
