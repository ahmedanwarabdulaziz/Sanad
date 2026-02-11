"use client";

import { Box, Container, Typography, Grid, Paper } from "@mui/material";
import { motion } from "framer-motion";
import BusinessIcon from '@mui/icons-material/Business';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import FactoryIcon from '@mui/icons-material/Factory';
import ConstructionIcon from '@mui/icons-material/Construction';

interface SectorCard {
    title: string;
    description: string;
    icon: React.ReactNode;
}

interface AboutSectorsProps {
    data: {
        title: string;
        sectors: {
            title: string;
            description: string;
        }[];
    };
}

export default function AboutSectors({ data }: AboutSectorsProps) {
    const icons = [
        <BusinessIcon key={0} sx={{ fontSize: 45, color: "inherit" }} />,
        <AgricultureIcon key={1} sx={{ fontSize: 45, color: "inherit" }} />,
        <FactoryIcon key={2} sx={{ fontSize: 45, color: "inherit" }} />,
        <ConstructionIcon key={3} sx={{ fontSize: 45, color: "inherit" }} />
    ];

    return (
        <Box sx={{ py: 12, backgroundColor: "#f0f2f5" }}>
            <Container maxWidth="lg">
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
                            textAlign: "center",
                            fontSize: { xs: "2rem", md: "2.5rem" },
                            fontFamily: "var(--font-playfair-display)"
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
                        {data.sectors.map((sector, index) => (
                            <Box
                                key={index}
                                sx={{
                                    flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 20%' },
                                    minWidth: { md: '250px' },
                                    display: 'flex'
                                }}
                            >
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1, duration: 0.5 }}
                                    style={{ height: '100%', width: '100%', display: 'flex' }}
                                >
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 4,
                                            height: "100%",
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            textAlign: "center",
                                            borderRadius: 3,
                                            backgroundColor: "#ffffff",
                                            border: "1px solid rgba(21, 66, 120, 0.1)",
                                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                            "&:hover": {
                                                boxShadow: "0 15px 35px rgba(21, 66, 120, 0.1)",
                                                transform: "translateY(-10px)",
                                                borderColor: "#154278",
                                                "& .icon-box": {
                                                    backgroundColor: "#154278",
                                                    color: "#ffffff"
                                                }
                                            }
                                        }}
                                    >
                                        <Box
                                            className="icon-box"
                                            sx={{
                                                mb: 3,
                                                p: 2,
                                                borderRadius: "50%",
                                                backgroundColor: "rgba(21, 66, 120, 0.05)",
                                                color: "#154278",
                                                transition: "all 0.3s ease",
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            {icons[index]}
                                        </Box>
                                        <Typography
                                            variant="h6"
                                            sx={{
                                                fontWeight: "bold",
                                                mb: 2,
                                                color: "#154278",
                                                fontSize: "1.2rem",
                                                lineHeight: 1.4
                                            }}
                                        >
                                            {sector.title}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: "#666",
                                                lineHeight: 1.8,
                                                fontSize: "0.95rem"
                                            }}
                                        >
                                            {sector.description}
                                        </Typography>
                                    </Paper>
                                </motion.div>
                            </Box>
                        ))}
                    </Box>
                </motion.div>
            </Container>
        </Box>
    );
}
