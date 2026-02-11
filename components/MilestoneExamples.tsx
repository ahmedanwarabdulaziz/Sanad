"use client";

import { Box, Container, Typography, Paper, List, ListItem, ListItemIcon, ListItemText } from "@mui/material";
import { motion } from "framer-motion";
import ApartmentIcon from '@mui/icons-material/Apartment';
import FactoryIcon from '@mui/icons-material/Factory';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

interface ExampleData {
    title: string;
    stages: string[];
    takeaway: string;
}

interface MilestoneExamplesProps {
    data: {
        title: string;
        examples: {
            realEstate: ExampleData;
            industrial: ExampleData;
            agricultural: ExampleData;
        };
    };
}

export default function MilestoneExamples({ data }: MilestoneExamplesProps) {
    const examples = [
        { ...data.examples.realEstate, icon: <ApartmentIcon sx={{ fontSize: 40, color: "#154278" }} /> },
        { ...data.examples.industrial, icon: <FactoryIcon sx={{ fontSize: 40, color: "#154278" }} /> },
        { ...data.examples.agricultural, icon: <AgricultureIcon sx={{ fontSize: 40, color: "#154278" }} /> }
    ];

    return (
        <Box dir="rtl" sx={{ py: 12, backgroundColor: "#ffffff", textAlign: "left" }}>
            <Container maxWidth="lg">
                {/* Title */}
                <Box sx={{ textAlign: "left", mb: 8 }}>
                    <Typography
                        variant="h3"
                        dir="rtl"
                        sx={{
                            fontWeight: "bold",
                            color: "#154278",
                            textAlign: "left",
                            fontSize: { xs: "1.75rem", md: "2.5rem" }
                        }}
                    >
                        {data.title}
                    </Typography>
                </Box>

                {/* Examples */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {examples.map((example, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.15, duration: 0.6 }}
                        >
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 5,
                                    borderRadius: 3,
                                    bgcolor: "#f8f9fa",
                                    border: "2px solid #e0e0e0",
                                    transition: "all 0.3s ease",
                                    "&:hover": {
                                        boxShadow: "0 8px 30px rgba(21, 66, 120, 0.12)",
                                        borderColor: "#154278"
                                    }
                                }}
                            >
                                {/* Icon and Title */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                                    <Box sx={{
                                        p: 2,
                                        borderRadius: '12px',
                                        bgcolor: 'rgba(21, 66, 120, 0.08)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        {example.icon}
                                    </Box>
                                    <Typography
                                        variant="h5"
                                        dir="rtl"
                                        sx={{
                                            fontWeight: "bold",
                                            color: "#154278",
                                            textAlign: "left",
                                            fontSize: "1.4rem"
                                        }}
                                    >
                                        {example.title}
                                    </Typography>
                                </Box>

                                {/* Stages */}
                                <List sx={{ mb: 3 }}>
                                    {example.stages.map((stage, i) => (
                                        <ListItem
                                            key={i}
                                            disableGutters
                                            sx={{
                                                alignItems: 'flex-start',
                                                mb: 1.5,
                                                pl: 0
                                            }}
                                        >
                                            <ListItemIcon sx={{ minWidth: 36, mt: 0.3 }}>
                                                <ArrowForwardIcon sx={{ fontSize: 20, color: "#154278" }} />
                                            </ListItemIcon>
                                            <ListItemText
                                                dir="rtl"
                                                primary={stage}
                                                primaryTypographyProps={{
                                                    variant: 'body1',
                                                    color: '#444',
                                                    textAlign: 'left',
                                                    lineHeight: 1.7,
                                                    fontSize: "1rem"
                                                }}
                                            />
                                        </ListItem>
                                    ))}
                                </List>

                                {/* Takeaway */}
                                <Box sx={{
                                    p: 3,
                                    bgcolor: 'rgba(21, 66, 120, 0.05)',
                                    borderRadius: 2,
                                    borderRight: '4px solid #154278'
                                }}>
                                    <Typography
                                        variant="body1"
                                        dir="rtl"
                                        sx={{
                                            color: "#154278",
                                            textAlign: 'left',
                                            fontWeight: 600,
                                            fontSize: "1rem",
                                            lineHeight: 1.8
                                        }}
                                    >
                                        <strong>المغزى:</strong> {example.takeaway}
                                    </Typography>
                                </Box>
                            </Paper>
                        </motion.div>
                    ))}
                </Box>
            </Container>
        </Box>
    );
}
