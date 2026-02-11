"use client";

import { Box, Container, Typography, Grid, Paper, Stack } from "@mui/material";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import AnalyticsIcon from '@mui/icons-material/Analytics';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import GavelIcon from '@mui/icons-material/Gavel';

export default function WhySanad() {
    const t = useTranslations("WhySanad");

    const items = t.raw("items") as { title: string; description: string }[];

    const icons = [
        <AnalyticsIcon key={0} sx={{ fontSize: 45, color: "#C29B40" }} />,
        <AccountBalanceIcon key={1} sx={{ fontSize: 45, color: "#C29B40" }} />,
        <PrecisionManufacturingIcon key={2} sx={{ fontSize: 45, color: "#C29B40" }} />,
        <GavelIcon key={3} sx={{ fontSize: 45, color: "#C29B40" }} />
    ];

    return (
        <Box sx={{ py: { xs: 10, md: 15 }, bgcolor: "#ffffff" }}>
            <Container maxWidth="xl">
                <Typography
                    variant="h3"
                    sx={{
                        fontWeight: 800,
                        color: "#154278",
                        mb: 8,
                        textAlign: "center",
                        fontSize: { xs: "2rem", md: "3rem" }
                    }}
                >
                    {t("title")}
                </Typography>

                <Grid container spacing={4}>
                    {items.map((item, index) => (
                        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                            >
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 4,
                                        height: '100%',
                                        bgcolor: '#f8f9fa',
                                        borderRadius: 4,
                                        border: '1px solid rgba(0,0,0,0.05)',
                                        transition: 'all 0.3s ease',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        textAlign: 'center',
                                        '&:hover': {
                                            transform: 'translateY(-10px)',
                                            boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
                                            borderColor: '#C29B40',
                                            bgcolor: 'white'
                                        }
                                    }}
                                >
                                    <Box sx={{ mb: 3 }}>
                                        {icons[index]}
                                    </Box>
                                    <Typography
                                        variant="h5"
                                        sx={{
                                            fontWeight: 700,
                                            color: "#154278",
                                            mb: 2,
                                            fontSize: '1.4rem'
                                        }}
                                    >
                                        {item.title}
                                    </Typography>
                                    <Typography
                                        variant="body1"
                                        sx={{
                                            color: "#666",
                                            lineHeight: 1.6,
                                            fontSize: '1.05rem'
                                        }}
                                    >
                                        {item.description}
                                    </Typography>
                                </Paper>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>
            </Container>
        </Box>
    );
}
