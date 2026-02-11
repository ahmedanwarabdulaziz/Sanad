"use client";

import { Box, Container, Typography, Grid, Paper, List, ListItem, ListItemIcon, ListItemText } from "@mui/material";
import { motion } from "framer-motion";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BalanceIcon from '@mui/icons-material/Balance';
import AssignmentIcon from '@mui/icons-material/Assignment';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

interface MilestoneReassuranceProps {
    data: {
        title: string;
        points: {
            fairness: { title: string; subtitle?: string; items: string[] };
            clarity: { title: string; subtitle?: string; items: string[] };
            transparency: { title: string; subtitle?: string; items: string[] };
        };
    };
}

export default function MilestoneReassurance({ data }: MilestoneReassuranceProps) {
    const items = Object.values(data.points);
    const icons = [
        <BalanceIcon sx={{ fontSize: 40, color: "#154278" }} key={0} />,
        <AssignmentIcon sx={{ fontSize: 40, color: "#154278" }} key={1} />,
        <VerifiedUserIcon sx={{ fontSize: 40, color: "#154278" }} key={2} />
    ];

    return (
        <Box dir="rtl" sx={{ py: 12, backgroundColor: "#ffffff", textAlign: "left" }}>
            <Container maxWidth="xl">
                <Box sx={{ textAlign: "left", mb: 10 }}>
                    <Typography
                        variant="h3"
                        dir="rtl"
                        sx={{
                            fontWeight: "bold",
                            color: "#154278",
                            textAlign: "left",
                            fontSize: { xs: "1.75rem", md: "2.5rem" }
                        }}
                    >
                        {data.title}
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {items.map((item, index) => (
                        <Box key={index} sx={{ flex: '1 1 calc(33.333% - 40px)', minWidth: '300px' }}>
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.15, duration: 0.6 }}
                                style={{ height: "100%" }}
                            >
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 5,
                                        height: "100%",
                                        borderRadius: 3,
                                        bgcolor: "#f8f9fa",
                                        border: "2px solid #e0e0e0",
                                        transition: "all 0.3s ease",
                                        "&:hover": {
                                            transform: "translateY(-8px)",
                                            boxShadow: "0 12px 40px rgba(21, 66, 120, 0.15)",
                                            borderColor: "#154278"
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
                                            {icons[index]}
                                        </Box>
                                        <Typography
                                            variant="h6"
                                            dir="rtl"
                                            sx={{
                                                fontWeight: "bold",
                                                color: "#154278",
                                                textAlign: "left",
                                                fontSize: "1.25rem",
                                                lineHeight: 1.3
                                            }}
                                        >
                                            {item.title}
                                        </Typography>
                                    </Box>
                                    {item.subtitle && (
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
                                            {item.subtitle}
                                        </Typography>
                                    )}
                                    <List sx={{ mt: 2 }}>
                                        {item.items.map((point, i) => (
                                            <ListItem
                                                key={i}
                                                disableGutters
                                                sx={{
                                                    alignItems: 'flex-start',
                                                    mb: 1.5,
                                                    pl: 0
                                                }}
                                            >
                                                <ListItemIcon sx={{ minWidth: 36, mt: 0.3 }}>
                                                    <CheckCircleIcon sx={{ fontSize: 22, color: "#2e7d32" }} />
                                                </ListItemIcon>
                                                <ListItemText
                                                    dir="rtl"
                                                    primary={point}
                                                    primaryTypographyProps={{
                                                        variant: 'body1',
                                                        color: '#444',
                                                        textAlign: 'left',
                                                        lineHeight: 1.7,
                                                        fontSize: "1rem"
                                                    }}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                </Paper>
                            </motion.div>
                        </Box>
                    ))}
                </Box>
            </Container>
        </Box>
    );
}
