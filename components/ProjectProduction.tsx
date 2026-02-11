"use client";

import { Box, Container, Typography, Paper, Grid, Stack, Chip } from "@mui/material";
import { motion } from "framer-motion";
import AgricultureIcon from '@mui/icons-material/Agriculture';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PaymentsIcon from '@mui/icons-material/Payments';

interface ProjectProductionProps {
    data: {
        title: string;
        current: {
            title: string;
            items: string[];
        };
        marketing: {
            title: string;
            description?: string;
            items?: string[];
        };
        revenue?: {
            title: string;
            description?: string;
            items?: string[];
            revenueLabel?: string;
        };
    };
}

export default function ProjectProduction({ data }: ProjectProductionProps) {
    return (
        <Box sx={{ py: 10, backgroundColor: "#f8f9fa" }}>
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
                        {/* Current Production */}
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
                                    <AgricultureIcon sx={{ color: '#154278', fontSize: 32 }} />
                                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#154278' }}>
                                        {data.current.title}
                                    </Typography>
                                </Box>
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                                    {data.current.items.map((item, idx) => (
                                        <Chip
                                            key={idx}
                                            label={item}
                                            sx={{
                                                bgcolor: 'rgba(21, 66, 120, 0.05)',
                                                color: '#154278',
                                                fontWeight: 500,
                                                fontSize: '0.9rem',
                                                border: '1px solid rgba(21, 66, 120, 0.1)'
                                            }}
                                        />
                                    ))}
                                </Stack>
                            </Paper>
                        </Box>

                        {/* Marketing Model */}
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
                                    <StorefrontIcon sx={{ color: '#154278', fontSize: 32 }} />
                                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#154278' }}>
                                        {data.marketing.title}
                                    </Typography>
                                </Box>
                                {data.marketing.description && (
                                    <Typography variant="body1" sx={{ color: '#555', lineHeight: 1.8 }}>
                                        {data.marketing.description}
                                    </Typography>
                                )}
                                {data.marketing.items && (
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                                        {data.marketing.items.map((item, idx) => (
                                            <Chip
                                                key={idx}
                                                label={item}
                                                sx={{
                                                    bgcolor: 'rgba(21, 66, 120, 0.05)',
                                                    color: '#154278',
                                                    fontWeight: 500,
                                                    fontSize: '0.9rem',
                                                    border: '1px solid rgba(21, 66, 120, 0.1)'
                                                }}
                                            />
                                        ))}
                                    </Stack>
                                )}
                            </Paper>
                        </Box>

                        {/* Revenue Status */}
                        {data.revenue && (
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
                                        <PaymentsIcon sx={{ color: '#154278', fontSize: 32 }} />
                                        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#154278' }}>
                                            {data.revenue.title}
                                        </Typography>
                                    </Box>
                                    {data.revenue.description && (
                                        <Typography variant="body1" sx={{ color: '#555', lineHeight: 1.8 }}>
                                            {data.revenue.description}
                                        </Typography>
                                    )}
                                    {data.revenue.items && (
                                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                                            {data.revenue.items.map((item, idx) => (
                                                <Chip
                                                    key={idx}
                                                    label={item}
                                                    sx={{
                                                        bgcolor: 'rgba(21, 66, 120, 0.05)',
                                                        color: '#154278',
                                                        fontWeight: 500,
                                                        fontSize: '0.9rem',
                                                        border: '1px solid rgba(21, 66, 120, 0.1)'
                                                    }}
                                                />
                                            ))}
                                        </Stack>
                                    )}
                                    {data.revenue.revenueLabel && (
                                        <Box sx={{ mt: 'auto', pt: 3 }}>
                                            <Chip
                                                label={data.revenue.revenueLabel}
                                                color="success"
                                                variant="outlined"
                                                sx={{ fontWeight: 'bold' }}
                                            />
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
