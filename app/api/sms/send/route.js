import { NextResponse } from 'next/server';
import twilio from 'twilio';

export async function POST(request) {
  try {
    const body = await request.json();
    const { message, selectedPhones, sender } = body;

    // Validation
    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!selectedPhones || selectedPhones.length === 0) {
      return NextResponse.json(
        { error: 'At least one recipient is required' },
        { status: 400 }
      );
    }

    if (!sender) {
      return NextResponse.json(
        { error: 'Twilio account is required' },
        { status: 400 }
      );
    }

    // Parse sender data: accountSid|authToken|phoneNumber|friendlyName
    const [accountSid, authToken, phoneNumber, friendlyName] = sender.split('|');

    if (!accountSid || !authToken || !phoneNumber) {
      return NextResponse.json(
        { error: 'Invalid Twilio account configuration' },
        { status: 400 }
      );
    }

    // Initialize Twilio client
    const client = twilio(accountSid, authToken);

    // Send SMS to all selected phone numbers
    const results = [];
    const phoneArray = Array.isArray(selectedPhones) ? selectedPhones : selectedPhones.split(',');

    for (const phone of phoneArray) {
      try {
        // Format phone number (add + if not present)
        const formattedPhone = phone.startsWith('+') ? phone : `+${phone.replace(/\s/g, '')}`;
        
        const messageResult = await client.messages.create({
          body: message,
          from: phoneNumber,
          to: formattedPhone,
        });

        results.push({
          phone: phone,
          status: 'success',
          sid: messageResult.sid,
        });
      } catch (error) {
        results.push({
          phone: phone,
          status: 'error',
          error: error.message,
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      success: true,
      message: `SMS sent to ${successCount} recipient(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      results,
      successCount,
      errorCount,
    });
  } catch (error) {
    console.error('Error sending SMS:', error);
    return NextResponse.json(
      { error: 'Failed to send SMS', details: error.message },
      { status: 500 }
    );
  }
}

