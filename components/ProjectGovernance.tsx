"use client";

import { Box, Container, Typography, Paper, Stack } from "@mui/material";
import { motion } from "framer-motion";
import ShieldIcon from '@mui/icons-material/Shield';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

interface ProjectGovernanceProps {
    data: {
        title: string;
        description: string;
        points: {
            "1": string;
            "2": string;
            "3": string;
            "4": string;
            "5": string;
            "6": string;
            "7": string;
        };
    };
}

export default function ProjectGovernance({ data }: ProjectGovernanceProps) {

    // Convert points object to array
    const pointsList = Object.values(data.points);

    return (
        <Box sx={{ py: 12, backgroundColor: "#f8f9fa" }}>
            <Container maxWidth="md">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <Box sx={{ textAlign: 'center', mb: 8, maxWidth: '800px', mx: 'auto' }}>
                        <ShieldIcon sx={{ fontSize: 60, color: '#154278', mb: 2 }} />
                        <Typography variant="h4" sx={{ fontWeight: "bold", mb: 3, color: "#154278" }}>
                            {data.title}
                        </Typography>
                        <Typography variant="body1" sx={{ color: "#555", fontSize: '1.1rem', lineHeight: 1.8 }}>
                            {data.description}
                        </Typography>
                    </Box>

                    <Stack spacing={2}>
                        {pointsList.map((point, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1, duration: 0.5 }}
                            >
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 3,
                                        borderRadius: 3,
                                        bgcolor: 'white',
                                        border: '1px solid #eee',
                                        display: 'flex',
                                        alignItems: 'center',
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            borderColor: '#154278',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                        }
                                    }}
                                >
                                    <CheckCircleOutlineIcon sx={{ color: '#2e7d32', mr: 2, ml: 2, fontSize: 28 }} />
                                    <Typography variant="body1" sx={{ color: "#333", fontWeight: 500, fontSize: '1.1rem' }}>
                                        {point}
                                    </Typography>
                                </Paper>
                            </motion.div>
                        ))}
                    </Stack>
                </motion.div>
            </Container>
        </Box>
    );
}
