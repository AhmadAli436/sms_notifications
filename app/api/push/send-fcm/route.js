import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import PushToken from '@/models/PushToken';
import { getFirebaseAdmin } from '@/lib/firebase';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const title = formData.get('title') || 'Notification';
    const message = formData.get('message');
    const image = formData.get('image');
    const selectedTokens = formData.get('selected_tokens');
    const sendToAll = formData.get('send_to_all') === 'true';

    // Validation
    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Initialize Firebase
    let admin;
    try {
      admin = getFirebaseAdmin();
    } catch (error) {
      return NextResponse.json(
        { error: 'Firebase not configured. Please set FIREBASE_SERVICE_ACCOUNT environment variable.' },
        { status: 500 }
      );
    }

    // Get push tokens
    let tokens = [];
    if (sendToAll) {
      const allTokens = await PushToken.find({ isActive: true }).select('token deviceType').lean();
      tokens = allTokens.map(t => t.token);
    } else if (selectedTokens) {
      tokens = selectedTokens.split(',').filter(Boolean);
    } else {
      return NextResponse.json(
        { error: 'Please select recipients or choose send to all' },
        { status: 400 }
      );
    }

    if (tokens.length === 0) {
      return NextResponse.json(
        { error: 'No active push tokens found' },
        { status: 400 }
      );
    }

    // Read image if provided
    let imageUrl = null;
    if (image && image.size > 0) {
      // For production, upload image to Firebase Storage or CDN
      // For now, we'll use data URL or skip image
      // You should implement image upload to Firebase Storage
      imageUrl = null; // Set to Firebase Storage URL after upload
    }

    // Prepare notification payload
    const notification = {
      title: title,
      body: message.trim(),
    };

    // Prepare message payload
    const messagePayload = {
      notification,
      data: {
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        sound: 'default',
      },
    };

    // Add image if available
    if (imageUrl) {
      messagePayload.notification.imageUrl = imageUrl;
    }

    // Send to multiple tokens (batch send)
    const results = [];
    const batchSize = 500; // FCM allows up to 500 tokens per batch

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      
      try {
        const response = await admin.messaging().sendEachForMulticast({
          tokens: batch,
          notification: messagePayload.notification,
          data: messagePayload.data,
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              channelId: 'default',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              },
            },
          },
          webpush: {
            notification: {
              ...messagePayload.notification,
              icon: '/icon-192x192.png', // Add your icon path
              badge: '/badge-72x72.png', // Add your badge path
            },
          },
        });

        // Process results
        response.responses.forEach((result, index) => {
          const token = batch[index];
          if (result.success) {
            results.push({
              token,
              status: 'success',
              messageId: result.messageId,
            });
          } else {
            results.push({
              token,
              status: 'error',
              error: result.error?.message || 'Unknown error',
            });
          }
        });
      } catch (error) {
        // If batch fails, mark all as error
        batch.forEach(token => {
          results.push({
            token,
            status: 'error',
            error: error.message || 'Batch send failed',
          });
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      success: true,
      message: `Push notification sent to ${successCount} device(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
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

