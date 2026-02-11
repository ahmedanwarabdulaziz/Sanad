"use client";

import { Box, Container, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableRow } from "@mui/material";
import { motion } from "framer-motion";

interface ProjectLandDataProps {
    data: {
        title: string;
        table: {
            area: { label: string; value: string };
            usage: { label: string; value: string };
            authority: { label: string; value: string };
            requirements: { label: string; value: string };
            ratio: { label: string; value: string };
        };
        note: string;
    };
}

export default function ProjectLandData({ data }: ProjectLandDataProps) {
    const rows = [
        data.table.area,
        data.table.usage,
        data.table.authority,
        data.table.requirements,
        data.table.ratio,
    ];

    return (
        <Box sx={{ py: 10, backgroundColor: "#ffffff" }}>
            <Container maxWidth="lg">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <Typography variant="h4" sx={{ fontWeight: "bold", mb: 6, color: "#154278", textAlign: 'center' }}>
                        {data.title}
                    </Typography>

                    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: 4, overflow: 'hidden', mb: 4 }}>
                        <Table sx={{ minWidth: 650 }} aria-label="land data table">
                            <TableBody>
                                {rows.map((row, index) => (
                                    <TableRow
                                        key={index}
                                        sx={{
                                            '&:last-child td, &:last-child th': { border: 0 },
                                            backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white'
                                        }}
                                    >
                                        <TableCell component="th" scope="row" sx={{ fontWeight: 'bold', color: '#154278', width: '30%', fontSize: '1rem', py: 2.5 }}>
                                            {row.label}
                                        </TableCell>
                                        <TableCell align="left" sx={{ color: '#555', fontSize: '1.1rem', py: 2.5 }}>
                                            {row.value}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            backgroundColor: 'rgba(21, 66, 120, 0.05)',
                            borderLeft: '4px solid #154278',
                            borderRadius: '4px'
                        }}
                    >
                        <Typography variant="body2" sx={{ color: "#154278", fontWeight: 500 }}>
                            {data.note}
                        </Typography>
                    </Paper>
                </motion.div>
            </Container>
        </Box>
    );
}
