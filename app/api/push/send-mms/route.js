import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import TwilioAccount from '@/models/TwilioAccount';
import twilio from 'twilio';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const message = formData.get('message');
    const imageUrl = formData.get('image_url'); // Public URL of uploaded image
    const senderId = formData.get('sender');
    const selectedPhones = formData.get('selected_phones');

    // Validation
    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!selectedPhones) {
      return NextResponse.json(
        { error: 'At least one recipient is required' },
        { status: 400 }
      );
    }

    if (!senderId) {
      return NextResponse.json(
        { error: 'Twilio account is required' },
        { status: 400 }
      );
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required for MMS' },
        { status: 400 }
      );
    }

    // Validate that URL is publicly accessible (not localhost)
    if (imageUrl.includes('localhost') || imageUrl.includes('127.0.0.1')) {
      return NextResponse.json(
        { 
          error: 'Image URL must be publicly accessible. Localhost URLs cannot be accessed by Twilio.',
          suggestion: 'Use ngrok or deploy to a public server. Set NEXT_PUBLIC_BASE_URL to your public URL.'
        },
        { status: 400 }
      );
    }

    await connectDB();

    // Parse sender data (can be ID or pipe-separated string)
    let accountSid, authToken, phoneNumber;
    
    if (senderId.includes('|')) {
      // Old format: accountSid|authToken|phoneNumber|friendlyName
      [accountSid, authToken, phoneNumber] = senderId.split('|');
    } else {
      // New format: MongoDB ID
      const twilioAccount = await TwilioAccount.findById(senderId);
      if (!twilioAccount) {
        return NextResponse.json(
          { error: 'Twilio account not found' },
          { status: 404 }
        );
      }
      accountSid = twilioAccount.account_sid;
      authToken = twilioAccount.auth_token;
      phoneNumber = twilioAccount.twilio_number;
    }

    // Initialize Twilio client
    const client = twilio(accountSid, authToken);

    // Parse selected phone numbers
    const phoneArray = selectedPhones.split(',').filter(Boolean);

    if (phoneArray.length === 0) {
      return NextResponse.json(
        { error: 'At least one recipient is required' },
        { status: 400 }
      );
    }

    // Verify image URL is accessible and is HTTPS (Twilio requires HTTPS)
    if (!imageUrl.startsWith('https://')) {
      return NextResponse.json(
        { error: 'Image URL must use HTTPS. Twilio requires secure URLs for MMS.' },
        { status: 400 }
      );
    }

    // Verify image URL is accessible
    try {
      const imageCheck = await fetch(imageUrl, { 
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      });
      
      if (!imageCheck.ok) {
        console.error(`Image URL check failed: ${imageUrl}, Status: ${imageCheck.status}`);
        // Don't fail here - some servers don't support HEAD, but image might still be accessible
        // We'll let Twilio handle the validation
      } else {
        console.log(`Image URL verified: ${imageUrl}`);
      }
    } catch (error) {
      console.warn(`Image URL check warning: ${error.message}. Proceeding anyway - Twilio will validate.`);
      // Don't fail - let Twilio validate the URL
    }

    // Send MMS to all selected phone numbers
    const results = [];

    for (const phone of phoneArray) {
      try {
        // Format phone number (add + if not present)
        const formattedPhone = phone.startsWith('+') ? phone : `+${phone.replace(/\s/g, '')}`;
        
        // Send MMS with media URL
        // Twilio automatically sends as MMS when mediaUrl is provided
        // mediaUrl must be an array of publicly accessible HTTPS URLs
        console.log(`Sending MMS to ${formattedPhone} with image: ${imageUrl}`);
        
        const messageResult = await client.messages.create({
          body: message.trim(),
          from: phoneNumber,
          to: formattedPhone,
          mediaUrl: [imageUrl], // Array of media URLs for MMS - must be publicly accessible HTTPS
        });
        
        console.log(`MMS sent successfully. SID: ${messageResult.sid}, Media: ${messageResult.numMedia}`);

        results.push({
          phone: phone,
          status: 'success',
          sid: messageResult.sid,
          messageType: messageResult.numMedia > 0 ? 'MMS' : 'SMS',
        });
      } catch (error) {
        console.error(`Error sending MMS to ${phone}:`, error);
        results.push({
          phone: phone,
          status: 'error',
          error: error.message || 'Unknown error',
          code: error.code,
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      success: true,
      message: `MMS sent to ${successCount} recipient(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      results,
      successCount,
      errorCount,
    });
  } catch (error) {
    console.error('Error sending MMS:', error);
    return NextResponse.json(
      { error: 'Failed to send MMS', details: error.message },
      { status: 500 }
    );
  }
}
