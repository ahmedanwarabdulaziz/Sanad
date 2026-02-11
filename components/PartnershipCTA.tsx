"use client";

import { Box, Container, Typography, Button, Stack } from "@mui/material";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import Link from "next/link"; // Ensure correct link import if needed, or stick to navigation
import { useState } from "react";
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import SearchIcon from '@mui/icons-material/Search';
import ContactModal from "./ContactModal";

export default function PartnershipCTA() {
    const t = useTranslations("PartnershipCTA");

    const [contactOpen, setContactOpen] = useState(false);

    return (
        <Box sx={{ py: { xs: 10, md: 15 }, bgcolor: "#fff" }}>
            <Container maxWidth="lg">
                <Box
                    sx={{
                        p: { xs: 4, md: 8 },
                        borderRadius: 8,
                        bgcolor: "#f8f9fa",
                        boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
                        textAlign: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        border: '1px solid rgba(21, 66, 120, 0.08)'
                    }}
                >
                    {/* Decorative accent */}
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: 6,
                            bgcolor: '#154278'
                        }}
                    />

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <Typography
                            variant="h3"
                            sx={{
                                fontWeight: 800,
                                color: "#154278",
                                mb: 3,
                                fontSize: { xs: "1.8rem", md: "2.5rem" }
                            }}
                        >
                            {t("title")}
                        </Typography>
                        <Typography
                            variant="h6"
                            sx={{
                                color: "#666",
                                mb: 6,
                                maxWidth: "800px",
                                mx: "auto",
                                lineHeight: 1.8,
                                fontWeight: 400
                            }}
                        >
                            {t("description")}
                        </Typography>

                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={3}
                            justifyContent="center"
                            alignItems="center"
                        >
                            <Button
                                onClick={() => setContactOpen(true)}
                                variant="contained"
                                startIcon={<EventAvailableIcon />}
                                sx={{
                                    bgcolor: "#154278",
                                    color: "white",
                                    px: 4,
                                    py: 2,
                                    borderRadius: 3,
                                    fontWeight: 700,
                                    fontSize: '1rem',
                                    "&:hover": {
                                        bgcolor: "#0d2b4d"
                                    }
                                }}
                            >
                                {t("bookIntro")}
                            </Button>

                            <Button
                                onClick={() => setContactOpen(true)}
                                variant="outlined"
                                startIcon={<ContactSupportIcon />}
                                sx={{
                                    borderColor: "#154278",
                                    color: "#154278",
                                    px: 4,
                                    py: 2,
                                    borderRadius: 3,
                                    fontWeight: 700,
                                    fontSize: '1rem',
                                    "&:hover": {
                                        borderColor: "#154278",
                                        bgcolor: "rgba(21, 66, 120, 0.05)"
                                    }
                                }}
                            >
                                {t("contactUs")}
                            </Button>

                            <Button
                                component={Link}
                                href="/projects"
                                variant="text"
                                startIcon={<SearchIcon />}
                                sx={{
                                    color: "#C29B40",
                                    px: 4,
                                    py: 2,
                                    fontWeight: 700,
                                    fontSize: '1rem',
                                    "&:hover": {
                                        bgcolor: "rgba(194, 155, 64, 0.05)"
                                    }
                                }}
                            >
                                {t("exploreProjects")}
                            </Button>
                        </Stack>
                    </motion.div>
                </Box>
            </Container>
            <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
        </Box>
    );
}
