import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const phone = formData.get('phone') as string;
        const message = formData.get('message') as string;
        const requestType = formData.get('requestType') as string;
        const company = formData.get('company') as string;
        const jobTitle = formData.get('jobTitle') as string;
        const city = formData.get('city') as string;
        const privacyAgreed = formData.get('privacyAgreed') === 'true';
        const newsletterAgreed = formData.get('newsletterAgreed') === 'true';

        // Files handling
        const files = formData.getAll('files') as File[];

        // Basic validation
        if (!name || !email || !phone || !message || !privacyAgreed) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Configure Nodemailer Transporter
        console.log('Configuring transporter with:', {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            user: process.env.SMTP_USER,
            secure: true
        });

        const transporter = nodemailer.createTransport({
            host: 'smtppro.zoho.com',
            port: 465,
            secure: true, // true for 465, false for other ports
            auth: {
                user: 'info@sanadproprojects.com',
                pass: 'Anw@r#2020',
            },
        });

        // Verify connection configuration
        try {
            await transporter.verify();
            console.log('SMTP Connection established');
        } catch (verifyError) {
            console.error('SMTP Connection Failed:', verifyError);
            return NextResponse.json(
                { error: 'SMTP Connection Failed', details: verifyError },
                { status: 500 }
            );
        }

        // Prepare attachments
        const attachments = await Promise.all(
            files.map(async (file) => {
                const buffer = Buffer.from(await file.arrayBuffer());
                return {
                    filename: file.name,
                    content: buffer,
                };
            })
        );

        // API Email Template
        const mailOptions = {
            from: `"Sanad Website" <${process.env.SMTP_USER}>`,
            to: process.env.SMTP_USER, // Send to self
            replyTo: email,
            subject: `New Contact Request: ${requestType} - ${name}`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                    <h2 style="color: #154278;">New Contact Form Submission</h2>
                    <p><strong>Request Type:</strong> ${requestType}</p>
                    
                    <h3 style="border-bottom: 1px solid #eee; padding-bottom: 10px;">Personal Details</h3>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Phone:</strong> ${phone}</p>
                    <p><strong>City:</strong> ${city || 'N/A'}</p>

                    <h3 style="border-bottom: 1px solid #eee; padding-bottom: 10px;">Professional Details</h3>
                    <p><strong>Company:</strong> ${company || 'N/A'}</p>
                    <p><strong>Job Title:</strong> ${jobTitle || 'N/A'}</p>

                    <h3 style="border-bottom: 1px solid #eee; padding-bottom: 10px;">Message</h3>
                    <p style="white-space: pre-wrap; background-color: #f9f9f9; padding: 15px; border-radius: 5px;">${message}</p>

                    <h3 style="border-bottom: 1px solid #eee; padding-bottom: 10px;">Consent</h3>
                    <p><strong>Privacy Policy Agreed:</strong> ${privacyAgreed ? 'Yes' : 'No'}</p>
                    <p><strong>Newsletter Subscription:</strong> ${newsletterAgreed ? 'Yes' : 'No'}</p>
                </div>
            `,
            attachments: attachments,
        };

        // Send Email
        console.log('Sending email...');
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');

        return NextResponse.json({ success: true, message: 'Email sent successfully' }, { status: 200 });

    } catch (error) {
        console.error('Error sending email:', error);
        return NextResponse.json(
            { error: 'Failed to send email', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
