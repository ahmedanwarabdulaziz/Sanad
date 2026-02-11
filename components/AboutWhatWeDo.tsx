"use client";

import { Box, Container, Typography, Grid, Paper } from "@mui/material";
import { motion } from "framer-motion";
import AssessmentIcon from '@mui/icons-material/Assessment';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import BuildIcon from '@mui/icons-material/Build';
import SettingsIcon from '@mui/icons-material/Settings';
import VisibilityIcon from '@mui/icons-material/Visibility';

interface ServiceCard {
    title: string;
    description: string;
    icon: React.ReactNode;
}

interface AboutWhatWeDoProps {
    data: {
        title: string;
        services: {
            title: string;
            description: string;
        }[];
    };
}

export default function AboutWhatWeDo({ data }: AboutWhatWeDoProps) {
    const icons = [
        <AssessmentIcon key={0} sx={{ fontSize: 50, color: "#154278" }} />,
        <AccountBalanceIcon key={1} sx={{ fontSize: 50, color: "#154278" }} />,
        <BuildIcon key={2} sx={{ fontSize: 50, color: "#154278" }} />,
        <SettingsIcon key={3} sx={{ fontSize: 50, color: "#154278" }} />,
        <VisibilityIcon key={4} sx={{ fontSize: 50, color: "#154278" }} />
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
                            gap: 3,
                            flexWrap: { xs: 'wrap', md: 'nowrap' },
                            justifyContent: 'center',
                            alignItems: 'stretch'
                        }}
                    >
                        {data.services.map((service, index) => (
                            <Box
                                key={index}
                                sx={{
                                    flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 0' },
                                    minWidth: { md: '180px' },
                                    display: 'flex'
                                }}
                            >
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1, duration: 0.5 }}
                                    style={{ flex: 1, display: 'flex' }}
                                >
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 4,
                                            height: "100%",
                                            width: "100%",
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            textAlign: "center",
                                            borderRadius: 3,
                                            border: "2px solid #e0e0e0",
                                            transition: "all 0.3s ease",
                                            "&:hover": {
                                                boxShadow: "0 8px 30px rgba(21, 66, 120, 0.12)",
                                                borderColor: "#154278",
                                                transform: "translateY(-5px)"
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
                                                fontSize: "1.1rem"
                                            }}
                                        >
                                            {service.title}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: "#555",
                                                lineHeight: 1.8,
                                                fontSize: "0.95rem"
                                            }}
                                        >
                                            {service.description}
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
