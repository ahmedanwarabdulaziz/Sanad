"use client";

import { Box, Container, Typography, Grid, Paper } from "@mui/material";
import { motion } from "framer-motion";
import AnalyticsIcon from '@mui/icons-material/Analytics';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import GavelIcon from '@mui/icons-material/Gavel';
import HandshakeIcon from '@mui/icons-material/Handshake';

interface FeatureCard {
    title: string;
    description: string;
    icon: React.ReactNode;
}

interface AboutWhySanadProps {
    data: {
        title: string;
        features: {
            title: string;
            description: string;
        }[];
    };
}

export default function AboutWhySanad({ data }: AboutWhySanadProps) {
    const icons = [
        <AnalyticsIcon key={0} sx={{ fontSize: 40, color: "#C29B40" }} />,
        <AssignmentIcon key={1} sx={{ fontSize: 40, color: "#C29B40" }} />,
        <HandshakeIcon key={2} sx={{ fontSize: 40, color: "#C29B40" }} />,
        <ManageAccountsIcon key={3} sx={{ fontSize: 40, color: "#C29B40" }} />,
        <GavelIcon key={4} sx={{ fontSize: 40, color: "#C29B40" }} />,
        <PeopleIcon key={5} sx={{ fontSize: 40, color: "#C29B40" }} />
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
                    <Typography
                        variant="h3"
                        sx={{
                            fontWeight: "bold",
                            mb: 8,
                            color: "#154278",
                            textAlign: "center",
                            fontSize: { xs: "2rem", md: "2.5rem" }
                        }}
                    >
                        {data.title}
                    </Typography>

                    <Box
                        sx={{
                            display: 'flex',
                            gap: 4,
                            justifyContent: 'center',
                            alignItems: 'stretch'
                        }}
                    >
                        {data.features.map((feature, index) => (
                            <Box
                                key={index}
                                sx={{
                                    flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 30%' },
                                    display: 'flex'
                                }}
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1, duration: 0.5 }}
                                    style={{ height: '100%', width: '100%', display: 'flex' }}
                                >
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 4,
                                            height: "100%",
                                            width: "100%",
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: { xs: "center", md: "flex-start" },
                                            textAlign: { xs: "center", md: "right" },
                                            borderRadius: 4,
                                            backgroundColor: "#f8f9fa",
                                            border: "1px solid #e0e0e0",
                                            transition: "all 0.3s ease",
                                            "&:hover": {
                                                boxShadow: "0 12px 40px rgba(0,0,0,0.08)",
                                                transform: "translateY(-8px)",
                                                borderColor: "#C29B40"
                                            }
                                        }}
                                    >
                                        <Box sx={{ mb: 3 }}>
                                            {icons[index]}
                                        </Box>
                                        <Typography
                                            variant="h6"
                                            sx={{
                                                fontWeight: "bold",
                                                mb: 2,
                                                color: "#154278",
                                                fontSize: "1.2rem",
                                                fontFamily: "var(--font-cairo)"
                                            }}
                                        >
                                            {feature.title}
                                        </Typography>
                                        <Typography
                                            variant="body1"
                                            sx={{
                                                color: "#555",
                                                lineHeight: 1.7,
                                                fontSize: "0.95rem"
                                            }}
                                        >
                                            {feature.description}
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
