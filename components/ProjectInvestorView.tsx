"use client";

import { Box, Container, Typography, Paper } from "@mui/material";
import { motion } from "framer-motion";
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import UpdateIcon from '@mui/icons-material/Update';
import HeadsetMicIcon from '@mui/icons-material/HeadsetMic';

interface ProjectInvestorViewProps {
    data: {
        title: string;
        description: string;
        cards: {
            "1": string;
            "2": string;
            "3": string;
            "4": string;
            "5": string;
            "6": string;
        };
    };
}

export default function ProjectInvestorView({ data }: ProjectInvestorViewProps) {

    const cards = [
        { icon: <AssignmentTurnedInIcon sx={{ fontSize: 40 }} />, text: data.cards["1"] },
        { icon: <FolderSharedIcon sx={{ fontSize: 40 }} />, text: data.cards["2"] },
        { icon: <CalendarMonthIcon sx={{ fontSize: 40 }} />, text: data.cards["3"] },
        { icon: <ReceiptLongIcon sx={{ fontSize: 40 }} />, text: data.cards["4"] },
        { icon: <UpdateIcon sx={{ fontSize: 40 }} />, text: data.cards["5"] },
        { icon: <HeadsetMicIcon sx={{ fontSize: 40 }} />, text: data.cards["6"] },
    ];

    return (
        <Box sx={{ py: 12, backgroundColor: "#ffffff" }}>
            <Container maxWidth="lg">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <Box sx={{ textAlign: 'center', mb: 8, maxWidth: '800px', mx: 'auto' }}>
                        <Typography variant="h4" sx={{ fontWeight: "bold", mb: 3, color: "#154278" }}>
                            {data.title}
                        </Typography>
                        <Typography variant="body1" sx={{ color: "#555", fontSize: '1.1rem', lineHeight: 1.8 }}>
                            {data.description}
                        </Typography>
                    </Box>

                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
                        gap: 4
                    }}>
                        {cards.map((card, index) => (
                            <Box key={index} sx={{ height: '100%' }}>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1, duration: 0.5 }}
                                    style={{ height: '100%' }}
                                >
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 4,
                                            height: '100%',
                                            borderRadius: 4,
                                            border: '1px solid #e0e0e0',
                                            textAlign: 'center',
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                transform: 'translateY(-5px)',
                                                boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                                                borderColor: '#154278'
                                            },
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 2
                                        }}
                                    >
                                        <Box sx={{ color: '#154278', p: 2, borderRadius: '50%', bgcolor: 'rgba(21, 66, 120, 0.05)' }}>
                                            {card.icon}
                                        </Box>
                                        <Typography variant="h6" sx={{ color: "#333", fontWeight: "600", fontSize: '1.1rem' }}>
                                            {card.text}
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
