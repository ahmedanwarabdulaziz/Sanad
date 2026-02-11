"use client";

import { Box, Container, Typography, Grid, Paper } from "@mui/material";
import { motion } from "framer-motion";
import TimerIcon from '@mui/icons-material/Timer';
import StairsIcon from '@mui/icons-material/Stairs';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import VisibilityIcon from '@mui/icons-material/Visibility';
import HandshakeIcon from '@mui/icons-material/Handshake';

interface MilestonePrinciplesProps {
    data: {
        title: string;
        subtitle: string;
        items: {
            "1": { title: string; desc: string };
            "2": { title: string; desc: string };
            "3": { title: string; desc: string };
            "4": { title: string; desc: string };
        };
        result: string;
    };
}

export default function MilestonePrinciples({ data }: MilestonePrinciplesProps) {
    const icons = [
        <StairsIcon sx={{ fontSize: 40, color: "#154278" }} key={0} />,
        <AssignmentTurnedInIcon sx={{ fontSize: 40, color: "#154278" }} key={1} />,
        <VisibilityIcon sx={{ fontSize: 40, color: "#154278" }} key={2} />,
        <HandshakeIcon sx={{ fontSize: 40, color: "#154278" }} key={3} />
    ];

    const principles = Object.values(data.items);

    return (
        <Box dir="rtl" sx={{ py: 12, backgroundColor: "#fff", textAlign: "left" }}>
            <Container maxWidth="xl">
                <Box sx={{ textAlign: "left", mb: 8 }}>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mb: 2, bgcolor: '#fff8e1', px: 2, py: 1, borderRadius: 2 }}>
                        <TimerIcon sx={{ color: '#C29B40' }} />
                        <Typography variant="body2" sx={{ color: '#C29B40', fontWeight: 'bold' }}>
                            {data.title}
                        </Typography>
                    </Box>
                    <Typography variant="h4" dir="rtl" sx={{ fontWeight: "bold", color: "#154278", textAlign: "left" }}>
                        {data.subtitle}
                    </Typography>
                </Box>

                <Grid container spacing={4}>
                    {principles.map((item, index) => (
                        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1, duration: 0.5 }}
                                style={{ height: "100%" }}
                            >
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 4,
                                        height: "100%",
                                        borderRadius: 4,
                                        bgcolor: "#f8f9fa",
                                        border: "1px solid #eee",
                                        transition: "transform 0.3s ease",
                                        "&:hover": { transform: "translateY(-5px)", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }
                                    }}
                                >
                                    <Box sx={{ mb: 3 }}>
                                        {icons[index]}
                                    </Box>
                                    <Typography variant="h6" dir="rtl" sx={{ fontWeight: "bold", mb: 2, color: "#333", textAlign: "left" }}>
                                        {item.title}
                                    </Typography>
                                    <Typography variant="body2" dir="rtl" sx={{ color: "#666", lineHeight: 1.6, textAlign: "left" }}>
                                        {item.desc}
                                    </Typography>
                                </Paper>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>

                <Box dir="rtl" sx={{ mt: 8, textAlign: "left", p: 4, bgcolor: "#154278", borderRadius: 4, color: "white" }}>
                    <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                        {data.result}
                    </Typography>
                </Box>
            </Container>
        </Box>
    );
}
