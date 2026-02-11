"use client";

import { Box, Container, Typography, Stack, Paper } from "@mui/material";
import { motion } from "framer-motion";

interface ProcessStep {
    title: string;
    description: string;
}

interface AboutProcessProps {
    data: {
        title: string;
        steps: ProcessStep[];
    };
}

export default function AboutProcess({ data }: AboutProcessProps) {
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
                            mb: 10,
                            color: "#154278",
                            textAlign: "center",
                            fontSize: { xs: "2rem", md: "2.5rem" }
                        }}
                    >
                        {data.title}
                    </Typography>

                    <Stack spacing={4} position="relative">
                        {/* Connecting Line (Desktop) */}
                        <Box
                            sx={{
                                display: { xs: "none", md: "block" },
                                position: "absolute",
                                left: "50%",
                                top: 0,
                                bottom: 0,
                                width: "2px",
                                backgroundColor: "rgba(21, 66, 120, 0.1)",
                                transform: "translateX(-50%)",
                                zIndex: 0
                            }}
                        />

                        {data.steps.map((step, index) => {
                            const isEven = index % 2 === 0;
                            return (
                                <Box
                                    key={index}
                                    sx={{
                                        display: "flex",
                                        justifyContent: { xs: "center", md: isEven ? "flex-start" : "flex-end" },
                                        position: "relative",
                                        zIndex: 1
                                    }}
                                >
                                    {/* Circle Marker */}
                                    <Box
                                        sx={{
                                            display: { xs: "none", md: "flex" },
                                            position: "absolute",
                                            left: "50%",
                                            top: "50%",
                                            transform: "translate(-50%, -50%)",
                                            width: 40,
                                            height: 40,
                                            borderRadius: "50%",
                                            backgroundColor: "#154278",
                                            color: "white",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontWeight: "bold",
                                            fontSize: "1.1rem",
                                            boxShadow: "0 0 0 8px rgba(21, 66, 120, 0.05)"
                                        }}
                                    >
                                        {index + 1}
                                    </Box>

                                    <motion.div
                                        initial={{ opacity: 0, y: 30 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: index * 0.1, duration: 0.6 }}
                                        style={{ width: "100%", maxWidth: "500px" }}
                                    >
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 4,
                                                borderRadius: 3,
                                                backgroundColor: "#f8f9fa",
                                                border: "1px solid #e0e0e0",
                                                transition: "all 0.3s ease",
                                                position: "relative",
                                                "&:hover": {
                                                    borderColor: "#154278",
                                                    boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
                                                    transform: "translateY(-5px)"
                                                },
                                                // Mobile Arrow
                                                "&::before": {
                                                    content: { xs: '""', md: "none" },
                                                    position: "absolute",
                                                    top: -15,
                                                    left: "50%",
                                                    transform: "translateX(-50%)",
                                                    borderLeft: "15px solid transparent",
                                                    borderRight: "15px solid transparent",
                                                    borderBottom: "15px solid #e0e0e0",
                                                    display: index === 0 ? "none" : "block"
                                                }
                                            }}
                                        >
                                            <Typography
                                                variant="h6"
                                                sx={{
                                                    fontWeight: "bold",
                                                    mb: 2,
                                                    color: "#154278",
                                                    fontSize: "1.25rem",
                                                    textAlign: { xs: "center", md: isEven ? "right" : "left" }
                                                }}
                                            >
                                                {step.title}
                                            </Typography>
                                            <Typography
                                                variant="body1"
                                                sx={{
                                                    color: "#555",
                                                    lineHeight: 1.8,
                                                    fontSize: "1rem",
                                                    textAlign: { xs: "center", md: isEven ? "right" : "left" }
                                                }}
                                            >
                                                {step.description}
                                            </Typography>
                                        </Paper>
                                    </motion.div>
                                </Box>
                            );
                        })}
                    </Stack>
                </motion.div>
            </Container>
        </Box>
    );
}
