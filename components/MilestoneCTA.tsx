"use client";

import { Box, Container, Typography, Button, Stack } from "@mui/material";
import { motion } from "framer-motion";
import EventIcon from '@mui/icons-material/Event';
import DescriptionIcon from '@mui/icons-material/Description';
import { useState } from "react";
import ContactModal from "./ContactModal";

interface MilestoneCTAProps {
    data: {
        title: string;
        buttons: {
            session: string;
            profile: string;
        };
    };
}

export default function MilestoneCTA({ data }: MilestoneCTAProps) {
    const [contactOpen, setContactOpen] = useState(false);

    return (
        <Box
            sx={{
                py: 12,
                background: "linear-gradient(135deg, #154278 0%, #0d2d4f 100%)",
                position: "relative",
                overflow: "hidden"
            }}
        >
            <Container maxWidth="md">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    {/* Title */}
                    <Typography
                        variant="h3"
                        sx={{
                            fontWeight: "bold",
                            color: "#ffffff",
                            textAlign: "center",
                            fontSize: { xs: "1.75rem", md: "2.25rem" },
                            mb: 6,
                            lineHeight: 1.4
                        }}
                    >
                        {data.title}
                    </Typography>

                    {/* CTA Buttons */}
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={3}
                        justifyContent="center"
                        alignItems="center"
                    >
                        <Button
                            onClick={() => setContactOpen(true)}
                            variant="contained"
                            size="large"
                            startIcon={<EventIcon />}
                            sx={{
                                bgcolor: "#C29B40",
                                color: "#ffffff",
                                px: 5,
                                py: 2,
                                fontSize: "1.1rem",
                                fontWeight: 600,
                                borderRadius: 2,
                                textTransform: "none",
                                boxShadow: "0 4px 20px rgba(194, 155, 64, 0.4)",
                                "&:hover": {
                                    bgcolor: "#a88535",
                                    transform: "translateY(-2px)",
                                    boxShadow: "0 6px 25px rgba(194, 155, 64, 0.5)"
                                },
                                transition: "all 0.3s ease",
                                minWidth: { xs: "100%", sm: "auto" }
                            }}
                        >
                            {data.buttons.session}
                        </Button>

                        <Button
                            onClick={() => setContactOpen(true)}
                            variant="outlined"
                            size="large"
                            startIcon={<DescriptionIcon />}
                            sx={{
                                borderColor: "#ffffff",
                                color: "#ffffff",
                                px: 5,
                                py: 2,
                                fontSize: "1.1rem",
                                fontWeight: 600,
                                borderRadius: 2,
                                textTransform: "none",
                                borderWidth: 2,
                                "&:hover": {
                                    borderColor: "#C29B40",
                                    bgcolor: "rgba(194, 155, 64, 0.1)",
                                    borderWidth: 2,
                                    transform: "translateY(-2px)"
                                },
                                transition: "all 0.3s ease",
                                minWidth: { xs: "100%", sm: "auto" }
                            }}
                        >
                            {data.buttons.profile}
                        </Button>
                    </Stack>
                </motion.div>
                <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
            </Container>
        </Box>
    );
}
