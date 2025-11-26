import { NextResponse } from 'next/server';
import { Client } from 'onesignal-node';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const title = formData.get('title') || 'Notification';
    const message = formData.get('message');
    const image = formData.get('image');
    const sendToAll = formData.get('send_to_all') === 'true';
    const segment = formData.get('segment'); // e.g., 'All', 'Active Users', etc.
    const userIds = formData.get('user_ids'); // Comma-separated user IDs
    const externalIds = formData.get('external_ids'); // Comma-separated external IDs

    // Validation
    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get OneSignal credentials from environment
    const appId = process.env.ONESIGNAL_APP_ID;
    const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!appId || !restApiKey) {
      return NextResponse.json(
        { error: 'OneSignal not configured. Please set ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY environment variables.' },
        { status: 500 }
      );
    }

    // Initialize OneSignal client
    const client = new Client(appId, restApiKey);

    // Read image if provided
    let imageUrl = null;
    if (image && image.size > 0) {
      // For production, upload image to a CDN or storage service
      // For now, we'll skip image or you can upload to Firebase Storage/Cloudinary
      // imageUrl = await uploadImageToCDN(image);
      imageUrl = null; // Set to your CDN URL after upload
    }

    // Prepare notification payload
    const notification = {
      headings: { en: title },
      contents: { en: message.trim() },
      included_segments: sendToAll ? ['All'] : undefined,
      filters: [],
    };

    // Add image if available
    if (imageUrl) {
      notification.big_picture = imageUrl;
      notification.large_icon = imageUrl;
    }

    // Target specific users if provided
    if (!sendToAll) {
      if (userIds) {
        const userIdArray = userIds.split(',').filter(Boolean);
        notification.include_player_ids = userIdArray;
      } else if (externalIds) {
        const externalIdArray = externalIds.split(',').filter(Boolean);
        notification.filters = externalIdArray.map(id => ({
          field: 'tag',
          key: 'user_id',
          relation: '=',
          value: id,
        }));
      } else if (segment) {
        notification.included_segments = [segment];
      } else {
        // Default to all if nothing specified
        notification.included_segments = ['All'];
      }
    }

    // Platform-specific settings
    notification.android_channel_id = 'default';
    notification.small_icon = 'ic_notification';
    notification.large_icon = imageUrl || undefined;

    // Send notification
    try {
      const response = await client.createNotification(notification);

      return NextResponse.json({
        success: true,
        message: 'Push notification sent successfully!',
        data: {
          id: response.body.id,
          recipients: response.body.recipients,
          errors: response.body.errors,
        },
        recipients: response.body.recipients || 0,
      });
    } catch (error) {
      console.error('OneSignal API error:', error);
      return NextResponse.json(
        { error: 'Failed to send push notification', details: error.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
    return NextResponse.json(
      { error: 'Failed to send push notification', details: error.message },
      { status: 500 }
    );
  }
}

