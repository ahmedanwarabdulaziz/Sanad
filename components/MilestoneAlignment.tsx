"use client";

import { Box, Container, Typography, Paper } from "@mui/material";
import { motion } from "framer-motion";
import HandshakeIcon from '@mui/icons-material/Handshake';

interface MilestoneAlignmentProps {
    data: {
        title: string;
        contribution: string;
        importance: string;
        explanation: string;
    };
}

export default function MilestoneAlignment({ data }: MilestoneAlignmentProps) {
    return (
        <Box dir="rtl" sx={{ py: 12, backgroundColor: "#ffffff", textAlign: "left" }}>
            <Container maxWidth="lg">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <Paper
                        elevation={0}
                        sx={{
                            p: 8,
                            borderRadius: 4,
                            bgcolor: "rgba(21, 66, 120, 0.03)",
                            border: "3px solid #154278",
                            textAlign: "center"
                        }}
                    >
                        {/* Icon and Title */}
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
                            <Box sx={{
                                p: 3,
                                borderRadius: '50%',
                                bgcolor: '#154278',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <HandshakeIcon sx={{ fontSize: 60, color: "#ffffff" }} />
                            </Box>
                        </Box>

                        <Typography
                            variant="h3"
                            dir="rtl"
                            sx={{
                                fontWeight: "bold",
                                color: "#154278",
                                textAlign: "center",
                                fontSize: { xs: "1.75rem", md: "2.5rem" },
                                mb: 5
                            }}
                        >
                            {data.title}
                        </Typography>

                        <Typography
                            variant="h5"
                            dir="rtl"
                            sx={{
                                fontWeight: "600",
                                color: "#333",
                                textAlign: "center",
                                fontSize: { xs: "1.2rem", md: "1.5rem" },
                                mb: 4,
                                lineHeight: 1.8
                            }}
                        >
                            {data.contribution}
                        </Typography>

                        <Typography
                            variant="body1"
                            dir="rtl"
                            sx={{
                                color: "#555",
                                textAlign: "center",
                                fontSize: "1.1rem",
                                mb: 3,
                                lineHeight: 1.8,
                                fontWeight: 600
                            }}
                        >
                            {data.importance}
                        </Typography>

                        <Typography
                            variant="body1"
                            dir="rtl"
                            sx={{
                                color: "#444",
                                textAlign: "center",
                                fontSize: "1.05rem",
                                lineHeight: 1.9,
                                maxWidth: "900px",
                                mx: "auto"
                            }}
                        >
                            {data.explanation}
                        </Typography>
                    </Paper>
                </motion.div>
            </Container>
        </Box>
    );
}
