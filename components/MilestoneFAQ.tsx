"use client";

import { Box, Container, Typography, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import { motion } from "framer-motion";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface FAQItem {
    question: string;
    answer: string;
}

interface MilestoneFAQProps {
    data: {
        title: string;
        faqs: FAQItem[];
    };
}

export default function MilestoneFAQ({ data }: MilestoneFAQProps) {
    return (
        <Box sx={{ py: 10, backgroundColor: "#ffffff" }}>
            <Container maxWidth="md">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <Typography variant="h4" sx={{ fontWeight: "bold", mb: 6, color: "#154278", textAlign: "center" }}>
                        {data.title}
                    </Typography>

                    <Box>
                        {data.faqs.map((item, index) => (
                            <Accordion
                                key={index}
                                elevation={0}
                                sx={{
                                    mb: 2,
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '8px !important',
                                    '&:before': { display: 'none' },
                                    overflow: 'hidden'
                                }}
                            >
                                <AccordionSummary
                                    expandIcon={<ExpandMoreIcon sx={{ color: '#154278' }} />}
                                    aria-controls={`panel${index}-content`}
                                    id={`panel${index}-header`}
                                    sx={{
                                        backgroundColor: '#f9f9f9',
                                        '&.Mui-expanded': { minHeight: '48px' }
                                    }}
                                >
                                    <Typography sx={{ fontWeight: 600, color: '#154278' }}>
                                        {item.question}
                                    </Typography>
                                </AccordionSummary>
                                <AccordionDetails sx={{ borderTop: '1px solid #e0e0e0', p: 3 }}>
                                    <Typography sx={{ color: '#555', lineHeight: 1.6 }}>
                                        {item.answer}
                                    </Typography>
                                </AccordionDetails>
                            </Accordion>
                        ))}
                    </Box>
                </motion.div>
            </Container>
        </Box>
    );
}
