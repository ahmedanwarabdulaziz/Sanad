"use client";

import { Box, Container, Typography, List, ListItem, ListItemIcon, ListItemText, Paper } from "@mui/material";
import { motion } from "framer-motion";
import StorageIcon from '@mui/icons-material/Storage';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SecurityIcon from '@mui/icons-material/Security';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface MilestoneDatabaseProps {
    data: {
        title: string;
        subtitle: string;
        description: string;
        whatInvestorSees: {
            title: string;
            items: string[];
        };
        disclosureLevels: {
            title: string;
            levels: string[];
        };
    };
}

export default function MilestoneDatabase({ data }: MilestoneDatabaseProps) {
    return (
        <Box dir="rtl" sx={{ py: 12, backgroundColor: "#ffffff", textAlign: "left" }}>
            <Container maxWidth="lg">
                {/* Title and Description */}
                <Box sx={{ textAlign: "left", mb: 8 }}>
                    <Typography
                        variant="h3"
                        dir="rtl"
                        sx={{
                            fontWeight: "bold",
                            color: "#154278",
                            textAlign: "left",
                            fontSize: { xs: "1.75rem", md: "2.5rem" },
                            mb: 3
                        }}
                    >
                        {data.title}
                    </Typography>
                    <Typography
                        variant="h5"
                        dir="rtl"
                        sx={{
                            fontWeight: "600",
                            color: "#333",
                            textAlign: "left",
                            fontSize: { xs: "1.2rem", md: "1.5rem" },
                            mb: 3
                        }}
                    >
                        {data.subtitle}
                    </Typography>
                    <Typography
                        variant="body1"
                        dir="rtl"
                        sx={{
                            color: "#555",
                            textAlign: "left",
                            fontSize: "1.1rem",
                            lineHeight: 1.8
                        }}
                    >
                        {data.description}
                    </Typography>
                </Box>

                {/* Two Column Layout */}
                <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                    {/* What Investor Sees */}
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
                                    bgcolor: "#f8f9fa",
                                    border: "2px solid #e0e0e0",
                                    transition: "all 0.3s ease",
                                    "&:hover": {
                                        boxShadow: "0 8px 30px rgba(21, 66, 120, 0.12)",
                                        borderColor: "#154278"
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
                                        <VisibilityIcon sx={{ fontSize: 40, color: "#154278" }} />
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
                                        {data.whatInvestorSees.title}
                                    </Typography>
                                </Box>

                                <List sx={{ flexGrow: 1 }}>
                                    {data.whatInvestorSees.items.map((item, index) => (
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

                    {/* Disclosure Levels */}
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
                                    bgcolor: "#f8f9fa",
                                    border: "2px solid #e0e0e0",
                                    transition: "all 0.3s ease",
                                    "&:hover": {
                                        boxShadow: "0 8px 30px rgba(21, 66, 120, 0.12)",
                                        borderColor: "#154278"
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
                                        <SecurityIcon sx={{ fontSize: 40, color: "#154278" }} />
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
                                        {data.disclosureLevels.title}
                                    </Typography>
                                </Box>

                                <List sx={{ flexGrow: 1 }}>
                                    {data.disclosureLevels.levels.map((level, index) => (
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
                                                primary={level}
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
