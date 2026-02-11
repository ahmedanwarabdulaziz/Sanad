"use client";

import { Box, Container, Typography } from "@mui/material";

interface ProjectDisclaimerProps {
    data: {
        text: string;
    };
}

export default function ProjectDisclaimer({ data }: ProjectDisclaimerProps) {
    return (
        <Box sx={{
            py: 8,
            backgroundColor: "#f8f9fa",
            borderTop: "2px solid #edeff2",
            mt: 4
        }}>
            <Container maxWidth="lg">
                <Typography
                    variant="body2"
                    sx={{
                        color: "#777",
                        textAlign: "center",
                        opacity: 1,
                        fontSize: "0.9rem",
                        lineHeight: 1.8,
                        maxWidth: "800px",
                        mx: "auto"
                    }}
                >
                    {data.text}
                </Typography>
            </Container>
        </Box>
    );
}
