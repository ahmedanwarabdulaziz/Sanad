"use client";

import { Box, Container, Typography, Button, Stack } from "@mui/material";
import { motion } from "framer-motion";
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ChatIcon from '@mui/icons-material/Chat';
import { Link } from "@/navigation";

interface AboutPartnershipCTAProps {
    data: {
        title: string;
        description: string;
        buttons: {
            book: string;
            contact: string;
        };
    };
}

export default function AboutPartnershipCTA({ data }: AboutPartnershipCTAProps) {
    return (
        <Box
            sx={{
                py: { xs: 10, md: 15 },
                backgroundColor: "#ffffff",
                position: "relative",
                overflow: "hidden"
            }}
        >
            {/* Background Decorative Element */}
            <Box
                sx={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: "300px",
                    height: "300px",
                    background: "radial-gradient(circle, rgba(21, 66, 120, 0.03) 0%, transparent 70%)",
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
                                mb: 3,
                                color: "#154278",
                                fontSize: { xs: "2rem", md: "2.8rem" },
                                fontFamily: "var(--font-playfair-display)"
                            }}
                        >
                            {data.title}
                        </Typography>

                        <Typography
                            variant="h6"
                            sx={{
                                mb: 6,
                                color: "#555",
                                lineHeight: 1.8,
                                fontSize: { xs: "1.1rem", md: "1.3rem" },
                                maxWidth: "800px",
                                mx: "auto"
                            }}
                        >
                            {data.description}
                        </Typography>

                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={3}
                            justifyContent="center"
                            alignItems="center"
                        >
                            <Button
                                component={Link}
                                href="/contact"
                                variant="contained"
                                size="large"
                                startIcon={<CalendarMonthIcon />}
                                sx={{
                                    backgroundColor: "#154278",
                                    color: "#ffffff",
                                    px: 6,
                                    py: 2,
                                    fontSize: "1.1rem",
                                    fontWeight: 600,
                                    borderRadius: 2,
                                    minWidth: "220px",
                                    "&:hover": {
                                        backgroundColor: "#0d2b4f",
                                        transform: "translateY(-3px)",
                                        boxShadow: "0 10px 25px rgba(21, 66, 120, 0.2)"
                                    },
                                    transition: "all 0.3s ease"
                                }}
                            >
                                {data.buttons.book}
                            </Button>

                            <Button
                                component={Link}
                                href="/contact"
                                variant="outlined"
                                size="large"
                                startIcon={<ChatIcon />}
                                sx={{
                                    borderColor: "#154278",
                                    color: "#154278",
                                    px: 6,
                                    py: 2,
                                    fontSize: "1.1rem",
                                    fontWeight: 600,
                                    borderRadius: 2,
                                    borderWidth: "2px",
                                    minWidth: "220px",
                                    "&:hover": {
                                        borderWidth: "2px",
                                        borderColor: "#154278",
                                        backgroundColor: "rgba(21, 66, 120, 0.04)",
                                        transform: "translateY(-3px)"
                                    },
                                    transition: "all 0.3s ease"
                                }}
                            >
                                {data.buttons.contact}
                            </Button>
                        </Stack>
                    </Box>
                </motion.div>
            </Container>
        </Box>
    );
}
