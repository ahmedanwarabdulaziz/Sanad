import type { Metadata } from "next";
import { Playfair_Display, Cairo, Tajawal } from "next/font/google";
import "../globals.css";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ThemeRegistry from "@/components/ThemeRegistry/ThemeRegistry";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair-display",
});

const cairo = Cairo({
  subsets: ["arabic"],
  variable: "--font-cairo",
});

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["200", "300", "400", "500", "700", "800", "900"],
  variable: "--font-tajawal",
});

export const metadata: Metadata = {
  title: "Sanad Investment",
  description: "Empowering Your Future",
};

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const messages = await getMessages();

  // Force Arabic/RTL globally as it's the sole supported language
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${playfair.variable} ${cairo.variable} ${tajawal.variable} font-sans antialiased`}>
        <NextIntlClientProvider messages={messages} locale="ar">
          <ThemeRegistry>
            <Header />
            {children}
            <Footer />
          </ThemeRegistry>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
