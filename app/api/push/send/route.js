import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import EmailAccount from '@/models/EmailAccount';
import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const message = formData.get('message');
    const image = formData.get('image');
    const senderId = formData.get('sender');
    const selectedContacts = formData.get('selected_contacts');

    // Validation
    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!selectedContacts) {
      return NextResponse.json(
        { error: 'At least one recipient is required' },
        { status: 400 }
      );
    }

    if (!senderId) {
      return NextResponse.json(
        { error: 'Email account is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Get email account
    const emailAccount = await EmailAccount.findById(senderId);
    if (!emailAccount) {
      return NextResponse.json(
        { error: 'Email account not found' },
        { status: 404 }
      );
    }

    // Parse selected contacts
    const contactList = selectedContacts.split(',').filter(Boolean);

    if (contactList.length === 0) {
      return NextResponse.json(
        { error: 'At least one recipient is required' },
        { status: 400 }
      );
    }

    // Create transporter with Gmail SMTP (matching Flask approach)
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: emailAccount.email,
        pass: emailAccount.password,
      },
      tls: {
        rejectUnauthorized: false, // For development, set to true in production
      },
    });

    // Verify transporter connection
    try {
      await transporter.verify();
    } catch (verifyError) {
      console.error('SMTP verification failed:', verifyError);
      return NextResponse.json(
        { error: 'Failed to connect to email server. Please check your credentials.', details: verifyError.message },
        { status: 500 }
      );
    }

    // Read image if provided (matching Flask approach)
    let imageBuffer = null;
    let imageMimeType = null;
    let imageFilename = null;

    if (image && image.size > 0) {
      const arrayBuffer = await image.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
      imageMimeType = image.type || 'image/jpeg';
      imageFilename = image.name || 'image.jpg';
      
      // Validate image type
      if (!imageMimeType.startsWith('image/')) {
        return NextResponse.json(
          { error: 'Invalid image file type' },
          { status: 400 }
        );
      }
    }

    // Send emails one by one (matching Flask approach - server.sendmail in loop)
    const results = [];

    for (const contactEmail of contactList) {
      try {
        // Create mail options (nodemailer handles MIMEMultipart automatically)
        const mailOptions = {
          from: emailAccount.email,
          to: contactEmail,
          subject: 'Message with Image',
          text: message.trim(), // Text part
        };

        // Add image attachment if provided (matching Flask MIMEImage attachment)
        if (imageBuffer) {
          mailOptions.attachments = [
            {
              filename: imageFilename,
              content: imageBuffer,
              contentType: imageMimeType,
            },
          ];
        }

        // Send email
        const info = await transporter.sendMail(mailOptions);

        results.push({
          contact: contactEmail,
          status: 'success',
          messageId: info.messageId,
        });
      } catch (error) {
        console.error(`Error sending to ${contactEmail}:`, error);
        results.push({
          contact: contactEmail,
          status: 'error',
          error: error.message || 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      success: true,
      message: `Push notification sent to ${successCount} recipient(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      results,
      successCount,
      errorCount,
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
    return NextResponse.json(
      { error: 'Failed to send push notification', details: error.message },
      { status: 500 }
    );
  }
}
