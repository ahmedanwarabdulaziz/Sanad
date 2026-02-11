"use client";

import { Box, Container, Typography, Paper } from "@mui/material";
import { motion } from "framer-motion";
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import MapIcon from '@mui/icons-material/Map';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import AssessmentIcon from '@mui/icons-material/Assessment';
import GavelIcon from '@mui/icons-material/Gavel';

interface ProjectPartnerViewProps {
    data: {
        title: string;
        description: string;
        items: string[];
        note?: string;
    };
}

export default function ProjectPartnerView({ data }: ProjectPartnerViewProps) {
    const icons = [
        <AssignmentTurnedInIcon key="0" sx={{ fontSize: 40 }} />,
        <MapIcon key="1" sx={{ fontSize: 40 }} />,
        <HistoryEduIcon key="2" sx={{ fontSize: 40 }} />,
        <FolderSpecialIcon key="3" sx={{ fontSize: 40 }} />,
        <AssessmentIcon key="4" sx={{ fontSize: 40 }} />,
        <GavelIcon key="5" sx={{ fontSize: 40 }} />,
    ];

    return (
        <Box sx={{ py: 12, backgroundColor: "#ffffff" }}>
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

                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
                        gap: 4,
                        mb: 8
                    }}>
                        {data.items.map((item, index) => (
                            <Box key={index} sx={{ height: '100%' }}>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1, duration: 0.5 }}
                                    style={{ height: '100%' }}
                                >
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 4,
                                            height: '100%',
                                            borderRadius: 4,
                                            border: '1px solid #e0e0e0',
                                            textAlign: 'center',
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                transform: 'translateY(-5px)',
                                                boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
                                                borderColor: '#154278'
                                            },
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 2
                                        }}
                                    >
                                        <Box sx={{ color: '#154278', p: 2, borderRadius: '50%', bgcolor: 'rgba(21, 66, 120, 0.05)' }}>
                                            {icons[index % icons.length]}
                                        </Box>
                                        <Typography variant="h6" sx={{ color: "#333", fontWeight: "600", fontSize: '1.1rem', lineHeight: 1.5 }}>
                                            {item}
                                        </Typography>
                                    </Paper>
                                </motion.div>
                            </Box>
                        ))}
                    </Box>

                    {data.note && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.5, duration: 1 }}
                        >
                            <Box sx={{
                                p: 3,
                                textAlign: 'center',
                                bgcolor: 'rgba(21, 66, 120, 0.03)',
                                borderRadius: 4,
                                border: '1px dashed #154278',
                                maxWidth: '800px',
                                mx: 'auto'
                            }}>
                                <Typography variant="body2" sx={{ color: '#666', fontStyle: 'italic' }}>
                                    {data.note}
                                </Typography>
                            </Box>
                        </motion.div>
                    )}
                </motion.div>
            </Container>
        </Box>
    );
}
