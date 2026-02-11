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
import AssignmentIcon from '@mui/icons-material/Assignment';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import GavelIcon from '@mui/icons-material/Gavel';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import EngineeringIcon from '@mui/icons-material/Engineering';
import FlagIcon from '@mui/icons-material/Flag';

interface ProjectRoadmapProps {
    data: {
        title: string;
        description: string;
        steps: {
            "1": string;
            "2": string;
            "3": string;
            "4": string;
            "5": string;
            "6": string;
        };
    };
}

export default function ProjectRoadmap({ data }: ProjectRoadmapProps) {
    const steps = [
        { icon: <AssignmentIcon />, text: data.steps["1"] },
        { icon: <DesignServicesIcon />, text: data.steps["2"] },
        { icon: <GavelIcon />, text: data.steps["3"] },
        { icon: <FactCheckIcon />, text: data.steps["4"] },
        { icon: <EngineeringIcon />, text: data.steps["5"] },
        { icon: <FlagIcon />, text: data.steps["6"] },
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
                    <Typography variant="h4" sx={{ fontWeight: "bold", mb: 2, color: "#154278", textAlign: 'center' }}>
                        {data.title}
                    </Typography>
                    <Typography variant="body1" sx={{ color: "#555", mb: 8, textAlign: 'center', maxWidth: '600px', mx: 'auto' }}>
                        {data.description}
                    </Typography>

                    <Timeline position="alternate">
                        {steps.map((step, index) => (
                            <TimelineItem key={index}>
                                <TimelineOppositeContent
                                    sx={{ m: 'auto 0', display: 'none' }} // Hiding opposite content for cleaner look, or align 'right'
                                    align="right"
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    {/* Could add dates here if available */}
                                </TimelineOppositeContent>
                                <TimelineSeparator>
                                    <TimelineConnector sx={{ bgcolor: index === 0 ? 'transparent' : '#154278' }} />
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        whileInView={{ scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
                                    >
                                        <TimelineDot sx={{ bgcolor: "#154278", p: 2 }}>
                                            {step.icon}
                                        </TimelineDot>
                                    </motion.div>
                                    <TimelineConnector sx={{ bgcolor: index === steps.length - 1 ? 'transparent' : '#154278' }} />
                                </TimelineSeparator>
                                <TimelineContent sx={{ py: '12px', px: 2 }}>
                                    <motion.div
                                        initial={{ opacity: 0, x: index % 2 === 0 ? 20 : -20 }} // Animation direction based on side
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: index * 0.1, duration: 0.5 }}
                                    >
                                        <Paper elevation={1} sx={{ p: 3, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                                            <Typography variant="h6" component="span" sx={{ color: '#154278', fontWeight: 'bold' }}>
                                                {step.text}
                                            </Typography>
                                        </Paper>
                                    </motion.div>
                                </TimelineContent>
                            </TimelineItem>
                        ))}
                    </Timeline>
                </motion.div>
            </Container>
        </Box>
    );
}
