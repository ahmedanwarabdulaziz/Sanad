"use client";

import { Box, Container, Link, Typography, Stack, Grid } from "@mui/material";
import { useTranslations } from "next-intl";
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import FacebookIcon from '@mui/icons-material/Facebook';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import InstagramIcon from '@mui/icons-material/Instagram';

export default function Footer() {
    const t = useTranslations("Footer");
    const year = new Date().getFullYear();

    return (
        <Box component="footer" sx={{ bgcolor: "#0a213c", color: "white", py: 8, borderTop: "4px solid #C29B40" }}>
            <Container maxWidth="xl">
                <Grid container spacing={6}>
                    {/* 1. Brand & About */}
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Box sx={{ mb: 3 }}>
                            <img src="/images/Logo.png" alt="Sanad" style={{ height: '70px', width: 'auto' }} />
                        </Box>
                        <Typography variant="body1" sx={{ opacity: 0.8, lineHeight: 1.8, maxWidth: "350px", mb: 3 }}>
                            {t("about")}
                        </Typography>
                        <Stack direction="row" spacing={2}>
                            <Link href="#" color="inherit" sx={{ opacity: 0.7, "&:hover": { opacity: 1, color: "#C29B40" } }}>
                                <FacebookIcon />
                            </Link>
                            <Link href="#" color="inherit" sx={{ opacity: 0.7, "&:hover": { opacity: 1, color: "#C29B40" } }}>
                                <LinkedInIcon />
                            </Link>
                            <Link href="#" color="inherit" sx={{ opacity: 0.7, "&:hover": { opacity: 1, color: "#C29B40" } }}>
                                <InstagramIcon />
                            </Link>
                        </Stack>
                    </Grid>

                    {/* 2. Contact Info */}
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Typography variant="h6" sx={{ mb: 3, color: "#C29B40", fontWeight: 'bold' }}>
                            {t("contact")}
                        </Typography>
                        <Stack spacing={3}>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <PhoneIcon sx={{ color: "#C29B40" }} />
                                <Box>
                                    <Typography variant="body2" dir="ltr" sx={{ opacity: 0.9, display: 'block' }}>01100994488</Typography>
                                    <Typography variant="body2" dir="ltr" sx={{ opacity: 0.9, display: 'block' }}>01000001432</Typography>
                                </Box>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                <EmailIcon sx={{ color: "#C29B40" }} />
                                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                    info@sanadproprojects.com
                                </Typography>
                            </Box>
                        </Stack>
                    </Grid>

                    {/* 3. Addresses */}
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Typography variant="h6" sx={{ mb: 3, color: "#C29B40", fontWeight: 'bold' }}>
                            {t("addresses")}
                        </Typography>
                        <Stack spacing={2}>
                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                                <LocationOnIcon sx={{ color: "#C29B40", mt: 0.5, fontSize: 20 }} />
                                <Typography variant="body2" sx={{ opacity: 0.8, lineHeight: 1.6 }}>
                                    {t("locations.assiut")}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                                <LocationOnIcon sx={{ color: "#C29B40", mt: 0.5, fontSize: 20 }} />
                                <Typography variant="body2" sx={{ opacity: 0.8, lineHeight: 1.6 }}>
                                    {t("locations.newAssiut")}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                                <LocationOnIcon sx={{ color: "#C29B40", mt: 0.5, fontSize: 20 }} />
                                <Typography variant="body2" sx={{ opacity: 0.8, lineHeight: 1.6 }}>
                                    {t("locations.october")}
                                </Typography>
                            </Box>
                        </Stack>
                    </Grid>

                    {/* 4. Quick Links */}
                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                        <Typography variant="h6" sx={{ mb: 3, color: "#C29B40", fontWeight: 'bold' }}>
                            {t("quickLinks")}
                        </Typography>
                        <Stack spacing={1.5}>
                            <Link href="/" color="inherit" underline="none" sx={{ opacity: 0.7, "&:hover": { color: "#C29B40", pl: 1, transition: "all 0.3s" } }}>
                                {t("links.home")}
                            </Link>
                            <Link href="/about" color="inherit" underline="none" sx={{ opacity: 0.7, "&:hover": { color: "#C29B40", pl: 1, transition: "all 0.3s" } }}>
                                {t("links.about")}
                            </Link>
                            <Link href="/projects" color="inherit" underline="none" sx={{ opacity: 0.7, "&:hover": { color: "#C29B40", pl: 1, transition: "all 0.3s" } }}>
                                {t("links.projects")}
                            </Link>
                            <Link href="/contact" color="inherit" underline="none" sx={{ opacity: 0.7, "&:hover": { color: "#C29B40", pl: 1, transition: "all 0.3s" } }}>
                                {t("links.contact")}
                            </Link>
                        </Stack>
                    </Grid>
                </Grid>

                <Box sx={{ mt: 8, pt: 4, borderTop: "1px solid rgba(255,255,255,0.1)", textAlign: "center", opacity: 0.6, fontSize: "0.875rem" }}>
                    {t("copyright", { year })}
                </Box>
            </Container>
        </Box>
    );
}
