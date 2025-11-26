import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import PushToken from '@/models/PushToken';
import { getFirebaseAdmin } from '@/lib/firebase';

export async function POST(request) {
  try {
    const body = await request.json();
    const { token, deviceType, deviceInfo, userId } = body;

    // Validation
    if (!token) {
      return NextResponse.json(
        { error: 'Push token is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if token already exists
    let pushToken = await PushToken.findOne({ token });

    if (pushToken) {
      // Update existing token
      pushToken.deviceType = deviceType || pushToken.deviceType;
      pushToken.deviceInfo = deviceInfo || pushToken.deviceInfo;
      pushToken.userId = userId || pushToken.userId;
      pushToken.isActive = true;
      await pushToken.save();
    } else {
      // Create new token
      pushToken = await PushToken.create({
        token,
        deviceType: deviceType || 'web',
        deviceInfo,
        userId: userId || null,
        isActive: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Push token registered successfully',
      tokenId: pushToken._id,
    });
  } catch (error) {
    console.error('Error registering push token:', error);
    return NextResponse.json(
      { error: 'Failed to register push token', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Push token is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const pushToken = await PushToken.findOneAndUpdate(
      { token },
      { isActive: false },
      { new: true }
    );

    if (!pushToken) {
      return NextResponse.json(
        { error: 'Push token not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Push token unregistered successfully',
    });
  } catch (error) {
    console.error('Error unregistering push token:', error);
    return NextResponse.json(
      { error: 'Failed to unregister push token', details: error.message },
      { status: 500 }
    );
  }
}

