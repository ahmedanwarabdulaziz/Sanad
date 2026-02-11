"use client";

import { Box, Container, Grid, Typography, Paper, Divider, Chip } from "@mui/material";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import Timeline from '@mui/lab/Timeline';
import TimelineItem, { timelineItemClasses } from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import BusinessIcon from '@mui/icons-material/Business';
import PieChartIcon from '@mui/icons-material/PieChart';
import UpdateIcon from '@mui/icons-material/Update';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

interface ProjectStatusProps {
    data: {
        title: string;
        items: {
            label: string;
            value: string;
        }[];
    };
}

export default function ProjectStatus({ data }: ProjectStatusProps) {
    const locale = useLocale();
    const isRtl = locale === 'ar';

    // Helper to extract specific items based on known indices or labels would be better,
    // but relying on the order passed from page.tsx for now:
    // [0] Current, [1] Next, [2] Investment, [3] Share, [4] Update
    const currentStage = data.items[0];
    const nextStep = data.items[1];
    const investment = data.items[2];
    const sanadShare = data.items[3];
    const lastUpdate = data.items[4];

    // Calculate date one week ago
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    const formattedDate = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }).format(lastWeek);

    return (
        <Box sx={{ py: 10, backgroundColor: "#f8f9fa" }}>
            <Container maxWidth="lg">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <Grid container spacing={4}>
                        {/* Header Section */}
                        <Grid size={{ xs: 12 }} sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                                <Typography variant="h4" sx={{ fontWeight: "bold", color: "#154278" }}>
                                    {data.title}
                                </Typography>
                                <Chip
                                    icon={<UpdateIcon sx={{ fontSize: '1rem !important' }} />}
                                    label={`${lastUpdate.label}: ${formattedDate}`}
                                    variant="outlined"
                                    sx={{ borderColor: '#154278', color: '#154278', '& .MuiChip-label': { padding: '0 8px' } }}
                                />
                            </Box>
                        </Grid>

                        {/* Timeline Section (Current & Next) */}
                        <Grid size={{ xs: 12, md: 7 }}>
                            <Paper elevation={0} sx={{ p: 4, borderRadius: 4, height: '100%', border: '1px solid rgba(0,0,0,0.08)', position: 'relative', overflow: 'hidden' }}>
                                {/* Background decorative circle */}
                                <Box sx={{ position: 'absolute', top: -50, right: isRtl ? 'auto' : -50, left: isRtl ? -50 : 'auto', width: 150, height: 150, borderRadius: '50%', backgroundColor: 'rgba(21, 66, 120, 0.03)', zIndex: 0 }} />

                                <Box sx={{ position: 'relative', zIndex: 1 }}>
                                    <Timeline
                                        position="right"
                                        sx={{
                                            [`& .${timelineItemClasses.root}:before`]: { flex: 0, padding: 0 },
                                            p: 0,
                                            my: 0
                                        }}
                                    >
                                        <TimelineItem>
                                            <TimelineSeparator>
                                                <TimelineDot sx={{ bgcolor: '#154278', boxShadow: '0 0 0 4px rgba(21, 66, 120, 0.2)' }}>
                                                    <CheckCircleOutlineIcon sx={{ fontSize: 20 }} />
                                                </TimelineDot>
                                                <TimelineConnector sx={{ bgcolor: '#154278', opacity: 0.3 }} />
                                            </TimelineSeparator>
                                            <TimelineContent sx={{ py: '12px', px: 2 }}>
                                                <Typography variant="caption" sx={{ color: '#888', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, fontFamily: isRtl ? "var(--font-cairo)" : "inherit" }}>
                                                    {currentStage.label}
                                                </Typography>
                                                <Typography variant="h6" sx={{ color: '#154278', fontWeight: 'bold', mt: 0.5, fontFamily: isRtl ? "var(--font-tajawal)" : "inherit" }}>
                                                    {currentStage.value}
                                                </Typography>
                                            </TimelineContent>
                                        </TimelineItem>

                                        <TimelineItem>
                                            <TimelineSeparator>
                                                <TimelineDot variant="outlined" sx={{ borderColor: '#154278' }}>
                                                    <ArrowForwardIcon sx={{ color: '#154278', fontSize: 20, transform: isRtl ? 'rotate(180deg)' : 'none' }} />
                                                </TimelineDot>
                                            </TimelineSeparator>
                                            <TimelineContent sx={{ py: '12px', px: 2 }}>
                                                <Typography variant="caption" sx={{ color: '#888', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, fontFamily: isRtl ? "var(--font-cairo)" : "inherit" }}>
                                                    {nextStep.label}
                                                </Typography>
                                                <Typography variant="h6" sx={{ color: '#555', mt: 0.5, fontFamily: isRtl ? "var(--font-tajawal)" : "inherit" }}>
                                                    {nextStep.value}
                                                </Typography>
                                            </TimelineContent>
                                        </TimelineItem>
                                    </Timeline>
                                </Box>
                            </Paper>
                        </Grid>

                        {/* Stats Section (Investment & Share) */}
                        <Grid size={{ xs: 12, md: 5 }}>
                            <Grid container spacing={3} sx={{ height: '100%' }}>
                                <Grid size={{ xs: 12 }}>
                                    <Paper elevation={0} sx={{ p: 3, borderRadius: 4, height: '100%', border: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Box sx={{ p: 1.5, borderRadius: '50%', backgroundColor: 'rgba(21, 66, 120, 0.05)', color: '#154278', display: 'flex' }}>
                                            <BusinessIcon fontSize="large" />
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="caption" sx={{ color: '#888', fontWeight: 600 }}>
                                                {investment.label}
                                            </Typography>
                                            <Typography variant="h6" sx={{ color: '#154278', fontWeight: 'bold', lineHeight: 1.2 }}>
                                                {investment.value}
                                            </Typography>
                                        </Box>
                                    </Paper>
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <Paper elevation={0} sx={{ p: 3, borderRadius: 4, height: '100%', border: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Box sx={{ p: 1.5, borderRadius: '50%', backgroundColor: 'rgba(21, 66, 120, 0.05)', color: '#154278', display: 'flex' }}>
                                            <PieChartIcon fontSize="large" />
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="caption" sx={{ color: '#888', fontWeight: 600 }}>
                                                {sanadShare.label}
                                            </Typography>
                                            <Typography variant="h6" sx={{ color: '#154278', fontWeight: 'bold', lineHeight: 1.2 }}>
                                                {sanadShare.value}
                                            </Typography>
                                        </Box>
                                    </Paper>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                </motion.div>
            </Container>
        </Box>
    );
}
