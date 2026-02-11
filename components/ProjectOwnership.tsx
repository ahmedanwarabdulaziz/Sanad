"use client";

import { Box, Container, Typography, Paper } from "@mui/material";
import { motion } from "framer-motion";
import HandshakeIcon from '@mui/icons-material/Handshake';

interface ProjectOwnershipProps {
    data: {
        title: string;
        text: string;
    };
}

export default function ProjectOwnership({ data }: ProjectOwnershipProps) {
    return (
        <Box sx={{ py: 12, backgroundColor: "#f0f2f5" }}>
            <Container maxWidth="md">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <Paper
                        elevation={0}
                        sx={{
                            p: 6,
                            borderRadius: 4,
                            textAlign: 'center',
                            backgroundColor: '#154278',
                            color: 'white',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Decorative background circle */}
                        <Box sx={{
                            position: 'absolute',
                            top: -50,
                            right: -50,
                            width: 150,
                            height: 150,
                            borderRadius: '50%',
                            bgcolor: 'rgba(255,255,255,0.05)'
                        }} />

                        <HandshakeIcon sx={{ fontSize: 60, mb: 3, color: '#d1d0c6' }} />

                        <Typography variant="h4" sx={{ fontWeight: "bold", mb: 4, color: "#fff" }}>
                            {data.title}
                        </Typography>

                        <Typography variant="body1" sx={{ fontSize: '1.25rem', lineHeight: 2, fontWeight: 300 }}>
                            {data.text}
                        </Typography>
                    </Paper>
                </motion.div>
            </Container>
        </Box>
    );
}
