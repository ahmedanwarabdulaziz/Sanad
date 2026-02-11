"use client";

import { Box, Container, Typography, Button, Grid, Stack } from "@mui/material";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import DevicesIcon from '@mui/icons-material/Devices';
import StorageIcon from '@mui/icons-material/Storage';
import InsertChartIcon from '@mui/icons-material/InsertChart';
import DescriptionIcon from '@mui/icons-material/Description';

export default function PortalTeaser() {
    const t = useTranslations("PortalTeaser");

    const features = [
        { icon: <StorageIcon />, label: t("features.database") },
        { icon: <DescriptionIcon />, label: t("features.docs") },
        { icon: <InsertChartIcon />, label: t("features.reports") },
        { icon: <DevicesIcon />, label: t("features.tracking") }
    ];

    return (
        <Box sx={{ py: { xs: 10, md: 15 }, bgcolor: "#f8f9fa" }}>
            <Container maxWidth="xl">
                <Grid container spacing={8} alignItems="center">
                    <Grid size={{ xs: 12, md: 6 }}>
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                        >
                            <Typography
                                variant="h3"
                                sx={{
                                    fontWeight: 800,
                                    color: "#154278",
                                    mb: 3,
                                    fontSize: { xs: "2rem", md: "2.8rem" },
                                    lineHeight: 1.2
                                }}
                            >
                                {t("title")}
                            </Typography>
                            <Typography
                                variant="h6"
                                sx={{
                                    color: "#666",
                                    mb: 5,
                                    lineHeight: 1.8,
                                    fontWeight: 400,
                                    fontSize: '1.2rem'
                                }}
                            >
                                {t("description")}
                            </Typography>
                            <Button
                                variant="outlined"
                                size="large"
                                sx={{
                                    borderColor: "#154278",
                                    color: "#154278",
                                    px: 5,
                                    py: 2,
                                    borderRadius: 3,
                                    fontWeight: 700,
                                    fontSize: '1.1rem',
                                    "&:hover": {
                                        borderColor: "#154278",
                                        bgcolor: "rgba(21, 66, 120, 0.05)"
                                    }
                                }}
                            >
                                {t("cta")}
                            </Button>
                        </motion.div>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                        >
                            <Box
                                sx={{
                                    p: 4,
                                    bgcolor: 'white',
                                    borderRadius: 6,
                                    boxShadow: '0 30px 60px rgba(0,0,0,0.08)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                <Grid container spacing={3}>
                                    {[1, 2, 3, 4].map((i) => (
                                        <Grid size={{ xs: 6 }} key={i}>
                                            <Box
                                                sx={{
                                                    p: 3,
                                                    bgcolor: '#f8f9fa',
                                                    borderRadius: 4,
                                                    border: '1px solid rgba(0,0,0,0.05)',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: 1
                                                }}
                                            >
                                                <Box sx={{ color: '#C29B40' }}>
                                                    {i === 1 && <StorageIcon sx={{ fontSize: 40 }} />}
                                                    {i === 2 && <DescriptionIcon sx={{ fontSize: 40 }} />}
                                                    {i === 3 && <InsertChartIcon sx={{ fontSize: 40 }} />}
                                                    {i === 4 && <DevicesIcon sx={{ fontSize: 40 }} />}
                                                </Box>
                                                <Box sx={{ height: 4, width: 40, bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 2, mt: 1 }} />
                                                <Box sx={{ height: 4, width: 25, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 2 }} />
                                            </Box>
                                        </Grid>
                                    ))}
                                </Grid>
                                <Box sx={{ mt: 4, p: 2, bgcolor: '#154278', borderRadius: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                                    <Box sx={{ width: 30, height: 30, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.2)' }} />
                                    <Box sx={{ flex: 1, height: 8, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
                                    <Box sx={{ width: 60, height: 20, borderRadius: 1, bgcolor: '#C29B40' }} />
                                </Box>
                            </Box>
                        </motion.div>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
}
