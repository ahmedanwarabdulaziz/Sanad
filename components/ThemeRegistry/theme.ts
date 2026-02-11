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
                    // Ensure default alignment follows direction, though 'inherit' is standard
                    // textAlign: 'start' is usually default
                }
            }
        }
    }
});

export default theme;
