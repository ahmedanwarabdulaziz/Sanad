import { createTheme } from '@mui/material/styles';
import { Cairo, Tajawal, Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({
    subsets: ["latin"],
    display: 'swap',
});

const cairo = Cairo({
    subsets: ["arabic"],
    display: 'swap',
});

const tajawal = Tajawal({
    subsets: ["arabic"],
    weight: ["200", "300", "400", "500", "700", "800", "900"],
    display: 'swap',
});

const theme = createTheme({
    direction: 'rtl', // Global RTL direction
    typography: {
        fontFamily: cairo.style.fontFamily, // Default font for body
        h1: { fontFamily: cairo.style.fontFamily, fontWeight: 700 }, // Arabic Headings
        h2: { fontFamily: cairo.style.fontFamily, fontWeight: 700 },
        h3: { fontFamily: cairo.style.fontFamily, fontWeight: 700 },
        h4: { fontFamily: cairo.style.fontFamily, fontWeight: 700 },
        h5: { fontFamily: tajawal.style.fontFamily, fontWeight: 700 },
        h6: { fontFamily: tajawal.style.fontFamily, fontWeight: 600 },
        subtitle1: { fontFamily: cairo.style.fontFamily },
        caption: { fontFamily: cairo.style.fontFamily },
    },
    palette: {
        primary: {
            main: '#154278',
        },
        secondary: {
            main: '#d1d0c6',
        },
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                html: { direction: 'rtl', textAlign: 'right' },
                body: { direction: 'rtl', textAlign: 'right' },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    fontFamily: cairo.style.fontFamily
                }
            }
        },
        MuiTypography: {
            styleOverrides: {
                root: {
                    textAlign: 'inherit',
                }
            }
        },
        MuiInputBase: {
            styleOverrides: {
                input: { textAlign: 'right' },
            },
        },
        MuiAlert: {
            styleOverrides: {
                root: {
                    direction: 'ltr',
                    fontFamily: cairo.style.fontFamily,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '24px',
                    
                    // Floating configuration
                    position: 'fixed',
                    top: '24px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 9999,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    minWidth: '320px',
                    backdropFilter: 'blur(8px)',

                    "& .MuiAlert-icon": { margin: 0, padding: 0 },
                    "& .MuiAlert-action": { margin: 0, padding: 0 },
                    "& .MuiAlert-message": { textAlign: 'left', flexGrow: 1, padding: '8px 0' }
                }
            }
        },
    }
});

export default theme;
