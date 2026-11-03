import { NextResponse } from 'next/server';
import {
    createMailer,
    createReference,
    MAIL_FROM_HEADER,
    storeSubmissionFiles,
    submissionsDb,
} from '@/lib/submissionStore';

const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.dwg'];

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

        if (files.some((file) => !ALLOWED_FILE_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext)))) {
            return NextResponse.json(
                { error: 'File type not allowed' },
                { status: 400 }
            );
        }

        const transporter = createMailer();

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

        const storedFiles = await storeSubmissionFiles(
            'contact',
            files.map((file, index) => ({
                name: file.name,
                type: file.type,
                content: attachments[index].content,
            }))
        );
        const { error: saveError } = await submissionsDb.from('contact_submissions').insert({
            reference: createReference('CT'),
            request_type: requestType || '',
            name,
            email,
            phone,
            company: company || '',
            job_title: jobTitle || '',
            city: city || '',
            message,
            newsletter_agreed: newsletterAgreed,
            files: storedFiles,
        });
        if (saveError) console.error('Contact submission save failed:', saveError);

        // API Email Template
        const mailOptions = {
            from: MAIL_FROM_HEADER,
            to: process.env.MAIL_FROM, // Send to self
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
        // The database and this email each keep a copy: the sender only retries if both failed.
        console.log('Sending email...');
        try {
            await transporter.sendMail(mailOptions);
            console.log('Email sent successfully');
        } catch (emailError) {
            if (saveError) throw emailError;
            console.error('Contact submission team email failed:', emailError);
        }

        return NextResponse.json({ success: true, message: 'Request received' }, { status: 200 });

    } catch (error) {
        console.error('Error sending email:', error);
        return NextResponse.json(
            { error: 'Failed to send email' },
            { status: 500 }
        );
    }
}
