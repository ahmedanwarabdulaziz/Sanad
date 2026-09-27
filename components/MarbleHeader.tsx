"use client";

import { AppBar, Toolbar, Box, Container } from "@mui/material";
import { Link } from "@/navigation";
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

export default function MarbleHeader() {
    return (
        <AppBar position="fixed" sx={{ backgroundColor: "rgba(209, 208, 198, 0.9)", backdropFilter: "blur(12px)", color: "#154278", boxShadow: 'none', width: '100%', zIndex: 1100, borderBottom: '1px solid rgba(21, 66, 120, 0.1)' }}>
            <Container maxWidth="xl">
                <Toolbar disableGutters>
                    <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row' }}>
                        
                        {/* Logo Box - Right side (since RTL) */}
                        <Link href="/projects/marble" style={{ display: 'flex', alignItems: 'center', zIndex: 10, textDecoration: 'none' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <img src="/images/Logo.png" alt="Sanad" style={{ height: '40px', width: 'auto' }} />
                                <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#154278', fontFamily: 'var(--font-cairo)' }}>
                                    كتالوج الرخام والجرانيت
                                </span>
                            </Box>
                        </Link>

                        {/* Back to main site link - Left side */}
                        <Link 
                            href="/" 
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                textDecoration: 'none', 
                                color: '#154278', 
                                fontWeight: 700, 
                                fontFamily: 'var(--font-cairo)', 
                                fontSize: '1rem',
                                backgroundColor: 'rgba(255,255,255,0.5)',
                                padding: '8px 16px',
                                borderRadius: '24px',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.8)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.5)')}
                        >
                            <ArrowForwardIcon fontSize="small" />
                            العودة لموقع سند الرئيسي
                        </Link>

                    </Box>
                </Toolbar>
            </Container>
        </AppBar>
    );
}
