"use client";

import { Box, Container, Typography, List, ListItem, ListItemIcon, ListItemText, Paper } from "@mui/material";
import { motion } from "framer-motion";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LooksOneIcon from '@mui/icons-material/LooksOne';
import LooksTwoIcon from '@mui/icons-material/LooksTwo';
import Looks3Icon from '@mui/icons-material/Looks3';
import Looks4Icon from '@mui/icons-material/Looks4';

interface StepData {
    title: string;
    subtitle: string;
    items: string[];
    note?: string;
}

interface MilestoneMechanismProps {
    data: {
        title: string;
        steps: {
            "1": StepData;
            "2": StepData;
            "3": StepData;
            "4": StepData;
        };
    };
}

export default function MilestoneMechanism({ data }: MilestoneMechanismProps) {
    const steps = Object.values(data.steps);
    const icons = [
        <LooksOneIcon sx={{ fontSize: 40, color: "#154278" }} key={0} />,
        <LooksTwoIcon sx={{ fontSize: 40, color: "#154278" }} key={1} />,
        <Looks3Icon sx={{ fontSize: 40, color: "#154278" }} key={2} />,
        <Looks4Icon sx={{ fontSize: 40, color: "#154278" }} key={3} />
    ];

    return (
        <Box dir="rtl" sx={{ py: 12, backgroundColor: "#f8f9fa", textAlign: "left" }}>
            <Container maxWidth="lg">
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

                <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                    {steps.map((step, index) => (
                        <Box key={index} sx={{ flex: '1 1 calc(50% - 20px)', minWidth: '300px' }}>
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1, duration: 0.6 }}
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
                                        bgcolor: "#ffffff",
                                        border: "2px solid #e0e0e0",
                                        transition: "all 0.3s ease",
                                        "&:hover": {
                                            boxShadow: "0 8px 30px rgba(21, 66, 120, 0.12)",
                                            borderColor: "#154278"
                                        }
                                    }}
                                >
                                    {/* Step number icon and title */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                        <Box sx={{
                                            p: 1.5,
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
                                            variant="h5"
                                            dir="rtl"
                                            sx={{
                                                fontWeight: "bold",
                                                color: "#154278",
                                                textAlign: "left",
                                                fontSize: "1.4rem",
                                                lineHeight: 1.3
                                            }}
                                        >
                                            {step.title}
                                        </Typography>
                                    </Box>

                                    {/* Subtitle */}
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
                                        {step.subtitle}
                                    </Typography>

                                    {/* Items list */}
                                    <List sx={{ mt: 2, flexGrow: 1 }}>
                                        {step.items.map((item, i) => (
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
                                                    primary={item}
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

                                    {/* Note (only for step 4) */}
                                    {step.note && (
                                        <Box sx={{
                                            mt: 4,
                                            p: 3,
                                            bgcolor: 'rgba(21, 66, 120, 0.05)',
                                            borderRadius: 2,
                                            borderRight: '4px solid #154278'
                                        }}>
                                            <Typography
                                                variant="body2"
                                                dir="rtl"
                                                sx={{
                                                    color: "#154278",
                                                    textAlign: 'left',
                                                    fontWeight: 600,
                                                    fontSize: "0.95rem"
                                                }}
                                            >
                                                {step.note}
                                            </Typography>
                                        </Box>
                                    )}
                                </Paper>
                            </motion.div>
                        </Box>
                    ))}
                </Box>
            </Container>
        </Box>
    );
}
