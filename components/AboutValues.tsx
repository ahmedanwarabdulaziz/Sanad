"use client";

import { Box, Container, Typography, Grid, Paper } from "@mui/material";
import { motion } from "framer-motion";
import VisibilityIcon from '@mui/icons-material/Visibility';
import BoltIcon from '@mui/icons-material/Bolt';
import BalanceIcon from '@mui/icons-material/Balance';
import EnergySavingsLeafIcon from '@mui/icons-material/EnergySavingsLeaf';

interface AboutValuesProps {
    data: {
        title: string;
        values: {
            title: string;
            description: string;
        }[];
    };
}

export default function AboutValues({ data }: AboutValuesProps) {
    const icons = [
        <VisibilityIcon key={0} sx={{ fontSize: 40, color: "#C29B40" }} />,
        <BoltIcon key={1} sx={{ fontSize: 40, color: "#C29B40" }} />,
        <BalanceIcon key={2} sx={{ fontSize: 40, color: "#C29B40" }} />,
        <EnergySavingsLeafIcon key={3} sx={{ fontSize: 40, color: "#C29B40" }} />
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
                            flexWrap: 'wrap',
                            gap: 4,
                            justifyContent: 'center',
                            alignItems: 'stretch'
                        }}
                    >
                        {data.values.map((value, index) => (
                            <Box
                                key={index}
                                sx={{
                                    flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' },
                                    maxWidth: { md: '280px' },
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
                                            alignItems: "center",
                                            textAlign: "center",
                                            borderRadius: 3,
                                            backgroundColor: "#ffffff",
                                            border: "1px solid #e0e0e0",
                                            transition: "all 0.3s ease",
                                            "&:hover": {
                                                boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
                                                transform: "translateY(-5px)",
                                                borderColor: "#154278"
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
                                                fontSize: "1.2rem"
                                            }}
                                        >
                                            {value.title}
                                        </Typography>
                                        <Typography
                                            variant="body1"
                                            sx={{
                                                color: "#555",
                                                lineHeight: 1.6,
                                                fontSize: "0.95rem"
                                            }}
                                        >
                                            {value.description}
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
