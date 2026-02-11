"use client";

import { Box, Container, Typography, Button } from "@mui/material";
import { motion } from "framer-motion";
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Link } from "@/navigation";

interface AboutMilestoneRightProps {
    data: {
        title: string;
        description: string;
        ctaText: string;
        ctaLink: string;
    };
}

export default function AboutMilestoneRight({ data }: AboutMilestoneRightProps) {
    return (
        <Box
            sx={{
                py: 12,
                background: "linear-gradient(135deg, #154278 0%, #1a5a94 100%)",
                position: "relative",
                overflow: "hidden"
            }}
        >
            {/* Decorative Elements */}
            <Box
                sx={{
                    position: "absolute",
                    top: "-50%",
                    right: "-10%",
                    width: "600px",
                    height: "600px",
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(194, 155, 64, 0.1) 0%, transparent 70%)",
                    pointerEvents: "none"
                }}
            />

            <Container maxWidth="md">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <Box sx={{ textAlign: "center" }}>
                        <Typography
                            variant="h3"
                            sx={{
                                fontWeight: "bold",
                                mb: 4,
                                color: "#d1d0c6",
                                fontSize: { xs: "2rem", md: "2.5rem" },
                                lineHeight: 1.3
                            }}
                        >
                            {data.title}
                        </Typography>

                        <Typography
                            variant="h6"
                            sx={{
                                mb: 5,
                                color: "rgba(209, 208, 198, 0.9)",
                                lineHeight: 2,
                                fontSize: { xs: "1rem", md: "1.2rem" },
                                maxWidth: "800px",
                                mx: "auto"
                            }}
                        >
                            {data.description}
                        </Typography>

                        <Button
                            component={Link}
                            href={data.ctaLink}
                            variant="contained"
                            size="large"
                            endIcon={<ArrowForwardIcon />}
                            sx={{
                                backgroundColor: "#C29B40",
                                color: "#ffffff",
                                px: 5,
                                py: 2,
                                fontSize: "1.1rem",
                                fontWeight: 600,
                                borderRadius: 2,
                                textTransform: "none",
                                boxShadow: "0 4px 20px rgba(194, 155, 64, 0.4)",
                                "&:hover": {
                                    backgroundColor: "#a88535",
                                    transform: "translateY(-2px)",
                                    boxShadow: "0 6px 25px rgba(194, 155, 64, 0.5)"
                                },
                                transition: "all 0.3s ease"
                            }}
                        >
                            {data.ctaText}
                        </Button>
                    </Box>
                </motion.div>
            </Container>
        </Box>
    );
}
