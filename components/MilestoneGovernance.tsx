"use client";

import { Box, Container, Typography, List, ListItem, ListItemIcon, ListItemText, Paper } from "@mui/material";
import { motion } from "framer-motion";
import GavelIcon from '@mui/icons-material/Gavel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';

interface MilestoneGovernanceProps {
    data: {
        title: string;
        whyEssential: {
            title: string;
            subtitle: string;
            items: string[];
        };
        tools: {
            title: string;
            items: string[];
        };
    };
}

export default function MilestoneGovernance({ data }: MilestoneGovernanceProps) {
    return (
        <Box dir="rtl" sx={{ py: 12, backgroundColor: "#154278", textAlign: "left" }}>
            <Container maxWidth="lg">
                {/* Title */}
                <Box sx={{ textAlign: "left", mb: 8 }}>
                    <Typography
                        variant="h3"
                        dir="rtl"
                        sx={{
                            fontWeight: "bold",
                            color: "#ffffff",
                            textAlign: "left",
                            fontSize: { xs: "1.75rem", md: "2.5rem" }
                        }}
                    >
                        {data.title}
                    </Typography>
                </Box>

                {/* Two Column Layout */}
                <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                    {/* Why Essential */}
                    <Box sx={{ flex: '1 1 calc(50% - 20px)', minWidth: '300px' }}>
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            style={{ height: "100%" }}
                        >
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 5,
                                    height: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                    borderRadius: 3,
                                    bgcolor: "rgba(255, 255, 255, 0.95)",
                                    border: "2px solid rgba(255, 255, 255, 0.3)",
                                    transition: "all 0.3s ease",
                                    "&:hover": {
                                        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.2)",
                                        bgcolor: "#ffffff"
                                    }
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                    <Box sx={{
                                        p: 2,
                                        borderRadius: '12px',
                                        bgcolor: 'rgba(21, 66, 120, 0.08)',
                                        color: '#154278',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        <GavelIcon sx={{ fontSize: 40, color: "#154278" }} />
                                    </Box>
                                    <Typography
                                        variant="h5"
                                        dir="rtl"
                                        sx={{
                                            fontWeight: "bold",
                                            color: "#154278",
                                            textAlign: "left",
                                            fontSize: "1.4rem"
                                        }}
                                    >
                                        {data.whyEssential.title}
                                    </Typography>
                                </Box>

                                <Typography
                                    variant="body1"
                                    dir="rtl"
                                    sx={{
                                        mb: 3,
                                        color: "#555",
                                        fontWeight: 600,
                                        textAlign: "left",
                                        fontSize: "1.05rem"
                                    }}
                                >
                                    {data.whyEssential.subtitle}
                                </Typography>

                                <List sx={{ flexGrow: 1 }}>
                                    {data.whyEssential.items.map((item, index) => (
                                        <ListItem
                                            key={index}
                                            disableGutters
                                            sx={{
                                                alignItems: 'flex-start',
                                                mb: 2,
                                                pl: 0
                                            }}
                                        >
                                            <ListItemIcon sx={{ minWidth: 36, mt: 0.3 }}>
                                                <CheckCircleIcon sx={{ fontSize: 22, color: "#2e7d32" }} />
                                            </ListItemIcon>
                                            <ListItemText
                                                dir="rtl"
                                                primary={item}
                                                primaryTypographyProps={{
                                                    variant: 'body1',
                                                    color: '#444',
                                                    textAlign: 'left',
                                                    lineHeight: 1.7,
                                                    fontSize: "1rem",
                                                    fontWeight: 500
                                                }}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Paper>
                        </motion.div>
                    </Box>

                    {/* Governance Tools */}
                    <Box sx={{ flex: '1 1 calc(50% - 20px)', minWidth: '300px' }}>
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            style={{ height: "100%" }}
                        >
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 5,
                                    height: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                    borderRadius: 3,
                                    bgcolor: "rgba(255, 255, 255, 0.95)",
                                    border: "2px solid rgba(255, 255, 255, 0.3)",
                                    transition: "all 0.3s ease",
                                    "&:hover": {
                                        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.2)",
                                        bgcolor: "#ffffff"
                                    }
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                                    <Box sx={{
                                        p: 2,
                                        borderRadius: '12px',
                                        bgcolor: 'rgba(21, 66, 120, 0.08)',
                                        color: '#154278',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        <AccountBalanceIcon sx={{ fontSize: 40, color: "#154278" }} />
                                    </Box>
                                    <Typography
                                        variant="h5"
                                        dir="rtl"
                                        sx={{
                                            fontWeight: "bold",
                                            color: "#154278",
                                            textAlign: "left",
                                            fontSize: "1.4rem"
                                        }}
                                    >
                                        {data.tools.title}
                                    </Typography>
                                </Box>

                                <List sx={{ flexGrow: 1 }}>
                                    {data.tools.items.map((item, index) => (
                                        <ListItem
                                            key={index}
                                            disableGutters
                                            sx={{
                                                alignItems: 'flex-start',
                                                mb: 2,
                                                pl: 0
                                            }}
                                        >
                                            <ListItemIcon sx={{ minWidth: 36, mt: 0.3 }}>
                                                <CheckCircleIcon sx={{ fontSize: 22, color: "#2e7d32" }} />
                                            </ListItemIcon>
                                            <ListItemText
                                                dir="rtl"
                                                primary={item}
                                                primaryTypographyProps={{
                                                    variant: 'body1',
                                                    color: '#444',
                                                    textAlign: 'left',
                                                    lineHeight: 1.7,
                                                    fontSize: "1rem",
                                                    fontWeight: 500
                                                }}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Paper>
                        </motion.div>
                    </Box>
                </Box>
            </Container>
        </Box>
    );
}
