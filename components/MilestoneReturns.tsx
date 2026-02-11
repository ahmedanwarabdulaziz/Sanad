"use client";

import { Box, Container, Typography, Paper } from "@mui/material";
import { motion } from "framer-motion";
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ShowChartIcon from '@mui/icons-material/ShowChart';

interface MilestoneReturnsProps {
    data: {
        title: string;
        subtitle: string;
        streams: {
            equity: {
                title: string;
                description: string;
            };
            fees: {
                title: string;
                description: string;
            };
            valueUplift: {
                title: string;
                description: string;
                note: string;
            };
        };
        disclaimer: string;
    };
}

export default function MilestoneReturns({ data }: MilestoneReturnsProps) {
    const icons = [
        <TrendingUpIcon sx={{ fontSize: 48, color: "#ffffff" }} key={0} />,
        <AccountBalanceWalletIcon sx={{ fontSize: 48, color: "#ffffff" }} key={1} />,
        <ShowChartIcon sx={{ fontSize: 48, color: "#ffffff" }} key={2} />
    ];

    const streams: Array<{ title: string; description: string; number: string; note?: string }> = [
        { ...data.streams.equity, number: "1" },
        { ...data.streams.fees, number: "2" },
        { ...data.streams.valueUplift, number: "3" }
    ];

    return (
        <Box dir="rtl" sx={{ py: 12, backgroundColor: "#f8f9fa", textAlign: "left" }}>
            <Container maxWidth="lg">
                {/* Title and Subtitle */}
                <Box sx={{ textAlign: "left", mb: 8 }}>
                    <Typography
                        variant="h3"
                        dir="rtl"
                        sx={{
                            fontWeight: "bold",
                            color: "#154278",
                            textAlign: "left",
                            fontSize: { xs: "1.75rem", md: "2.5rem" },
                            mb: 3
                        }}
                    >
                        {data.title}
                    </Typography>
                    <Typography
                        variant="h6"
                        dir="rtl"
                        sx={{
                            color: "#555",
                            textAlign: "left",
                            fontSize: "1.1rem",
                            lineHeight: 1.8
                        }}
                    >
                        {data.subtitle}
                    </Typography>
                </Box>

                {/* Revenue Streams */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, mb: 6 }}>
                    {streams.map((stream, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.15, duration: 0.6 }}
                        >
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 5,
                                    borderRadius: 3,
                                    bgcolor: "#ffffff",
                                    border: "2px solid #e0e0e0",
                                    transition: "all 0.3s ease",
                                    "&:hover": {
                                        boxShadow: "0 8px 30px rgba(21, 66, 120, 0.12)",
                                        borderColor: "#154278"
                                    }
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                                    {/* Icon */}
                                    <Box sx={{
                                        p: 2,
                                        borderRadius: '12px',
                                        bgcolor: '#154278',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        minWidth: 80,
                                        minHeight: 80
                                    }}>
                                        {icons[index]}
                                    </Box>

                                    {/* Content */}
                                    <Box sx={{ flex: 1 }}>
                                        <Typography
                                            variant="h5"
                                            dir="rtl"
                                            sx={{
                                                fontWeight: "bold",
                                                color: "#154278",
                                                textAlign: "left",
                                                fontSize: "1.4rem",
                                                mb: 2
                                            }}
                                        >
                                            {stream.title}
                                        </Typography>
                                        <Typography
                                            variant="body1"
                                            dir="rtl"
                                            sx={{
                                                color: "#444",
                                                textAlign: "left",
                                                fontSize: "1.05rem",
                                                lineHeight: 1.8,
                                                mb: stream.note ? 2 : 0
                                            }}
                                        >
                                            {stream.description}
                                        </Typography>

                                        {/* Note for Value Uplift */}
                                        {stream.note && (
                                            <Box sx={{
                                                mt: 3,
                                                p: 3,
                                                bgcolor: 'rgba(21, 66, 120, 0.05)',
                                                borderRadius: 2,
                                                borderRight: '4px solid #154278'
                                            }}>
                                                <Typography
                                                    variant="body2"
                                                    dir="rtl"
                                                    sx={{
                                                        color: "#154278",
                                                        textAlign: 'left',
                                                        fontWeight: 600,
                                                        fontSize: "0.95rem",
                                                        lineHeight: 1.7
                                                    }}
                                                >
                                                    {stream.note}
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                            </Paper>
                        </motion.div>
                    ))}
                </Box>

                {/* Disclaimer */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <Box sx={{
                        p: 4,
                        bgcolor: 'rgba(194, 155, 64, 0.1)',
                        borderRadius: 3,
                        borderRight: '4px solid #C29B40'
                    }}>
                        <Typography
                            variant="body1"
                            dir="rtl"
                            sx={{
                                color: "#856404",
                                textAlign: 'left',
                                fontWeight: 600,
                                fontSize: "1rem",
                                lineHeight: 1.8
                            }}
                        >
                            {data.disclaimer}
                        </Typography>
                    </Box>
                </motion.div>
            </Container>
        </Box>
    );
}
