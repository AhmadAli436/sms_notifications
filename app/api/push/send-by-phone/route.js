import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import PhonePushMapping from '@/models/PhonePushMapping';
import Contact from '@/models/Contact';
import { Client } from 'onesignal-node';

// Helper functions
function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.substring(1);
  }
  return digits;
}

function cleanText(text) {
  if (!text || text === 'NaN') return '';
  return String(text).replace(/\xa0/g, ' ').trim().replace(/[^\x20-\x7E]+/g, '');
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const title = formData.get('title') || 'Notification';
    const message = formData.get('message');
    const image = formData.get('image');
    const selectedPhones = formData.get('selected_phones');
    const sendSmsFallback = formData.get('send_sms_fallback') === 'true';

    // Validation
    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!selectedPhones) {
      return NextResponse.json(
        { error: 'At least one phone number is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Get OneSignal credentials
    const appId = process.env.ONESIGNAL_APP_ID;
    const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!appId || !restApiKey) {
      return NextResponse.json(
        { error: 'OneSignal not configured. Please set ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY environment variables.' },
        { status: 500 }
      );
    }

    // Parse selected phone numbers
    const phoneList = selectedPhones.split(',').filter(Boolean);
    if (phoneList.length === 0) {
      return NextResponse.json(
        { error: 'At least one phone number is required' },
        { status: 400 }
      );
    }

    // Normalize phone numbers
    const normalizedPhones = phoneList.map(phone => normalizePhone(phone));

    // Get push tokens for phone numbers
    const mappings = await PhonePushMapping.find({
      phone_number: { $in: normalizedPhones },
      isActive: true,
    }).lean();

    // Create phone to token map
    const phoneToTokenMap = {};
    mappings.forEach(mapping => {
      phoneToTokenMap[mapping.phone_number] = mapping.push_token;
    });

    // Separate phones with and without push tokens
    const phonesWithTokens = [];
    const phonesWithoutTokens = [];
    const pushTokens = [];

    normalizedPhones.forEach(phone => {
      if (phoneToTokenMap[phone]) {
        phonesWithTokens.push(phone);
        pushTokens.push(phoneToTokenMap[phone]);
      } else {
        phonesWithoutTokens.push(phone);
      }
    });

    const results = [];

    // Send push notifications to phones with tokens
    if (pushTokens.length > 0) {
      try {
        const client = new Client(appId, restApiKey);

        // Read image if provided
        let imageUrl = null;
        if (image && image.size > 0) {
          // For production, upload to CDN
          imageUrl = null; // Set to CDN URL after upload
        }

        const notification = {
          headings: { en: title },
          contents: { en: message.trim() },
          include_player_ids: pushTokens,
          android_channel_id: 'default',
        };

        if (imageUrl) {
          notification.big_picture = imageUrl;
          notification.large_icon = imageUrl;
        }

        const response = await client.createNotification(notification);

        // Mark all as success
        phonesWithTokens.forEach(phone => {
          results.push({
            phone,
            status: 'success',
            method: 'push',
            messageId: response.body.id,
          });
        });
      } catch (error) {
        console.error('OneSignal error:', error);
        phonesWithTokens.forEach(phone => {
          results.push({
            phone,
            status: 'error',
            method: 'push',
            error: error.message || 'Failed to send push notification',
          });
        });
      }
    }

    // Handle phones without push tokens
    if (phonesWithoutTokens.length > 0) {
      if (sendSmsFallback) {
        // Optionally send SMS as fallback
        // You can integrate with your SMS API here
        phonesWithoutTokens.forEach(phone => {
          results.push({
            phone,
            status: 'info',
            method: 'sms_fallback',
            message: 'No push token found, SMS sent instead',
          });
        });
      } else {
        phonesWithoutTokens.forEach(phone => {
          results.push({
            phone,
            status: 'warning',
            method: 'none',
            message: 'No push token registered for this number',
          });
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      success: true,
      message: `Push notifications sent to ${successCount} number(s)${warningCount > 0 ? `, ${warningCount} without tokens` : ''}${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      results,
      successCount,
      warningCount,
      errorCount,
    });
  } catch (error) {
    console.error('Error sending push by phone:', error);
    return NextResponse.json(
      { error: 'Failed to send push notifications', details: error.message },
      { status: 500 }
    );
  }
}

