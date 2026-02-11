"use client";

import { Box, Container, Typography, Paper, Grid, Divider, List, ListItem, ListItemText } from "@mui/material";
import { motion } from "framer-motion";
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import PetsIcon from '@mui/icons-material/Pets';

interface SpecItem {
    label: string;
    value: string;
}

interface SpecCategory {
    title: string;
    items?: SpecItem[];
    description?: string;
    readyStatus?: string;
}

interface ProjectTechnicalSpecsProps {
    data: {
        title: string;
        infrastructure: SpecCategory;
        irrigation?: SpecCategory;
        livestock?: SpecCategory;
    };
}

export default function ProjectTechnicalSpecs({ data }: ProjectTechnicalSpecsProps) {
    return (
        <Box sx={{ py: 10, backgroundColor: "#ffffff" }}>
            <Container maxWidth="xl">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <Typography
                        variant="h3"
                        sx={{
                            fontWeight: "bold",
                            mb: 8,
                            color: "#154278",
                            textAlign: 'center',
                            fontSize: { xs: "2rem", md: "2.5rem" }
                        }}
                    >
                        {data.title}
                    </Typography>

                    <Box
                        sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 4,
                            justifyContent: 'center'
                        }}
                    >
                        {/* Infrastructure */}
                        <Box sx={{ width: { xs: '100%', md: 'calc(33.333% - 27px)' }, display: 'flex' }}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 4,
                                    width: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    border: '1px solid #154278',
                                    borderRadius: 4,
                                    backgroundColor: '#ffffff',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        boxShadow: '0 4px 20px rgba(21, 66, 120, 0.08)'
                                    }
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                                    <BuildCircleIcon sx={{ color: '#154278', fontSize: 32 }} />
                                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#154278' }}>
                                        {data.infrastructure.title}
                                    </Typography>
                                </Box>
                                <Divider sx={{ mb: 3 }} />
                                <List disablePadding>
                                    {data.infrastructure.items?.map((item, idx) => (
                                        <ListItem key={idx} disablePadding sx={{ mb: 2, alignItems: 'flex-start', flexDirection: 'column' }}>
                                            <Typography variant="caption" sx={{ color: '#999', fontWeight: 'bold', mb: 0.5, textTransform: 'uppercase' }}>
                                                {item.label}
                                            </Typography>
                                            <Typography variant="body1" sx={{ color: '#333', fontWeight: 500 }}>
                                                {item.value}
                                            </Typography>
                                        </ListItem>
                                    ))}
                                </List>
                            </Paper>
                        </Box>

                        {/* Irrigation & Ops */}
                        {data.irrigation && (
                            <Box sx={{ width: { xs: '100%', md: 'calc(33.333% - 27px)' }, display: 'flex' }}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 4,
                                        width: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        border: '1px solid #154278',
                                        borderRadius: 4,
                                        backgroundColor: '#ffffff',
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            boxShadow: '0 4px 20px rgba(21, 66, 120, 0.08)'
                                        }
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                                        <WaterDropIcon sx={{ color: '#154278', fontSize: 32 }} />
                                        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#154278' }}>
                                            {data.irrigation.title}
                                        </Typography>
                                    </Box>
                                    <Divider sx={{ mb: 3 }} />
                                    <List disablePadding>
                                        {data.irrigation.items?.map((item, idx) => (
                                            <ListItem key={idx} disablePadding sx={{ mb: 2, alignItems: 'flex-start', flexDirection: 'column' }}>
                                                <Typography variant="caption" sx={{ color: '#999', fontWeight: 'bold', mb: 0.5, textTransform: 'uppercase' }}>
                                                    {item.label}
                                                </Typography>
                                                <Typography variant="body1" sx={{ color: '#333', fontWeight: 500 }}>
                                                    {item.value}
                                                </Typography>
                                            </ListItem>
                                        ))}
                                    </List>
                                </Paper>
                            </Box>
                        )}

                        {/* Livestock */}
                        {data.livestock && (
                            <Box sx={{ width: { xs: '100%', md: 'calc(33.333% - 27px)' }, display: 'flex' }}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 4,
                                        width: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        border: '1px solid #154278',
                                        borderRadius: 4,
                                        backgroundColor: '#ffffff',
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            boxShadow: '0 4px 20px rgba(21, 66, 120, 0.08)'
                                        }
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                                        <PetsIcon sx={{ color: '#154278', fontSize: 32 }} />
                                        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#154278' }}>
                                            {data.livestock.title}
                                        </Typography>
                                    </Box>
                                    <Divider sx={{ mb: 3 }} />
                                    <Typography variant="body1" sx={{ color: '#555', lineHeight: 1.8, mb: 'auto' }}>
                                        {data.livestock.description}
                                    </Typography>
                                    {data.livestock.readyStatus && (
                                        <Box sx={{ mt: 4, p: 2, bgcolor: 'rgba(21, 66, 120, 0.05)', borderRadius: 2, borderLeft: '3px solid #154278' }}>
                                            <Typography variant="caption" sx={{ color: '#154278', fontWeight: 'bold' }}>
                                                {data.livestock.readyStatus}
                                            </Typography>
                                        </Box>
                                    )}
                                </Paper>
                            </Box>
                        )}
                    </Box>
                </motion.div>
            </Container>
        </Box>
    );
}
