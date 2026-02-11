"use client";

import { Box, Container, Typography, Paper, Button, List, ListItem, ListItemIcon, ListItemText } from "@mui/material";
import { motion } from "framer-motion";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import Link from "next/link";

interface MilestoneStage {
    title: string;
    items: string[];
}

interface ProjectMilestoneStagesProps {
    data: {
        title: string;
        subtitle: string;
        description: string;
        stages: MilestoneStage[];
        cta: string;
    };
}

export default function ProjectMilestoneStages({ data }: ProjectMilestoneStagesProps) {
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
                        <Typography variant="h4" sx={{ fontWeight: "bold", mb: 2, color: "#154278" }}>
                            {data.title}
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: "bold", mb: 3, color: "#154278", opacity: 0.8 }}>
                            {data.subtitle}
                        </Typography>
                        <Typography variant="body1" sx={{ color: "#555", fontSize: '1.1rem', lineHeight: 1.8 }}>
                            {data.description}
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, mb: 10 }}>
                        {data.stages.map((stage, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1, duration: 0.6 }}
                            >
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 4,
                                        borderRadius: 4,
                                        border: '1px solid #154278',
                                        backgroundColor: '#ffffff',
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            boxShadow: '0 8px 30px rgba(21, 66, 120, 0.1)',
                                            transform: 'translateY(-2px)'
                                        }
                                    }}
                                >
                                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#154278', mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Box sx={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: '50%',
                                            bgcolor: '#154278',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            fontSize: '1.2rem'
                                        }}>
                                            {index + 1}
                                        </Box>
                                        {stage.title}
                                    </Typography>
                                    <List>
                                        {stage.items.map((item, idx) => (
                                            <ListItem key={idx} disableGutters sx={{ py: 0.5 }}>
                                                <ListItemIcon sx={{ minWidth: 40 }}>
                                                    <CheckCircleOutlineIcon sx={{ color: '#154278' }} />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={item}
                                                    primaryTypographyProps={{
                                                        variant: 'body1',
                                                        sx: { color: '#555', fontWeight: 500 }
                                                    }}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                </Paper>
                            </motion.div>
                        ))}
                    </Box>

                    <Box sx={{ textAlign: 'center' }}>
                        <Button
                            component={Link}
                            href="/milestone-right"
                            variant="contained"
                            size="large"
                            endIcon={<ArrowBackIcon sx={{ transform: 'rotate(180deg)' }} />}
                            sx={{
                                bgcolor: '#154278',
                                color: 'white',
                                px: 6,
                                py: 2,
                                borderRadius: 50,
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
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
