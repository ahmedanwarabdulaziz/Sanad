"use client";

import { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    Grid,
    IconButton,
    Typography,
    Box,
    useMediaQuery,
    useTheme,
    Checkbox,
    FormControlLabel,
    InputAdornment
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { useTranslations, useLocale } from 'next-intl';

interface ContactModalProps {
    open: boolean;
    onClose: () => void;
}

export default function ContactModal({ open, onClose }: ContactModalProps) {
    const t = useTranslations("Contact");
    const locale = useLocale();
    const isRtl = locale === 'ar';
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

    const [formValues, setFormValues] = useState({
        requestType: '',
        name: '',
        company: '',
        jobTitle: '',
        phone: '',
        email: '',
        city: '',
        message: ''
    });

    const [files, setFiles] = useState<File[]>([]);
    const [privacyAgreed, setPrivacyAgreed] = useState(false);
    const [newsletterAgreed, setNewsletterAgreed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormValues(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (selectedFiles && selectedFiles.length > 0) {
            const newFiles = Array.from(selectedFiles);
            setFiles(prev => [...prev, ...newFiles]);
        }
    };

    const handleSubmit = async () => {
        if (!privacyAgreed) {
            alert(t('errors.privacyRequired'));
            return;
        }

        setIsSubmitting(true);
        setSubmitStatus('idle');

        try {
            const formData = new FormData();
            Object.entries(formValues).forEach(([key, value]) => {
                formData.append(key, value);
            });
            formData.append('privacyAgreed', String(privacyAgreed));
            formData.append('newsletterAgreed', String(newsletterAgreed));

            files.forEach(file => {
                formData.append('files', file);
            });

            const response = await fetch('/api/contact', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Server Error Details:', errorData);
                throw new Error(errorData.error || 'Failed to submit');
            }

            setSubmitStatus('success');
            // Reset form after delay
            setTimeout(() => {
                onClose();
                setFormValues({
                    requestType: '',
                    name: '',
                    company: '',
                    jobTitle: '',
                    phone: '',
                    email: '',
                    city: '',
                    message: ''
                });
                setFiles([]);
                setPrivacyAgreed(false);
                setNewsletterAgreed(false);
                setSubmitStatus('idle');
            }, 2000);

        } catch (error) {
            console.error(error);
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const requestTypes = [
        { value: 'investmentPartnership', label: t('requestTypes.investmentPartnership') },
        { value: 'realEstateDev', label: t('requestTypes.realEstateDev') },
        { value: 'marbleGranite', label: t('requestTypes.marbleGranite') },
        { value: 'interlockTiles', label: t('requestTypes.interlockTiles') },
        { value: 'crusherProducts', label: t('requestTypes.crusherProducts') },
        { value: 'operationalExp', label: t('requestTypes.operationalExp') },
        { value: 'other', label: t('requestTypes.other') },
    ];

    const inputStyles = {
        '& .MuiOutlinedInput-root': {
            backgroundColor: '#f9f9f9',
            borderRadius: 2,
            '& fieldset': {
                borderColor: '#e0e0e0',
                transition: 'all 0.3s ease',
            },
            '&:hover fieldset': {
                borderColor: '#C29B40',
            },
            '&.Mui-focused fieldset': {
                borderColor: '#C29B40',
                borderWidth: 2,
            },
        },
        '& .MuiInputLabel-root': {
            color: '#666',
        },
        '& .MuiInputLabel-root.Mui-focused': {
            color: '#154278',
            fontWeight: 'bold',
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullScreen={fullScreen}
            maxWidth="md"
            fullWidth
            dir={isRtl ? 'rtl' : 'ltr'}
            PaperProps={{
                sx: {
                    borderRadius: fullScreen ? 0 : 4,
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                }
            }}
        >
            {/* Header */}
            <Box sx={{
                bgcolor: '#154278',
                p: 3,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: 'white'
            }}>
                <Box>
                    <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', color: '#d1d0c6' }}>
                        {t('title')}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 0.5 }}>
                        {t('formTitle')}
                    </Typography>
                </Box>
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{
                        color: 'white',
                        bgcolor: 'rgba(255,255,255,0.1)',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </Box>

            <DialogContent sx={{ p: { xs: 2, md: 4 }, bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    {/* Request Type */}
                    <TextField
                        select
                        fullWidth
                        label={t('fields.requestType')}
                        name="requestType"
                        value={formValues.requestType}
                        onChange={handleChange}
                        required
                        sx={inputStyles}
                        variant="outlined"
                    >
                        {requestTypes.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </TextField>

                    {/* Personal Info */}
                    <TextField
                        fullWidth
                        label={t('fields.name')}
                        name="name"
                        value={formValues.name}
                        onChange={handleChange}
                        required
                        sx={inputStyles}
                    />

                    <TextField
                        fullWidth
                        label={t('fields.phone')}
                        name="phone"
                        value={formValues.phone}
                        onChange={handleChange}
                        required
                        placeholder="+20 1xxxxxxxxx"
                        sx={inputStyles}
                    />

                    <TextField
                        fullWidth
                        label={t('fields.email')}
                        name="email"
                        type="email"
                        value={formValues.email}
                        onChange={handleChange}
                        required
                        sx={inputStyles}
                    />

                    <TextField
                        fullWidth
                        label={t('fields.city')}
                        name="city"
                        value={formValues.city}
                        onChange={handleChange}
                        sx={inputStyles}
                    />

                    {/* Professional Info */}
                    <TextField
                        fullWidth
                        label={t('fields.company')}
                        name="company"
                        value={formValues.company}
                        onChange={handleChange}
                        sx={inputStyles}
                    />

                    <TextField
                        fullWidth
                        label={t('fields.jobTitle')}
                        name="jobTitle"
                        value={formValues.jobTitle}
                        onChange={handleChange}
                        sx={inputStyles}
                    />

                    {/* Message */}
                    <TextField
                        fullWidth
                        label={t('fields.message')}
                        name="message"
                        multiline
                        rows={4}
                        value={formValues.message}
                        onChange={handleChange}
                        required
                        sx={inputStyles}
                    />

                    {/* File Upload Area */}
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: '#154278' }}>
                            {t('fields.uploadLabel')}
                        </Typography>
                        <Box sx={{
                            border: '2px dashed #e0e0e0',
                            borderRadius: 2,
                            p: 3,
                            textAlign: 'center',
                            backgroundColor: '#f9f9f9',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                                borderColor: '#C29B40',
                                backgroundColor: 'rgba(194, 155, 64, 0.05)'
                            }
                        }}>
                            <input
                                accept=".pdf,.jpg,.png,.dwg"
                                style={{ display: 'none' }}
                                id="raised-button-file"
                                type="file"
                                multiple
                                onChange={handleFileChange}
                            />
                            <label htmlFor="raised-button-file" style={{ width: '100%', display: 'block', cursor: 'pointer' }}>
                                <CloudUploadIcon sx={{ fontSize: 40, color: '#C29B40', mb: 1 }} />
                                <Typography variant="body1" sx={{ color: '#555', mb: 0.5 }}>
                                    {t('fields.dragDrop')} <span style={{ color: '#154278', fontWeight: 'bold', textDecoration: 'underline' }}>{t('fields.browse')}</span>
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#999', display: 'block' }}>
                                    {t('fields.uploadNote')}
                                </Typography>
                            </label>
                            {files.length > 0 && (
                                <Box sx={{ mt: 2, textAlign: isRtl ? 'right' : 'left' }}>
                                    {files.map((file, index) => (
                                        <Typography key={index} variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#154278' }}>
                                            <AttachFileIcon fontSize="small" /> {file.name}
                                        </Typography>
                                    ))}
                                </Box>
                            )}
                        </Box>
                    </Box>

                    {/* Consent Checkboxes */}
                    <Box>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={privacyAgreed}
                                    onChange={(e) => setPrivacyAgreed(e.target.checked)}
                                    sx={{
                                        color: '#C29B40',
                                        '&.Mui-checked': { color: '#C29B40' }
                                    }}
                                />
                            }
                            label={<Typography variant="body2" sx={{ color: '#555' }}>{t('fields.privacyPolicy')}</Typography>}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={newsletterAgreed}
                                    onChange={(e) => setNewsletterAgreed(e.target.checked)}
                                    sx={{
                                        color: '#C29B40',
                                        '&.Mui-checked': { color: '#C29B40' }
                                    }}
                                />
                            }
                            label={<Typography variant="body2" sx={{ color: '#555' }}>{t('fields.newsletter')}</Typography>}
                        />
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 3, borderTop: '1px solid #eee', bgcolor: '#fcfcfc', justifyContent: 'space-between' }}>
                <Button onClick={onClose} disabled={isSubmitting} sx={{ color: '#777', fontWeight: 600 }}>
                    {t('fields.cancel')}
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={isSubmitting || !privacyAgreed}
                    sx={{
                        bgcolor: submitStatus === 'success' ? 'green' : (submitStatus === 'error' ? 'red' : '#154278'),
                        color: '#fff',
                        px: 6,
                        py: 1.5,
                        borderRadius: 50,
                        textTransform: 'none',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 14px 0 rgba(21, 66, 120, 0.39)',
                        '&:hover': {
                            bgcolor: submitStatus === 'success' ? 'darkgreen' : (submitStatus === 'error' ? 'darkred' : '#0f3057'),
                            boxShadow: '0 6px 20px rgba(21, 66, 120, 0.23)',
                        },
                        '&:disabled': {
                            bgcolor: '#ccc',
                            color: '#fff'
                        }
                    }}
                >
                    {isSubmitting ? t('sending') : (submitStatus === 'success' ? t('sentString') : (submitStatus === 'error' ? t('errorString') : t('fields.submit')))}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
