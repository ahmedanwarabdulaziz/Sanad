"use client";

import { Box, Container, Typography, Button, Stack } from "@mui/material";
import { motion } from "framer-motion";
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Link } from "@/navigation";
import { useState } from "react";
import TeaserModal from "./TeaserModal";
import ContactModal from "./ContactModal";

interface ProjectCTAProps {
    data: {
        title: string;
        description?: string;
        buttons: {
            text: string;
            href: string;
            variant?: "contained" | "outlined";
            icon?: React.ReactNode;
        }[];
    };
}

export default function ProjectCTA({ data }: ProjectCTAProps) {
    const [teaserOpen, setTeaserOpen] = useState(false);
    const [contactOpen, setContactOpen] = useState(false);

    return (
        <Box
            sx={{
                py: { xs: 10, md: 12 },
                background: "linear-gradient(135deg, #154278 0%, #0d2d4f 100%)",
                color: "white",
                textAlign: "center"
            }}
        >
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
                            mb: data.description ? 3 : 6,
                            fontSize: { xs: "2.5rem", md: "3.5rem" }
                        }}
                    >
                        {data.title}
                    </Typography>

                    {data.description && (
                        <Typography
                            variant="h6"
                            sx={{
                                mb: 6,
                                opacity: 0.9,
                                fontWeight: 300,
                                fontSize: "1.25rem",
                                maxWidth: "800px",
                                mx: "auto"
                            }}
                        >
                            {data.description}
                        </Typography>
                    )}

                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={3}
                        justifyContent="center"
                        alignItems="center"
                    >
                        {data.buttons.map((button, index) => {
                            const isContactLink = button.href === '/contact' || button.href === '#contact' || button.href === '#';

                            return (
                                <Button
                                    key={index}
                                    {...(isContactLink ? { onClick: () => setContactOpen(true) } : { component: Link, href: button.href as any })}
                                    variant={button.variant || "contained"}
                                    size="large"
                                    endIcon={button.icon || <ArrowForwardIcon />}
                                    sx={{
                                        px: 5,
                                        py: 2,
                                        borderRadius: 50,
                                        fontSize: "1.1rem",
                                        fontWeight: "bold",
                                        minWidth: { xs: "100%", md: "250px" },
                                        ...(button.variant === "outlined"
                                            ? {
                                                color: "white",
                                                borderColor: "rgba(255,255,255,0.5)",
                                                "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" }
                                            }
                                            : {
                                                bgcolor: "#C29B40",
                                                color: "white",
                                                "&:hover": { bgcolor: "#a88535" }
                                            })
                                    }}
                                >
                                    {button.text}
                                </Button>
                            );
                        })}
                    </Stack>
                </motion.div>
                <TeaserModal open={teaserOpen} onClose={() => setTeaserOpen(false)} projectName={data.title} />
                <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
            </Container>
        </Box>
    );
}
