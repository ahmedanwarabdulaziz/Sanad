"use client";

import { Box, Container, Typography, Stack, Grid } from "@mui/material";
import { useTranslations } from "next-intl";
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AssessmentIcon from '@mui/icons-material/Assessment';
import FactoryIcon from '@mui/icons-material/Factory';

export default function TrustBar() {
    const t = useTranslations("TrustBar");

    const icons = [
        <BusinessCenterIcon key="0" sx={{ color: '#C29B40' }} />,
        <AccountBalanceIcon key="1" sx={{ color: '#C29B40' }} />,
        <AssessmentIcon key="2" sx={{ color: '#C29B40' }} />,
        <FactoryIcon key="3" sx={{ color: '#C29B40' }} />
    ];

    const items = t.raw("items") as string[];

    return (
        <Box
            sx={{
                bgcolor: "#ffffff",
                py: { xs: 4, md: 6 },
                borderBottom: '1px solid rgba(0,0,0,0.05)',
                position: 'relative',
                zIndex: 10
            }}
        >
            <Container maxWidth="xl">
                <Stack
                    spacing={4}
                    alignItems="center"
                >
                    <Typography
                        variant="h5"
                        sx={{
                            fontWeight: 700,
                            color: "#154278",
                            textAlign: "center",
                            fontSize: { xs: "1.4rem", md: "1.8rem" }
                        }}
                    >
                        {t("title")}
                    </Typography>

                    <Grid container spacing={4} justifyContent="center">
                        {items.map((item, index) => (
                            <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={index}>
                                <Stack
                                    direction="row"
                                    spacing={1.5}
                                    alignItems="center"
                                    sx={{
                                        p: 2,
                                        height: '100%',
                                        bgcolor: 'rgba(21, 66, 120, 0.02)',
                                        borderRadius: 2,
                                        border: '1px solid rgba(21, 66, 120, 0.05)',
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            transform: 'translateY(-3px)',
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                                            bgcolor: 'rgba(21, 66, 120, 0.04)'
                                        }
                                    }}
                                >
                                    {icons[index]}
                                    <Typography
                                        sx={{
                                            fontWeight: 500,
                                            color: "#333",
                                            fontSize: '0.95rem',
                                            lineHeight: 1.4
                                        }}
                                    >
                                        {item}
                                    </Typography>
                                </Stack>
                            </Grid>
                        ))}
                    </Grid>
                </Stack>
            </Container>
        </Box>
    );
}
