"use client";

import { Box, Container, Typography, Paper, Grid } from "@mui/material";
import { motion } from "framer-motion";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

interface ProjectLiveStatusProps {
    data: {
        title: string;
        stages: {
            done: { label: string; items: string[] };
            inProgress: { label: string; items: string[] };
            next: { label: string; items: string[] };
        };
    };
}

export default function ProjectLiveStatus({ data }: ProjectLiveStatusProps) {

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    return (
        <Box sx={{ py: 10, backgroundColor: "#f8f9fa" }}>
            <Container maxWidth="xl">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={containerVariants}
                >
                    <Typography variant="h4" sx={{ fontWeight: "bold", mb: 8, color: "#154278", textAlign: 'center' }}>
                        {data.title}
                    </Typography>

                    <Grid container spacing={4}>
                        {/* Done Stage */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <motion.div variants={itemVariants}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 4,
                                        height: '100%',
                                        borderRadius: 4,
                                        border: '1px solid #e0e0e0',
                                        backgroundColor: 'white',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                                        <CheckCircleIcon sx={{ color: '#2e7d32', fontSize: '2rem', ml: 2 }} />
                                        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                                            {data.stages.done.label}
                                        </Typography>
                                    </Box>
                                    <Box component="ul" sx={{ p: 0, listStyle: 'none' }}>
                                        {data.stages.done.items.map((item, index) => (
                                            <Box component="li" key={index} sx={{ mb: 2, display: 'flex', alignItems: 'flex-start' }}>
                                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#2e7d32', mt: 1.5, ml: 1.5, flexShrink: 0 }} />
                                                <Typography variant="body1" sx={{ color: '#555' }}>
                                                    {item}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                    <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', bgcolor: '#2e7d32' }} />
                                </Paper>
                            </motion.div>
                        </Grid>

                        {/* In Progress Stage */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <motion.div variants={itemVariants}>
                                <Paper
                                    elevation={3}
                                    sx={{
                                        p: 4,
                                        height: '100%',
                                        borderRadius: 4,
                                        border: '1px solid #154278', // Highlight
                                        backgroundColor: '#fff',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        transform: 'scale(1.02)' // Slight pop
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                                        <HourglassTopIcon sx={{ color: '#154278', fontSize: '2rem', ml: 2, animation: 'spin 3s linear infinite' }} />
                                        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#154278' }}>
                                            {data.stages.inProgress.label}
                                        </Typography>
                                    </Box>
                                    <Box component="ul" sx={{ p: 0, listStyle: 'none' }}>
                                        {data.stages.inProgress.items.map((item, index) => (
                                            <Box component="li" key={index} sx={{ mb: 2, display: 'flex', alignItems: 'flex-start' }}>
                                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#154278', mt: 1.5, ml: 1.5, flexShrink: 0 }} />
                                                <Typography variant="body1" sx={{ color: '#333', fontWeight: 600 }}>
                                                    {item}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                    <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '6px', bgcolor: '#154278' }} />
                                </Paper>
                            </motion.div>
                        </Grid>

                        {/* Next Stage */}
                        <Grid size={{ xs: 12, md: 4 }}>
                            <motion.div variants={itemVariants}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 4,
                                        height: '100%',
                                        borderRadius: 4,
                                        border: '1px solid #e0e0e0',
                                        backgroundColor: '#fafafa', // Slightly greyer
                                        position: 'relative',
                                        overflow: 'hidden',
                                        opacity: 0.9
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                                        <ArrowForwardIcon sx={{ color: '#757575', fontSize: '2rem', ml: 2, transform: 'rotate(180deg)' }} /> {/* RTL arrow */}
                                        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#757575' }}>
                                            {data.stages.next.label}
                                        </Typography>
                                    </Box>
                                    <Box component="ul" sx={{ p: 0, listStyle: 'none' }}>
                                        {data.stages.next.items.map((item, index) => (
                                            <Box component="li" key={index} sx={{ mb: 2, display: 'flex', alignItems: 'flex-start' }}>
                                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#bdbdbd', mt: 1.5, ml: 1.5, flexShrink: 0 }} />
                                                <Typography variant="body1" sx={{ color: '#666' }}>
                                                    {item}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                    <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', bgcolor: '#bdbdbd' }} />
                                </Paper>
                            </motion.div>
                        </Grid>
                    </Grid>
                </motion.div>
            </Container>
        </Box>
    );
}
