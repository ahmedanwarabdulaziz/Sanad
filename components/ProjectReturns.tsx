"use client";

import { Box, Container, Typography, Paper } from "@mui/material";
import { motion } from "framer-motion";
import PercentIcon from '@mui/icons-material/Percent';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

interface ProjectReturnsProps {
    data: {
        title: string;
        description: string;
        cards: {
            partnership: { title: string; desc: string };
            management: { title: string; desc: string };
            valueCreation: { title: string; desc: string };
        };
        note: string;
    };
}

export default function ProjectReturns({ data }: ProjectReturnsProps) {

    const cards = [
        {
            key: 'partnership',
            icon: <PercentIcon sx={{ fontSize: 40, color: '#154278' }} />,
            title: data.cards.partnership.title,
            desc: data.cards.partnership.desc
        },
        {
            key: 'management',
            icon: <AssignmentIcon sx={{ fontSize: 40, color: '#154278' }} />,
            title: data.cards.management.title,
            desc: data.cards.management.desc
        },
        {
            key: 'valueCreation',
            icon: <TrendingUpIcon sx={{ fontSize: 40, color: '#154278' }} />,
            title: data.cards.valueCreation.title,
            desc: data.cards.valueCreation.desc
        }
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
                        gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                        gap: 4,
                        mb: 6
                    }}>
                        {cards.map((card, index) => (
                            <Box key={card.key} sx={{ height: '100%' }}>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.2, duration: 0.5 }}
                                    style={{ height: '100%' }}
                                >
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 4,
                                            height: '100%',
                                            borderRadius: 4,
                                            textAlign: 'center',
                                            border: '1px solid #e0e0e0',
                                            transition: 'transform 0.3s ease',
                                            '&:hover': {
                                                transform: 'translateY(-5px)',
                                                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                                borderColor: '#154278'
                                            }
                                        }}
                                    >
                                        <Box sx={{ mb: 2, display: 'inline-flex', p: 2, borderRadius: '50%', bgcolor: 'rgba(21, 66, 120, 0.05)' }}>
                                            {card.icon}
                                        </Box>
                                        <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2, color: "#154278" }}>
                                            {card.title}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: "#666", lineHeight: 1.6 }}>
                                            {card.desc}
                                        </Typography>
                                    </Paper>
                                </motion.div>
                            </Box>
                        ))}
                    </Box>

                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" sx={{ color: "#888", fontStyle: 'italic' }}>
                            {data.note}
                        </Typography>
                    </Box>
                </motion.div>
            </Container>
        </Box>
    );
}
