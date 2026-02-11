"use client";

import { Box, Container, Grid, Typography, Paper } from "@mui/material";
import { motion } from "framer-motion";
import AgricultureIcon from "@mui/icons-material/Agriculture";
import EngineeringIcon from "@mui/icons-material/Engineering";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import LockIcon from "@mui/icons-material/Lock";

interface ProjectQuickSummaryProps {
    data: {
        title: string;
        description: string;
        highlights: { title: string; value: string }[];
    };
}

export default function ProjectQuickSummary({ data }: ProjectQuickSummaryProps) {
    const icons = [
        <AgricultureIcon key={0} sx={{ fontSize: 40, color: "#154278" }} />,
        <EngineeringIcon key={1} sx={{ fontSize: 40, color: "#154278" }} />,
        <PrecisionManufacturingIcon key={2} sx={{ fontSize: 40, color: "#154278" }} />,
        <LocalShippingIcon key={3} sx={{ fontSize: 40, color: "#154278" }} />,
        <TrendingUpIcon key={4} sx={{ fontSize: 40, color: "#154278" }} />,
        <LockIcon key={5} sx={{ fontSize: 40, color: "#154278" }} />,
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
                            mb: 2,
                            color: "#154278",
                            textAlign: "center",
                            fontSize: { xs: "2rem", md: "2.5rem" }
                        }}
                    >
                        {data.title}
                    </Typography>
                    <Typography
                        variant="body1"
                        sx={{
                            color: "#666",
                            textAlign: "center",
                            mb: 8,
                            maxWidth: "700px",
                            mx: "auto",
                            lineHeight: 1.8
                        }}
                    >
                        {data.description}
                    </Typography>

                    <Box
                        sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 4,
                            justifyContent: 'center'
                        }}
                    >
                        {data.highlights.map((item, index) => (
                            <Box
                                key={index}
                                sx={{
                                    width: { xs: '100%', sm: 'calc(50% - 16px)', md: 'calc(33.333% - 22px)' },
                                    display: 'flex'
                                }}
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1, duration: 0.5 }}
                                    style={{ width: '100%', display: 'flex' }}
                                >
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 4,
                                            width: "100%",
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            textAlign: "center",
                                            borderRadius: 4,
                                            backgroundColor: "#ffffff",
                                            border: "1px solid #e0e0e0",
                                            transition: "all 0.3s ease",
                                            "&:hover": {
                                                boxShadow: "0 10px 30px rgba(21, 66, 120, 0.08)",
                                                transform: "translateY(-5px)",
                                                borderColor: "#154278"
                                            }
                                        }}
                                    >
                                        <Box sx={{ mb: 3, opacity: 0.8 }}>
                                            {icons[index]}
                                        </Box>
                                        <Typography
                                            variant="h6"
                                            sx={{
                                                fontWeight: "bold",
                                                mb: 1.5,
                                                color: "#154278",
                                                fontSize: "1.1rem"
                                            }}
                                        >
                                            {item.title}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: "#555",
                                                lineHeight: 1.7,
                                                fontSize: "0.95rem"
                                            }}
                                        >
                                            {item.value}
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
