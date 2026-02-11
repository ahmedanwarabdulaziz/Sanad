"use client";

import { Box, Container, Typography } from "@mui/material";
import { motion } from "framer-motion";

interface AboutWhoWeAreProps {
    data: {
        title: string;
        content: string;
    };
}

export default function AboutWhoWeAre({ data }: AboutWhoWeAreProps) {
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
                            mb: 6,
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
                            color: "#555",
                            lineHeight: 2,
                            fontSize: { xs: "1rem", md: "1.2rem" },
                            textAlign: "justify",
                            maxWidth: "900px",
                            mx: "auto"
                        }}
                    >
                        {data.content}
                    </Typography>
                </motion.div>
            </Container>
        </Box>
    );
}
