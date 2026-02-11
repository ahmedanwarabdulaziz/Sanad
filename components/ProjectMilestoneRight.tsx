"use client";

import { Box, Container, Typography, Grid, Paper, Button } from "@mui/material";
import { motion } from "framer-motion";
import VisibilityIcon from '@mui/icons-material/Visibility';
import BalanceIcon from '@mui/icons-material/Balance';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface ProjectMilestoneRightProps {
    data: {
        title: string;
        description: string;
        points: {
            clarity: { title: string; desc: string };
            fairness: { title: string; desc: string };
            transparency: { title: string; desc: string };
        };
        cta: string;
    };
}

export default function ProjectMilestoneRight({ data }: ProjectMilestoneRightProps) {

    const features = [
        {
            key: 'clarity',
            icon: <VisibilityIcon sx={{ fontSize: 40, color: '#154278' }} />,
            title: data.points.clarity.title,
            desc: data.points.clarity.desc
        },
        {
            key: 'fairness',
            icon: <BalanceIcon sx={{ fontSize: 40, color: '#154278' }} />,
            title: data.points.fairness.title,
            desc: data.points.fairness.desc
        },
        {
            key: 'transparency',
            icon: <FactCheckIcon sx={{ fontSize: 40, color: '#154278' }} />,
            title: data.points.transparency.title,
            desc: data.points.transparency.desc
        }
    ];

    return (
        <Box sx={{ py: 12, backgroundColor: "#f0f2f5" }}>
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
                        mb: 8
                    }}>
                        {features.map((feature, index) => (
                            <Box key={feature.key} sx={{ height: '100%' }}>
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
                                            transition: 'transform 0.3s ease',
                                            '&:hover': { transform: 'translateY(-5px)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }
                                        }}
                                    >
                                        <Box sx={{ mb: 2, display: 'inline-flex', p: 2, borderRadius: '50%', bgcolor: 'rgba(21, 66, 120, 0.05)' }}>
                                            {feature.icon}
                                        </Box>
                                        <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2, color: "#154278" }}>
                                            {feature.title}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: "#666", lineHeight: 1.6 }}>
                                            {feature.desc}
                                        </Typography>
                                    </Paper>
                                </motion.div>
                            </Box>
                        ))}
                    </Box>

                    <Box sx={{ textAlign: 'center' }}>
                        <Button
                            variant="contained"
                            size="large"
                            endIcon={<ArrowBackIcon sx={{ transform: 'rotate(180deg)' }} />} // RTL arrow
                            sx={{
                                bgcolor: '#154278',
                                color: 'white',
                                px: 6,
                                py: 1.5,
                                borderRadius: 50,
                                fontSize: '1.1rem',
                                '&:hover': { bgcolor: '#0e2e5c' }
                            }}
                        >
                            {data.cta}
                        </Button>
                    </Box>
                </motion.div>
            </Container>
        </Box>
    );
}
