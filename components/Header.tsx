"use client";

import { useState } from "react";
import { AppBar, Toolbar, IconButton, Drawer, List, ListItem, ListItemText, Box, Container, Menu, MenuItem, Button } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/navigation";

export default function Header() {
    const t = useTranslations("Navigation");
    const tCommon = useTranslations("Common"); // For 'Projects', 'In Progress'
    const tSanad = useTranslations("SanadZayed"); // For 'Sanad Zayed' title
    const tFarms = useTranslations("SanadFarms"); // For 'Sanad Farms' title
    const tAlNasr = useTranslations("AlNasrFactory"); // For 'Al Nasr' title
    const tAlNasrInterlock = useTranslations("AlNasrInterlock"); // For 'Al Nasr Interlock' title
    const locale = useLocale();
    const isRtl = locale === 'ar';
    const [mobileOpen, setMobileOpen] = useState(false);
    const [projectsAnchor, setProjectsAnchor] = useState<null | HTMLElement>(null);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleProjectsClick = (event: React.MouseEvent<HTMLElement>) => {
        setProjectsAnchor(event.currentTarget);
    };

    const handleProjectsClose = () => {
        setProjectsAnchor(null);
    };

    const navItems = [
        { label: t("home"), href: "/" },
        { label: t("milestoneRight"), href: "/milestone-right" },
        // Projects handled separately
        { label: t("about"), href: "/about" },
        { label: t("dashboard"), href: "#" },
        { label: t("contact"), href: "#" },
    ];

    const drawer = (
        <Box onClick={handleDrawerToggle} sx={{ textAlign: "center" }}>
            <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                <img src="/images/Logo.png" alt="Sanad" style={{ height: '40px', width: 'auto' }} />
            </Box>
            <List>
                <ListItem disablePadding>
                    <Link href="/" passHref style={{ width: '100%', textDecoration: 'none', color: 'inherit' }}>
                        <ListItemText primary={t("home")} sx={{ textAlign: 'center', fontFamily: isRtl ? 'var(--font-cairo)' : 'inherit' }} />
                    </Link>
                </ListItem>

                {/* Mobile Projects Section */}
                <ListItem>
                    <ListItemText primary={tCommon("projects")} sx={{ textAlign: 'center', fontWeight: 'bold', color: '#154278', fontFamily: isRtl ? 'var(--font-cairo)' : 'inherit' }} />
                </ListItem>
                <ListItem disablePadding sx={{ pl: 4 }}>
                    <Link href="/projects/sanad-zayed" passHref style={{ width: '100%', textDecoration: 'none', color: 'inherit' }}>
                        <ListItemText primary={tSanad("title")} sx={{ textAlign: 'center', fontSize: '0.9rem', fontFamily: isRtl ? 'var(--font-cairo)' : 'inherit' }} />
                    </Link>
                </ListItem>

                <ListItem>
                    <ListItemText primary={tCommon("operating")} sx={{ textAlign: 'center', fontWeight: 'bold', color: '#154278', fontFamily: isRtl ? 'var(--font-cairo)' : 'inherit' }} />
                </ListItem>
                <ListItem disablePadding sx={{ pl: 4 }}>
                    <Link href="/projects/sanad-farms" passHref style={{ width: '100%', textDecoration: 'none', color: 'inherit' }}>
                        <ListItemText primary={tFarms("title")} sx={{ textAlign: 'center', fontSize: '0.9rem', fontFamily: isRtl ? 'var(--font-cairo)' : 'inherit' }} />
                    </Link>
                </ListItem>
                <ListItem disablePadding sx={{ pl: 4 }}>
                    <Link href="/projects/al-nasr-factory" passHref style={{ width: '100%', textDecoration: 'none', color: 'inherit' }}>
                        <ListItemText primary={tAlNasr("title")} sx={{ textAlign: 'center', fontSize: '0.9rem', fontFamily: isRtl ? 'var(--font-cairo)' : 'inherit' }} />
                    </Link>
                </ListItem>
                <ListItem disablePadding sx={{ pl: 4 }}>
                    <Link href="/projects/al-nasr-interlock" passHref style={{ width: '100%', textDecoration: 'none', color: 'inherit' }}>
                        <ListItemText primary={tAlNasrInterlock("title")} sx={{ textAlign: 'center', fontSize: '0.9rem', fontFamily: isRtl ? 'var(--font-cairo)' : 'inherit' }} />
                    </Link>
                </ListItem>

                {navItems.slice(1).map((item) => (
                    <ListItem key={item.label} disablePadding>
                        <Link href={item.href} passHref style={{ width: '100%', textDecoration: 'none', color: 'inherit' }}>
                            <ListItemText
                                primary={item.label}
                                sx={{
                                    textAlign: 'center',
                                    fontFamily: isRtl ? 'var(--font-cairo)' : 'inherit'
                                }}
                            />
                        </Link>
                    </ListItem>
                ))}
            </List>
        </Box>
    );

    return (
        <AppBar position="fixed" sx={{ backgroundColor: "rgba(209, 208, 198, 0.5)", backdropFilter: "blur(12px)", color: "#154278", boxShadow: 'none', width: '100%', zIndex: 1100 }}>
            <Container maxWidth="xl">
                <Toolbar disableGutters>
                    <Box sx={{ flexGrow: 1, display: { xs: "flex", md: "none" } }}>
                        <IconButton
                            size="large"
                            aria-label="open drawer"
                            edge="start"
                            onClick={handleDrawerToggle}
                            color="inherit"
                        >
                            <MenuIcon />
                        </IconButton>
                    </Box>

                    <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" }, alignItems: 'center', justifyContent: 'space-between' }}>
                        <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
                            <img src="/images/Logo.png" alt="Sanad" style={{ height: '50px', width: 'auto' }} />
                        </Link>
                        <Box sx={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <Link href="/" style={{ textDecoration: 'none', color: '#154278', fontWeight: isRtl ? 700 : 500, fontFamily: isRtl ? 'var(--font-cairo)' : 'inherit', fontSize: isRtl ? '1.1rem' : '1rem' }}>
                                {t("home")}
                            </Link>

                            {/* Projects Dropdown */}
                            <Box>
                                <Button
                                    onClick={handleProjectsClick}
                                    endIcon={<KeyboardArrowDownIcon />}
                                    sx={{
                                        color: '#154278',
                                        fontWeight: isRtl ? 700 : 500,
                                        fontFamily: isRtl ? 'var(--font-cairo)' : 'inherit',
                                        fontSize: isRtl ? '1.1rem' : '1rem',
                                        textTransform: 'none',
                                        p: 0,
                                        '&:hover': { backgroundColor: 'transparent', textDecoration: 'none' }
                                    }}
                                >
                                    {tCommon("projects")}
                                </Button>
                                <Menu
                                    anchorEl={projectsAnchor}
                                    open={Boolean(projectsAnchor)}
                                    onClose={handleProjectsClose}
                                    PaperProps={{
                                        sx: {
                                            mt: 1,
                                            backgroundColor: "#d1d0c6",
                                            color: "#154278",
                                            minWidth: 200
                                        }
                                    }}
                                >
                                    <Box sx={{ px: 2, py: 1, fontWeight: 'bold', fontSize: '0.85rem', opacity: 0.7, fontFamily: isRtl ? 'var(--font-cairo)' : 'inherit' }}>
                                        {tCommon("inProgress")}
                                    </Box>
                                    <MenuItem onClick={handleProjectsClose} component={Link} href="/projects/sanad-zayed">
                                        <Box sx={{ fontFamily: isRtl ? 'var(--font-cairo)' : 'inherit' }}>
                                            {tSanad("title")}
                                        </Box>
                                    </MenuItem>

                                    <Box sx={{ px: 2, py: 1, mt: 1, borderTop: '1px solid rgba(21, 66, 120, 0.1)', fontWeight: 'bold', fontSize: '0.85rem', opacity: 0.7, fontFamily: isRtl ? 'var(--font-cairo)' : 'inherit' }}>
                                        {tCommon("operating")}
                                    </Box>
                                    <MenuItem onClick={handleProjectsClose} component={Link} href="/projects/sanad-farms">
                                        <Box sx={{ fontFamily: isRtl ? 'var(--font-cairo)' : 'inherit' }}>
                                            {tFarms("title")}
                                        </Box>
                                    </MenuItem>
                                    <MenuItem onClick={handleProjectsClose} component={Link} href="/projects/al-nasr-factory">
                                        <Box sx={{ fontFamily: isRtl ? 'var(--font-cairo)' : 'inherit' }}>
                                            {tAlNasr("title")}
                                        </Box>
                                    </MenuItem>
                                    <MenuItem onClick={handleProjectsClose} component={Link} href="/projects/al-nasr-interlock">
                                        <Box sx={{ fontFamily: isRtl ? 'var(--font-cairo)' : 'inherit' }}>
                                            {tAlNasrInterlock("title")}
                                        </Box>
                                    </MenuItem>
                                </Menu>
                            </Box>

                            {navItems.slice(1).map((item) => (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    style={{
                                        textDecoration: 'none',
                                        color: '#154278',
                                        fontWeight: isRtl ? 700 : 500,
                                        fontFamily: isRtl ? 'var(--font-cairo)' : 'inherit',
                                        fontSize: isRtl ? '1.1rem' : '1rem'
                                    }}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </Box>
                    </Box>

                    {/* Language Switcher Removed */}
                </Toolbar>
            </Container>
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{
                    keepMounted: true,
                }}
                sx={{
                    display: { xs: "block", md: "none" },
                    "& .MuiDrawer-paper": { boxSizing: "border-box", width: 240, backgroundColor: "#d1d0c6" },
                }}
            >
                {drawer}
            </Drawer>
        </AppBar>
    );
}
