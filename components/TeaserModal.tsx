"use client";

import { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    IconButton,
    Typography,
    Box,
    useMediaQuery,
    useTheme,
    Radio,
    RadioGroup,
    FormControlLabel,
    FormControl,
    FormLabel
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslations, useLocale } from 'next-intl';

interface TeaserModalProps {
    open: boolean;
    onClose: () => void;
    projectName?: string;
}

export default function TeaserModal({ open, onClose, projectName }: TeaserModalProps) {
    const t = useTranslations("Contact");
    const locale = useLocale();
    const isRtl = locale === 'ar';
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const [formValues, setFormValues] = useState({
        name: '',
        email: '',
        phone: '',
        deliveryMethod: 'email'
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormValues(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        if (!formValues.name || !formValues.email || !formValues.phone) {
            alert(isRtl ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill all required fields");
            return;
        }

        setIsSubmitting(true);
        setSubmitStatus('idle');

        try {
            const formData = new FormData();
            formData.append('requestType', 'teaser_request');
            formData.append('name', formValues.name);
            formData.append('email', formValues.email);
            formData.append('phone', formValues.phone);
            formData.append('deliveryMethod', formValues.deliveryMethod);
            if (projectName) formData.append('projectName', projectName);
            formData.append('message', `Teaser Request for ${projectName || 'Project'}. Preferred delivery: ${formValues.deliveryMethod}`);
            formData.append('privacyAgreed', 'true');

            const response = await fetch('/api/contact', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Failed to submit');

            setSubmitStatus('success');
            setTimeout(() => {
                onClose();
                setFormValues({ name: '', email: '', phone: '', deliveryMethod: 'email' });
                setSubmitStatus('idle');
            }, 2000);

        } catch (error) {
            console.error(error);
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputStyles = {
        '& .MuiOutlinedInput-root': {
            backgroundColor: '#f9f9f9',
            borderRadius: 2,
            '& fieldset': { borderColor: '#e0e0e0' },
            '&:hover fieldset': { borderColor: '#C29B40' },
            '&.Mui-focused fieldset': { borderColor: '#154278' },
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullScreen={fullScreen}
            maxWidth="xs"
            fullWidth
            dir={isRtl ? 'rtl' : 'ltr'}
            PaperProps={{ sx: { borderRadius: fullScreen ? 0 : 3 } }}
        >
            <Box sx={{ bgcolor: '#154278', p: 2, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#d1d0c6' }}>
                    {t('teaser.title')}
                </Typography>
                <IconButton onClick={onClose} sx={{ color: 'white' }}><CloseIcon /></IconButton>
            </Box>

            <DialogContent sx={{ p: 3 }}>
                <Typography variant="body2" sx={{ mb: 3, color: '#666', lineHeight: 1.6 }}>
                    {t('teaser.subtitle')}
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                        label={t('fields.phone')}
                        name="phone"
                        value={formValues.phone}
                        onChange={handleChange}
                        required
                        sx={inputStyles}
                    />

                    <FormControl sx={{ mt: 1 }}>
                        <FormLabel sx={{ color: '#154278', fontWeight: 'bold', mb: 1, fontSize: '0.9rem' }}>
                            {t('teaser.deliveryMethod')}
                        </FormLabel>
                        <RadioGroup
                            row
                            name="deliveryMethod"
                            value={formValues.deliveryMethod}
                            onChange={handleChange}
                        >
                            <FormControlLabel value="email" control={<Radio sx={{ color: '#C29B40', '&.Mui-checked': { color: '#C29B40' } }} />} label={t('teaser.email')} />
                            <FormControlLabel value="whatsapp" control={<Radio sx={{ color: '#C29B40', '&.Mui-checked': { color: '#C29B40' } }} />} label={t('teaser.whatsapp')} />
                        </RadioGroup>
                    </FormControl>

                    <Typography variant="caption" sx={{ color: '#999', fontStyle: 'italic' }}>
                        {t('teaser.mandatoryNote')}
                    </Typography>
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 3, bgcolor: '#fcfcfc' }}>
                <Button
                    fullWidth
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={isSubmitting}
                    sx={{
                        bgcolor: submitStatus === 'success' ? 'green' : (submitStatus === 'error' ? 'red' : '#154278'),
                        color: 'white',
                        py: 1.5,
                        borderRadius: 50,
                        fontWeight: 'bold',
                        '&:hover': { bgcolor: '#0f3057' }
                    }}
                >
                    {isSubmitting ? t('sending') : (submitStatus === 'success' ? t('sentString') : (submitStatus === 'error' ? t('errorString') : t('teaser.submit')))}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
