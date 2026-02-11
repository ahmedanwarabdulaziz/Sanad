"use client";

import { Box, Container, Typography, Paper } from "@mui/material";
import {
    Timeline,
    TimelineItem,
    TimelineSeparator,
    TimelineConnector,
    TimelineContent,
    TimelineDot,
    TimelineOppositeContent
} from "@mui/lab";
import { motion } from "framer-motion";
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import SearchIcon from '@mui/icons-material/Search';

interface RoadmapStep {
    title: string;
    description: string;
}

interface ProjectStrategicRoadmapProps {
    data: {
        title: string;
        description: string;
        steps: RoadmapStep[];
        footer?: string;
    };
}

export default function ProjectStrategicRoadmap({ data }: ProjectStrategicRoadmapProps) {
    const icons = [
        <AccessTimeIcon key="0" />,
        <RocketLaunchIcon key="1" />,
        <SearchIcon key="2" />,
    ];

    return (
        <Box sx={{ py: 10, backgroundColor: "#ffffff" }}>
            <Container maxWidth="md">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <Typography variant="h3" sx={{ fontWeight: "bold", mb: 2, color: "#154278", textAlign: 'center', fontSize: { xs: "2rem", md: "2.5rem" } }}>
                        {data.title}
                    </Typography>
                    <Typography variant="body1" sx={{ color: "#555", mb: 8, textAlign: 'center', maxWidth: '700px', mx: 'auto', fontSize: '1.1rem' }}>
                        {data.description}
                    </Typography>

                    <Timeline position="alternate">
                        {data.steps.map((step, index) => (
                            <TimelineItem key={index}>
                                <TimelineSeparator>
                                    <TimelineConnector sx={{ bgcolor: index === 0 ? 'transparent' : '#154278', height: 40 }} />
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        whileInView={{ scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: index * 0.2, type: 'spring', stiffness: 200 }}
                                    >
                                        <TimelineDot sx={{ bgcolor: "#154278", p: 2, boxShadow: '0 0 0 4px rgba(21, 66, 120, 0.1)' }}>
                                            {icons[index % icons.length]}
                                        </TimelineDot>
                                    </motion.div>
                                    <TimelineConnector sx={{ bgcolor: index === data.steps.length - 1 ? 'transparent' : '#154278', height: 40 }} />
                                </TimelineSeparator>
                                <TimelineContent sx={{ py: '12px', px: 2 }}>
                                    <motion.div
                                        initial={{ opacity: 0, x: index % 2 === 0 ? 20 : -20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: index * 0.2, duration: 0.5 }}
                                    >
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 3,
                                                bgcolor: '#f8f9fa',
                                                borderRadius: 4,
                                                border: '1px solid #eee',
                                                textAlign: index % 2 === 0 ? 'left' : 'right'
                                            }}
                                        >
                                            <Typography variant="h6" sx={{ color: '#154278', fontWeight: 'bold', mb: 1 }}>
                                                {step.title}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: '#666', lineHeight: 1.6 }}>
                                                {step.description}
                                            </Typography>
                                        </Paper>
                                    </motion.div>
                                </TimelineContent>
                            </TimelineItem>
                        ))}
                    </Timeline>

                    {data.footer && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.8, duration: 1 }}
                        >
                            <Box sx={{
                                mt: 8,
                                p: 3,
                                textAlign: 'center',
                                bgcolor: 'rgba(21, 66, 120, 0.03)',
                                borderRadius: 4,
                                border: '1px dashed #154278'
                            }}>
                                <Typography variant="body1" sx={{ color: '#154278', fontWeight: 500, fontStyle: 'italic' }}>
                                    {data.footer}
                                </Typography>
                            </Box>
                        </motion.div>
                    )}
                </motion.div>
            </Container>
        </Box>
    );
}
