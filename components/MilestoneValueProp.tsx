"use client";

import { Box, Container, Typography } from "@mui/material";
import { motion } from "framer-motion";
import AssessmentIcon from '@mui/icons-material/Assessment';
import TimelineIcon from '@mui/icons-material/Timeline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import HandshakeIcon from '@mui/icons-material/Handshake';

interface MilestoneValuePropProps {
    data: {
        title: string;
        benefits: string[];
    };
}

export default function MilestoneValueProp({ data }: MilestoneValuePropProps) {
    const icons = [
        <AssessmentIcon sx={{ fontSize: 50, color: "#ffffff" }} key={0} />,
        <TimelineIcon sx={{ fontSize: 50, color: "#ffffff" }} key={1} />,
        <VisibilityIcon sx={{ fontSize: 50, color: "#ffffff" }} key={2} />,
        <VerifiedUserIcon sx={{ fontSize: 50, color: "#ffffff" }} key={3} />,
        <HandshakeIcon sx={{ fontSize: 50, color: "#ffffff" }} key={4} />
    ];

    return (
        <Box
            dir="rtl"
            sx={{
                py: 15,
                background: "linear-gradient(135deg, #154278 0%, #0d2d4f 100%)",
                position: "relative",
                overflow: "hidden",
                "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "radial-gradient(circle at 20% 50%, rgba(194, 155, 64, 0.1) 0%, transparent 50%)",
                    pointerEvents: "none"
                }
            }}
        >
            <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
                {/* Title */}
                <motion.div
                    initial={{ opacity: 0, y: -30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <Box sx={{ textAlign: "center", mb: 10 }}>
                        <Typography
                            variant="h2"
                            dir="rtl"
                            sx={{
                                fontWeight: "bold",
                                color: "#ffffff",
                                textAlign: "center",
                                fontSize: { xs: "2rem", md: "3rem" },
                                mb: 2,
                                textShadow: "0 2px 10px rgba(0,0,0,0.3)"
                            }}
                        >
                            {data.title}
                        </Typography>
                        <Box
                            sx={{
                                width: 100,
                                height: 4,
                                bgcolor: "#C29B40",
                                mx: "auto",
                                borderRadius: 2
                            }}
                        />
                    </Box>
                </motion.div>

                {/* Benefits Grid */}
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                        gap: 4
                    }}
                >
                    {data.benefits.map((benefit, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.8 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1, duration: 0.5 }}
                        >
                            <Box
                                sx={{
                                    height: "100%",
                                    p: 4,
                                    borderRadius: 3,
                                    bgcolor: "rgba(255, 255, 255, 0.1)",
                                    backdropFilter: "blur(10px)",
                                    border: "1px solid rgba(255, 255, 255, 0.2)",
                                    textAlign: "center",
                                    transition: "all 0.3s ease",
                                    "&:hover": {
                                        bgcolor: "rgba(255, 255, 255, 0.15)",
                                        transform: "translateY(-8px)",
                                        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.3)"
                                    }
                                }}
                            >
                                {/* Icon */}
                                <Box
                                    sx={{
                                        mb: 3,
                                        display: "flex",
                                        justifyContent: "center"
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 90,
                                            height: 90,
                                            borderRadius: "50%",
                                            bgcolor: "rgba(194, 155, 64, 0.2)",
                                            border: "2px solid #C29B40",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            transition: "all 0.3s ease",
                                            "&:hover": {
                                                bgcolor: "#C29B40",
                                                transform: "rotate(360deg)"
                                            }
                                        }}
                                    >
                                        {icons[index]}
                                    </Box>
                                </Box>

                                {/* Benefit Text */}
                                <Typography
                                    variant="h6"
                                    dir="rtl"
                                    sx={{
                                        color: "#ffffff",
                                        textAlign: "center",
                                        fontSize: "1.1rem",
                                        lineHeight: 1.7,
                                        fontWeight: 600
                                    }}
                                >
                                    {benefit}
                                </Typography>
                            </Box>
                        </motion.div>
                    ))}
                </Box>
            </Container >
        </Box >
    );
}
