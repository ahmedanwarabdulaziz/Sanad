const nodemailer = require('nodemailer');

async function testSMTP() {
    console.log('Testing SMTP Connection...');

    const config = {
        host: 'smtppro.zoho.com',
        port: 465,
        secure: true,
        auth: {
            user: 'info@sanadproprojects.com',
            pass: 'Anw@r#2020'
        }
    };

    console.log('Configuration:', { ...config, auth: { user: config.auth.user, pass: '****' } });

    const transporter = nodemailer.createTransport(config);

    try {
        console.log('Verifying connection...');
        await transporter.verify();
        console.log('✅ Connection verification successful!');
    } catch (error) {
        console.error('❌ Connection verification failed:', error);
        return;
    }

    try {
        console.log('Sending test email...');
        const info = await transporter.sendMail({
            from: '"Sanad Test" <info@sanadproprojects.com>',
            to: 'info@sanadproprojects.com', // Sending to self for testing
            subject: 'Test Email from Script',
            text: 'If you receive this, SMTP is working correctly.',
            html: '<b>If you receive this, SMTP is working correctly.</b>'
        });
        console.log('✅ Email sent successfully!');
        console.log('Message ID:', info.messageId);
    } catch (error) {
        console.error('❌ Sending email failed:', error);
    }
}

testSMTP();
